import type {Classification} from "../tenancy/workspace.js";

export type SourceStatus="DRAFT"|"PENDING_OWNER"|"PENDING_REVIEW"|"ACTIVE"|"PAUSED"|"DISCONNECTED"|"ARCHIVED";
export type SourceSchedule=Readonly<{mode:"MANUAL"}|{mode:"SCHEDULED";intervalSeconds:number}>;
export type OwnerAcceptance="PENDING"|"ACCEPTED";
export type SourceRegistryEntry=Readonly<{
 sourceId:string;tenantId:string;workspaceId:string;name:string;purpose:string;sourceType:string;originSystemKey:string;connectorKey:string;
 ownerUserId?:string;ownerAcceptance:OwnerAcceptance;classification?:Classification;schedule:SourceSchedule;freshnessSlaSeconds:number;retentionDays:number;
 status:SourceStatus;statusReason?:string;version:number;createdAt:string;updatedAt:string;
}>;

const KEY=/^[a-z][a-z0-9._-]{0,63}$/;
const CLASSIFICATIONS=new Set(["public","internal","confidential","restricted"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function sized(value:string,min:number,max:number):boolean{return value.trim().length>=min&&value.trim().length<=max;}

export type CreateSourceInput=Omit<SourceRegistryEntry,"ownerAcceptance"|"status"|"version"|"createdAt"|"updatedAt">;
export function createSource(input:CreateSourceInput,now:string):SourceRegistryEntry{
 if(!input.schedule||!(["MANUAL","SCHEDULED"] as readonly string[]).includes(input.schedule.mode)||!uuid.test(input.sourceId)||!uuid.test(input.tenantId)||!uuid.test(input.workspaceId)||!sized(input.name,1,160)||!sized(input.purpose,1,1000)||
  !KEY.test(input.sourceType)||!KEY.test(input.originSystemKey)||!KEY.test(input.connectorKey)||
  (input.ownerUserId!==undefined&&!uuid.test(input.ownerUserId))||(input.classification!==undefined&&!CLASSIFICATIONS.has(input.classification))||
  input.freshnessSlaSeconds<300||input.freshnessSlaSeconds>31_536_000||input.retentionDays<1||input.retentionDays>3650||
  (input.schedule.mode==="SCHEDULED"&&(input.schedule.intervalSeconds<300||input.schedule.intervalSeconds>2_592_000)))throw new Error("SOURCE_INVALID");
 return Object.freeze({...input,name:input.name.trim(),purpose:input.purpose.trim(),ownerAcceptance:"PENDING",status:"DRAFT",version:1,createdAt:now,updatedAt:now});
}

export function submitSource(source:SourceRegistryEntry,now:string):SourceRegistryEntry{
 if(source.status!=="DRAFT"&&source.status!=="PENDING_OWNER"&&source.status!=="PENDING_REVIEW")throw new Error("SOURCE_TRANSITION_DENIED");
 const status:SourceStatus=!source.ownerUserId?"PENDING_OWNER":!source.classification?"PENDING_REVIEW":"PENDING_REVIEW";
 return change(source,status,now);
}
export function acceptSourceOwnership(source:SourceRegistryEntry,actorId:string,now:string):SourceRegistryEntry{
 if(source.status!=="PENDING_REVIEW"||source.ownerUserId!==actorId)throw new Error("SOURCE_OWNER_DENIED");
 return Object.freeze({...source,ownerAcceptance:"ACCEPTED",version:source.version+1,updatedAt:now});
}
export function activateSource(source:SourceRegistryEntry,now:string):SourceRegistryEntry{
 if(source.status!=="PENDING_REVIEW"||!source.ownerUserId||!source.classification||source.ownerAcceptance!=="ACCEPTED")throw new Error("SOURCE_NOT_READY");
 return change(source,"ACTIVE",now);
}
export function changeSourceState(source:SourceRegistryEntry,status:"PAUSED"|"DISCONNECTED"|"ARCHIVED",reason:string,now:string):SourceRegistryEntry{
 if(!sized(reason,1,500)||source.status==="ARCHIVED"||(status!=="ARCHIVED"&&source.status!=="ACTIVE"))throw new Error("SOURCE_TRANSITION_DENIED");
 return change(source,status,now,reason.trim());
}
export function ingestionEligible(source:SourceRegistryEntry):boolean{return source.status==="ACTIVE"&&source.ownerAcceptance==="ACCEPTED"&&Boolean(source.ownerUserId&&source.classification);}
function change(source:SourceRegistryEntry,status:SourceStatus,now:string,statusReason?:string):SourceRegistryEntry{return Object.freeze({...source,status,...(statusReason?{statusReason}:{}),version:source.version+1,updatedAt:now});}
