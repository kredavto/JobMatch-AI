// Server-only opt-in diagnostics. Never log request/response objects or raw provider content.
const TYPES=new Set(['oauth','forbidden','captcha_required','bad_argument','not_found','too_many_requests','server_error']);
const VALUES=new Set(['no_scope','bad_authorization','token_expired','token_revoked','forbidden','captcha_required','not_found','too_many_requests']);
const CONTENT_TYPES=new Set(['application/json','application/problem+json','text/html','text/plain']);
const REDACTED='[redacted]';
export function hhOperation(path:string){
 if(path==='/me')return 'account_check';
 if(/^\/resumes\/mine(?:\?|$)/.test(path))return 'resume_list';
 if(path.startsWith('/resumes/'))return 'resume_read';
 if(path.startsWith('/vacancies/'))return 'vacancy_read';
 if(path==='/token')return 'token_exchange';
 return 'unknown';
}
export function logHHRefusal(response:Response,path:string,raw:unknown,secrets:readonly string[]){
 if(process.env.JOBMATCH_HH_DIAGNOSTICS_ENABLED!=='true')return;
 const record=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
 const secret=(value:string)=>secrets.some(item=>item.length>0&&value.includes(item));
 const enumValue=(value:unknown,allow:Set<string>)=>typeof value==='string'&&allow.has(value)&&!secret(value)?value:REDACTED;
 const candidate=record.request_id??response.headers.get('x-request-id');
 // Accept only fixed-length hex correlation identifiers, never arbitrary provider strings.
 const requestId=typeof candidate==='string'&&/^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(candidate)&&!secret(candidate)?candidate:REDACTED;
 const mime=(response.headers.get('content-type')??'').split(';',1)[0].trim().toLowerCase();
 const errors=Array.isArray(record.errors)?record.errors.slice(0,20).map(item=>{
  const entry=item&&typeof item==='object'?item as Record<string,unknown>:{};
  return {type:enumValue(entry.type,TYPES),value:enumValue(entry.value,VALUES)};
 }):[];
 const diagnostic={event:'hh_upstream_refusal',status:response.status,content_type:CONTENT_TYPES.has(mime)&&!secret(mime)?mime:REDACTED,request_id:requestId,errors,time_utc:new Date().toISOString(),operation:hhOperation(path)};
 try{console.warn(JSON.stringify(diagnostic));}catch{/* Logging must not change request handling. */}
}
