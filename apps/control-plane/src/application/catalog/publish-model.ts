import type {CatalogModel,ModelCapability} from "../../domain/catalog/model-router.js";
import type {Classification} from "../../domain/tenancy/workspace.js";
export type PublishModelCommand=Readonly<{
 modelKey:string;providerKey:string;catalogVersion:number;priceVersion:number;capabilities:readonly ModelCapability[];maximumClassification:Classification;
 contextWindowTokens:number;maximumOutputTokens:number;currency:string;inputMinorPerMillionTokens:number;outputMinorPerMillionTokens:number;
 routePriority:number;fallbackModelKeys:readonly string[];owner:string;justification:string;actorId:string;requestId:string;
}>;
function validGraph(modelKey:string,fallbacks:readonly string[],graph:ReadonlyMap<string,readonly string[]>):boolean{
 if(fallbacks.length>3||new Set(fallbacks).size!==fallbacks.length||fallbacks.includes(modelKey))return false;
 const visiting=new Set<string>();const visit=(key:string,depth:number):boolean=>{if(depth>3||visiting.has(key)||(key!==modelKey&&!graph.has(key)))return false;visiting.add(key);for(const next of (key===modelKey?fallbacks:graph.get(key)??[])){if(!visit(next,depth+1))return false;}visiting.delete(key);return true;};return visit(modelKey,0);
}
export async function publishModel(dependencies:Readonly<{
 credential:{isActive(providerKey:string):Promise<boolean>};catalog:{isProviderActive(providerKey:string):Promise<boolean>;loadFallbackGraph():Promise<ReadonlyMap<string,readonly string[]>>;publish(model:CatalogModel&Readonly<{owner:string;justification:string;actorId:string;requestId:string}>):Promise<void>};
}>,command:PublishModelCommand):Promise<void>{
 if(!await dependencies.catalog.isProviderActive(command.providerKey))throw new Error("PROVIDER_NOT_ACTIVE");
 if(!await dependencies.credential.isActive(command.providerKey))throw new Error("PROVIDER_CREDENTIAL_UNAVAILABLE");
 const graph=await dependencies.catalog.loadFallbackGraph();if(!validGraph(command.modelKey,command.fallbackModelKeys,graph))throw new Error("FALLBACK_INVALID");
 await dependencies.catalog.publish({...command,version:command.catalogVersion,state:"ACTIVE",providerState:"ACTIVE",status:"ACTIVE"} as CatalogModel&Readonly<{owner:string;justification:string;actorId:string;requestId:string}>);
}

export async function publishProvider(dependencies:Readonly<{
 credential:{isActive(providerKey:string):Promise<boolean>};catalog:{publishProvider(input:Readonly<{providerKey:string;version:number;status:"ACTIVE";maximumClassification:Classification;owner:string;justification:string;actorId:string;requestId:string}>):Promise<void>};
}>,command:Readonly<{providerKey:string;version:number;maximumClassification:Classification;owner:string;justification:string;actorId:string;requestId:string}>):Promise<void>{
 if(!await dependencies.credential.isActive(command.providerKey))throw new Error("PROVIDER_CREDENTIAL_UNAVAILABLE");
 await dependencies.catalog.publishProvider({...command,status:"ACTIVE"});
}
