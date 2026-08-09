export type SemanticState = 'fundamentada' | 'parcial' | 'conflitante' | 'inferida' | 'sem-evidencia' | 'obsoleta' | 'bloqueada' | 'inconclusiva';
export type ChatStreamEvent = Readonly<{schema_version:'1.0.0';request_id:string;sequence:number;type:'started'|'delta'|'completed'|'cancelled'|'failed';occurred_at:string;text?:string;code?:string;semantic_state?:SemanticState;citation_refs?:readonly string[]}>;

const terminal = new Set(['completed','cancelled','failed']);
function fail(code:string):never{throw new Error(code);}
function validate(value:unknown):ChatStreamEvent{
 if(!value||typeof value!=='object'||Array.isArray(value))fail('CHAT_STREAM_SCHEMA_INVALID');
 const event=value as Record<string,unknown>;
 const allowed=new Set(['schema_version','request_id','sequence','type','occurred_at','text','code','semantic_state','citation_refs','receipt_id','actual_minor','retry_after_seconds']);
 if(Object.keys(event).some(key=>!allowed.has(key))||event.schema_version!=='1.0.0'||typeof event.request_id!=='string'||!Number.isSafeInteger(event.sequence)||typeof event.type!=='string'||!['started','delta','completed','cancelled','failed'].includes(event.type)||typeof event.occurred_at!=='string')fail('CHAT_STREAM_SCHEMA_INVALID');
 if(event.type==='delta'&&typeof event.text!=='string')fail('CHAT_STREAM_SCHEMA_INVALID');
 if(event.type==='completed'&&(event.semantic_state!=='inferida'&&event.semantic_state!=='fundamentada'&&event.semantic_state!=='parcial'&&event.semantic_state!=='conflitante'&&event.semantic_state!=='sem-evidencia'&&event.semantic_state!=='obsoleta'&&event.semantic_state!=='bloqueada'&&event.semantic_state!=='inconclusiva'))fail('CHAT_STREAM_SCHEMA_INVALID');
 if(event.citation_refs!==undefined&&(!Array.isArray(event.citation_refs)||event.citation_refs.length>100||event.citation_refs.some(value=>typeof value!=='string'||value.length<1||value.length>128)))fail('CHAT_STREAM_SCHEMA_INVALID');
 return event as ChatStreamEvent;
}

export function createSseParser(options:Readonly<{maximumEventBytes?:number}>={}){
 const decoder=new TextDecoder('utf-8',{fatal:true}),maximum=options.maximumEventBytes??1_048_576;let buffer='',nextSequence=0,requestId:string|undefined,ended=false;
 return Object.freeze({push(chunk:Uint8Array){if(ended)fail('CHAT_STREAM_AFTER_TERMINAL');let decoded:string;try{decoded=decoder.decode(chunk,{stream:true});}catch{fail('CHAT_STREAM_UTF8_INVALID');}buffer+=decoded;if(Buffer.byteLength(buffer,'utf8')>maximum&&!buffer.includes('\n\n'))fail('CHAT_STREAM_EVENT_TOO_LARGE');const events:ChatStreamEvent[]=[];while(true){const boundary=buffer.indexOf('\n\n');if(boundary<0)break;const frame=buffer.slice(0,boundary).replace(/\r/g,'');buffer=buffer.slice(boundary+2);if(Buffer.byteLength(frame,'utf8')>maximum)fail('CHAT_STREAM_EVENT_TOO_LARGE');if(!frame||frame.startsWith(':'))continue;let id:string|undefined,name:string|undefined;const data:string[]=[];for(const line of frame.split('\n')){const split=line.indexOf(':');const field=split<0?line:line.slice(0,split),raw=split<0?'':line.slice(split+1).replace(/^ /,'');if(field==='id')id=raw;else if(field==='event')name=raw;else if(field==='data')data.push(raw);}let parsed:unknown;try{parsed=JSON.parse(data.join('\n'));}catch{fail('CHAT_STREAM_JSON_INVALID');}const event=validate(parsed);if(id!==String(event.sequence)||name!==event.type||event.sequence!==nextSequence)fail('CHAT_STREAM_SEQUENCE_INVALID');if(requestId&&requestId!==event.request_id)fail('CHAT_STREAM_REQUEST_MISMATCH');requestId=event.request_id;nextSequence++;events.push(event);if(terminal.has(event.type))ended=true;}return Object.freeze(events);}});
}
