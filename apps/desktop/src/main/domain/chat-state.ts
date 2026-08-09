import type {ChatStreamEvent,SemanticState} from './chat-stream.js';
export type ChatPhase='IDLE'|'SUBMITTING'|'STREAMING'|'COMPLETED'|'CANCELLED'|'FAILED'|'INCONCLUSIVE';
export type ChatState=Readonly<{phase:ChatPhase;text:string;semanticState?:SemanticState;citationRefs:readonly string[];technicalCode?:string}>;
export function initialChatState():ChatState{return Object.freeze({phase:'IDLE',text:'',citationRefs:[]});}
export function reduceChatEvent(state:ChatState,event:ChatStreamEvent|Readonly<{type:'transport_interrupted'}>):ChatState{
 if(event.type==='transport_interrupted')return Object.freeze({...state,phase:'INCONCLUSIVE',semanticState:'inconclusiva'});
 if(['COMPLETED','CANCELLED','FAILED','INCONCLUSIVE'].includes(state.phase))throw new Error('CHAT_EVENT_AFTER_TERMINAL');
 if(event.type==='started')return Object.freeze({...state,phase:'STREAMING'});
 if(event.type==='delta')return Object.freeze({...state,phase:'STREAMING',text:state.text+(event.text??'')});
 if(event.type==='completed')return Object.freeze({...state,phase:'COMPLETED',semanticState:event.semantic_state,citationRefs:Object.freeze([...(event.citation_refs??[])])});
 if(event.type==='cancelled')return Object.freeze({...state,phase:'CANCELLED'});
 return Object.freeze({...state,phase:'FAILED',technicalCode:event.code});
}
