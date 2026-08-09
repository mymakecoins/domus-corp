import {acceptSourceOwnership,activateSource,changeSourceState,createSource,submitSource,type CreateSourceInput,type SourceRegistryEntry,type SourceStatus} from "../../domain/source/source-registry.js";
import type {Classification} from "../../domain/tenancy/workspace.js";

export type SourceActor=Readonly<{tenantId:string;workspaceId:string;userId:string;deviceId:string;sessionId:string;requestId:string;role:"owner"|"manager"|"admin"}>;
export type SourceRepository=Readonly<{
 create(source:SourceRegistryEntry,meta:MutationMeta):Promise<void>;load(actor:SourceActor,sourceId:string):Promise<SourceRegistryEntry|undefined>;
 save(source:SourceRegistryEntry,expectedVersion:number,meta:MutationMeta):Promise<void>;list(actor:SourceActor,cursor?:string,limit?:number):Promise<readonly SourceRegistryEntry[]>;
 ownerIsEligible(actor:SourceActor,ownerUserId:string,classification:Classification):Promise<boolean>;
}>;
type MutationMeta=Readonly<{actorId:string;requestId:string;eventType:string;reason?:string}>;
export type CreateSourceCommand=SourceActor&CreateSourceInput;

export function sourceService(repository:SourceRepository,clock:()=>string=()=>new Date().toISOString()){
 const permitted=(actor:SourceActor)=>{if(!["owner","manager","admin"].includes(actor.role))throw new Error("SOURCE_ACCESS_DENIED");};
 const mutate=async(actor:SourceActor,sourceId:string,expectedVersion:number,eventType:string,fn:(source:SourceRegistryEntry)=>Promise<SourceRegistryEntry>|SourceRegistryEntry,reason?:string)=>{
  permitted(actor);const source=await repository.load(actor,sourceId);if(!source)throw new Error("SOURCE_NOT_FOUND");if(source.version!==expectedVersion)throw new Error("SOURCE_VERSION_CONFLICT");
  const next=await fn(source);await repository.save(next,expectedVersion,{actorId:actor.userId,requestId:actor.requestId,eventType,reason});return next;
 };
 return {
  async create(command:CreateSourceCommand){permitted(command);if(command.classification&&command.ownerUserId&&!await repository.ownerIsEligible(command,command.ownerUserId,command.classification))throw new Error("SOURCE_OWNER_INELIGIBLE");const source=createSource({sourceId:command.sourceId,tenantId:command.tenantId,workspaceId:command.workspaceId,name:command.name,purpose:command.purpose,sourceType:command.sourceType,originSystemKey:command.originSystemKey,connectorKey:command.connectorKey,...(command.ownerUserId?{ownerUserId:command.ownerUserId}:{}),...(command.classification?{classification:command.classification}:{}),schedule:command.schedule,freshnessSlaSeconds:command.freshnessSlaSeconds,retentionDays:command.retentionDays},clock());await repository.create(source,{actorId:command.userId,requestId:command.requestId,eventType:"source.created.v1"});return source;},
  list:(actor:SourceActor,cursor?:string,limit=25)=>{permitted(actor);if(limit<1||limit>100)throw new Error("SOURCE_INVALID");return repository.list(actor,cursor,limit);},
  get:async(actor:SourceActor,id:string)=>{permitted(actor);const found=await repository.load(actor,id);if(!found)throw new Error("SOURCE_NOT_FOUND");return found;},
  submit:(actor:SourceActor,id:string,version:number)=>mutate(actor,id,version,"source.submitted.v1",source=>submitSource(source,clock())),
  accept:(actor:SourceActor,id:string,version:number)=>mutate(actor,id,version,"source.owner_accepted.v1",async source=>{if(!source.ownerUserId||!source.classification||!await repository.ownerIsEligible(actor,source.ownerUserId,source.classification))throw new Error("SOURCE_OWNER_INELIGIBLE");return acceptSourceOwnership(source,actor.userId,clock());}),
  activate:(actor:SourceActor,id:string,version:number)=>mutate(actor,id,version,"source.activated.v1",async source=>{if(!source.ownerUserId||!source.classification||!await repository.ownerIsEligible(actor,source.ownerUserId,source.classification))throw new Error("SOURCE_OWNER_INELIGIBLE");return activateSource(source,clock());}),
  transition:(actor:SourceActor,id:string,version:number,status:Extract<SourceStatus,"PAUSED"|"DISCONNECTED"|"ARCHIVED">,reason:string)=>mutate(actor,id,version,`source.${status.toLowerCase()}.v1`,source=>changeSourceState(source,status,reason,clock()),reason),
 };
}
