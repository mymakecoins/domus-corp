import type {Classification} from "../tenancy/workspace.js";

export type ModelCapability="CHAT"|"EMBEDDINGS"|"VISION"|"TOOL_USE"|"STRUCTURED_OUTPUT"|"STREAMING";
export type CatalogModel=Readonly<{
  modelKey:string;providerKey:string;catalogVersion:number;priceVersion:number;
  state:"DRAFT"|"ACTIVE"|"DEPRECATED"|"DISABLED";providerState:"DRAFT"|"ACTIVE"|"DEPRECATED"|"DISABLED";
  capabilities:readonly ModelCapability[];maximumClassification:Classification;
  contextWindowTokens:number;maximumOutputTokens:number;currency:string;
  inputMinorPerMillionTokens:number;outputMinorPerMillionTokens:number;
  routePriority:number;fallbackModelKeys:readonly string[];
}>;
export type RouteRequest=Readonly<{
  requestId:string;tenantId:string;workspaceId:string;policyVersion:string;classification:Classification;
  allowedClassifications:readonly Classification[];allowedModels:readonly string[];requiredCapabilities:readonly ModelCapability[];
  inputTokens:number;maximumOutputTokens:number;budget:Readonly<{currency:string;maximumCostMinor:number}>;
}>;
export type ModelRouteDecision=Readonly<{
  decision:"ALLOW"|"DENY";denyReasons:readonly string[];requestId:string;tenantId:string;workspaceId:string;policyVersion:string;
  modelKey?:string;providerKey?:string;catalogVersion?:number;priceVersion?:number;currency?:string;maximumEstimatedCostMinor?:number;
  fallbackChain:readonly string[];
}>;

const rank:Readonly<Record<Classification,number>>={public:0,internal:1,confidential:2,restricted:3};
const validInteger=(value:number)=>Number.isSafeInteger(value)&&value>=0;

export function estimateMaximumCost(model:CatalogModel,inputTokens:number,outputTokens:number):number{
  if(!validInteger(inputTokens)||!validInteger(outputTokens)||!validInteger(model.inputMinorPerMillionTokens)||!validInteger(model.outputMinorPerMillionTokens))throw new Error("ROUTING_COST_INVALID");
  const numerator=BigInt(inputTokens)*BigInt(model.inputMinorPerMillionTokens)+BigInt(outputTokens)*BigInt(model.outputMinorPerMillionTokens);
  const result=(numerator+999999n)/1000000n;
  if(result>BigInt(Number.MAX_SAFE_INTEGER))throw new Error("ROUTING_COST_INVALID");
  return Number(result);
}

function denied(request:RouteRequest,reasons:readonly string[],chain:readonly string[]=[]):ModelRouteDecision{return Object.freeze({decision:"DENY",denyReasons:Object.freeze([...new Set(reasons)]),requestId:request.requestId,tenantId:request.tenantId,workspaceId:request.workspaceId,policyVersion:request.policyVersion,fallbackChain:Object.freeze([...chain])});}

async function eligible(dependencies:{credential:{isActive(providerKey:string):Promise<boolean>};health:{isEligible(providerKey:string,modelKey:string):Promise<boolean>}},request:RouteRequest,model:CatalogModel):Promise<{ok:boolean;cost:number}>{
  if(model.state!=="ACTIVE"||model.providerState!=="ACTIVE"||!request.allowedModels.includes(model.modelKey)||!request.allowedClassifications.includes(request.classification)||rank[request.classification]>rank[model.maximumClassification]||!request.requiredCapabilities.every(value=>model.capabilities.includes(value))||request.inputTokens+request.maximumOutputTokens>model.contextWindowTokens||request.maximumOutputTokens>model.maximumOutputTokens||model.currency!==request.budget.currency)return {ok:false,cost:0};
  const cost=estimateMaximumCost(model,request.inputTokens,request.maximumOutputTokens);
  if(cost>request.budget.maximumCostMinor)return {ok:false,cost};
  if(!await dependencies.credential.isActive(model.providerKey)||!await dependencies.health.isEligible(model.providerKey,model.modelKey))return {ok:false,cost};
  return {ok:true,cost};
}

export async function routeModel(dependencies:{credential:{isActive(providerKey:string):Promise<boolean>};health:{isEligible(providerKey:string,modelKey:string):Promise<boolean>}},request:RouteRequest,catalog:readonly CatalogModel[],preferredModelKey?:string):Promise<ModelRouteDecision>{
  if(!request.allowedModels.length)return denied(request,["MODEL_NOT_AUTHORIZED"]);
  try{
    if(preferredModelKey){
      const byKey=new Map(catalog.map(item=>[item.modelKey,item]));
      const graphValid=(key:string,path:ReadonlySet<string>,depth:number):boolean=>{const model=byKey.get(key);if(!model||depth>3||path.has(key))return false;const nextPath=new Set(path).add(key);return model.fallbackModelKeys.every(next=>graphValid(next,nextPath,depth+1));};
      if(!graphValid(preferredModelKey,new Set(),0))return denied(request,["FALLBACK_INVALID"],[preferredModelKey]);
      const select=async(key:string,chain:readonly string[]):Promise<{model:CatalogModel;cost:number;chain:readonly string[]}|undefined>=>{const model=byKey.get(key)!;const current=[...chain,key];const check=await eligible(dependencies,request,model);if(check.ok)return {model,cost:check.cost,chain:current};for(const next of model.fallbackModelKeys){const found=await select(next,current);if(found)return found;}return undefined;};
      const selected=await select(preferredModelKey,[]);if(!selected)return denied(request,["NO_ELIGIBLE_MODEL"],[preferredModelKey]);
      return Object.freeze({decision:"ALLOW",denyReasons:[],requestId:request.requestId,tenantId:request.tenantId,workspaceId:request.workspaceId,policyVersion:request.policyVersion,modelKey:selected.model.modelKey,providerKey:selected.model.providerKey,catalogVersion:selected.model.catalogVersion,priceVersion:selected.model.priceVersion,currency:selected.model.currency,maximumEstimatedCostMinor:selected.cost,fallbackChain:Object.freeze(selected.chain)});
    }
    const candidates:{model:CatalogModel;cost:number}[]=[];
    for(const model of catalog){const check=await eligible(dependencies,request,model);if(check.ok)candidates.push({model,cost:check.cost});}
    candidates.sort((a,b)=>a.model.routePriority-b.model.routePriority||a.cost-b.cost||a.model.modelKey.localeCompare(b.model.modelKey));
    const selected=candidates[0];if(!selected)return denied(request,["NO_ELIGIBLE_MODEL"]);
    return Object.freeze({decision:"ALLOW",denyReasons:[],requestId:request.requestId,tenantId:request.tenantId,workspaceId:request.workspaceId,policyVersion:request.policyVersion,modelKey:selected.model.modelKey,providerKey:selected.model.providerKey,catalogVersion:selected.model.catalogVersion,priceVersion:selected.model.priceVersion,currency:selected.model.currency,maximumEstimatedCostMinor:selected.cost,fallbackChain:[]});
  }catch{return denied(request,["ROUTING_DEPENDENCY_UNAVAILABLE"]);}
}
