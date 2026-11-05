import {createHash} from 'node:crypto';
import {createServer,type Server} from 'node:http';
import {once} from 'node:events';
import {z} from 'zod';
import {boundedBody} from '../../lib/body';
import {FactSchema} from '../../lib/engine';
import type {Workspace} from '../../lib/db';
import {prepareRewriteSource,RewriteFactIds,RewriteLanguage} from '../../lib/ai-rewrite';
import {proposeRewrite,rewriteConfig,REWRITE_SYSTEM_PROMPT} from '../../lib/ai-rewrite-provider';
export const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
export const RewriteCorpus=z.strictObject({format:z.literal('jobmatch-rewrite-corpus-v1'),provenance:z.literal('authored-synthetic-before-model'),cases:z.array(z.strictObject({id:z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),requestedLanguage:RewriteLanguage,original:z.string().min(1).max(10000),facts:z.array(FactSchema).min(1).max(12),vacancy:z.string().min(1).max(2000),factIds:RewriteFactIds,reviewNotes:z.array(z.string().min(1).max(500)).min(1).max(4)})).length(6)}).refine(c=>new Set(c.cases.map(x=>x.id)).size===c.cases.length);
export type RewriteCase=z.infer<typeof RewriteCorpus>['cases'][number];
export type Payload={model:string;stream:false;messages:{role:string;content:string}[];format:unknown;options:{temperature:0;num_predict:4096}};
export type Backend=(payload:Payload,signal:AbortSignal)=>Promise<Response>;
export const ALIAS='jobmatch-qwen2.5-0.5b-q8-diagnostic';
export const RUNTIME={context:8192,threads:4,maxTokens:4096,seed:42} as const;
export function approved(env:Record<string,string|undefined>){return env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.JOBMATCH_AI_CPU_DIAGNOSTIC==='true'&&env.JOBMATCH_AI_REWRITE_CPU_DIAGNOSTIC==='true'&&env.GITHUB_REPOSITORY==='kredavto/JobMatch-AI'&&env.JOBMATCH_REPOSITORY_VISIBILITY==='public';}
const envelope=z.object({choices:z.tuple([z.object({message:z.object({role:z.literal('assistant'),content:z.string().min(1).max(120000)}),finish_reason:z.enum(['stop','length'])})]),usage:z.object({prompt_tokens:z.number().int().positive().max(RUNTIME.context),completion_tokens:z.number().int().positive().max(RUNTIME.maxTokens)})});
const FIXTURE_KEY='43'.repeat(32),FIXTURE_TOKEN='rewrite-owned-synthetic-diagnostic-only';
const KEYS=['NODE_ENV','JOBMATCH_AI_REWRITE_ENABLED','JOBMATCH_AI_ENABLED','JOBMATCH_AI_SELF_HOSTED','JOBMATCH_AI_ENDPOINT','JOBMATCH_AI_MODEL','JOBMATCH_AI_TOKEN','JOBMATCH_LETTER_SIGNING_SECRET'] as const;
/** One real production HTTP request through an explicitly labelled local envelope adapter.
 * The callback sees actual captured provider bytes, never review notes or a gold answer. */
export async function evaluateCase(test:RewriteCase,backend:Backend,signal:AbortSignal){
 const workspace={ownerId:'11111111-1111-4111-8111-111111111111',revision:1,original:test.original,facts:test.facts,vacancy:test.vacancy,goal:'',versions:[],applications:[]} as Workspace;
 const source=await prepareRewriteSource(workspace,workspace.ownerId!,test.factIds),previous=Object.fromEntries(KEYS.map(k=>[k,process.env[k]]));
 let server:Server|undefined,calls=0,backendRequests=0,payloadSha256:string|null=null,rawSyntheticReply:string|null=null,rawBackendEnvelope:string|null=null,backendStatus:number|null=null,tokens=0,promptTokens=0,finish:string|null=null,backendResponse=false,stage='local-source';
 const transport=new AbortController();const stop=()=>transport.abort();signal.addEventListener('abort',stop,{once:true});if(signal.aborted)stop();
 try{
  server=createServer(async(req,res)=>{
   try{
    if(req.url!=='/api/chat'||req.method!=='POST'||req.headers.authorization!=='Bearer '+FIXTURE_TOKEN||++calls!==1)throw Error('GATEWAY_REQUEST');
    const chunks:Buffer[]=[];let size=0;for await(const part of req){const b=Buffer.from(part);size+=b.length;if(size>64000)throw Error('GATEWAY_LIMIT');chunks.push(b);}
    const bytes=Buffer.concat(chunks),payload=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(bytes)) as Payload;
    const input={language:test.requestedLanguage,vacancy:source.vacancy,facts:source.facts.map(({id,text})=>({fact_id:id,text}))};
    if(payload.model!==ALIAS||payload.stream!==false||payload.messages.length!==2||payload.messages[0].role!=='system'||payload.messages[0].content!==REWRITE_SYSTEM_PROMPT||payload.messages[1].role!=='user'||payload.messages[1].content!==JSON.stringify(input)||payload.options.temperature!==0||payload.options.num_predict!==4096)throw Error('PRODUCTION_WIRE');
    payloadSha256=hash(bytes);stage='backend-http';backendRequests++;
    req.once('aborted',stop);res.once('close',()=>{if(!res.writableFinished)stop();});
    const response=await backend(payload,transport.signal);backendStatus=response.status;
    const body=await boundedBody({headers:response.headers,body:response.body,signal:transport.signal},128000,15000);
    rawBackendEnvelope=new TextDecoder('utf8',{fatal:true}).decode(body);stage='backend-envelope';
    if(response.status!==200||response.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw Error('BACKEND_HTTP');
    const parsed=envelope.parse(JSON.parse(rawBackendEnvelope)),choice=parsed.choices[0];rawSyntheticReply=choice.message.content;tokens=parsed.usage.completion_tokens;promptTokens=parsed.usage.prompt_tokens;finish=choice.finish_reason;backendResponse=true;stage='production-contract';
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({done:true,done_reason:finish,message:choice.message}));
   }catch{if(!res.destroyed){res.writeHead(502,{'Content-Type':'application/json'});res.end('{"error":"owned diagnostic adapter refused"}');}}
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error('BIND');
  Object.assign(process.env,{NODE_ENV:'test',JOBMATCH_AI_REWRITE_ENABLED:'true',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:'+address.port+'/api/chat',JOBMATCH_AI_MODEL:ALIAS,JOBMATCH_AI_TOKEN:FIXTURE_TOKEN,JOBMATCH_LETTER_SIGNING_SECRET:FIXTURE_KEY});
  const preview=await proposeRewrite(source,test.original,test.requestedLanguage,signal,rewriteConfig());
  stage='contract-valid';
  return{...snapshot(),status:'contract-valid',preview,semanticAssessment:'not-performed',independentHeldOut:'not-performed',acceptance:'not-accepted'};
 }catch{return{...snapshot(),status:'refused',preview:null,semanticAssessment:'not-performed',independentHeldOut:'not-performed',acceptance:'not-accepted'};}
 finally{
  transport.abort();signal.removeEventListener('abort',stop);
  if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}
  for(const key of KEYS){const value=previous[key];if(value===undefined)Reflect.deleteProperty(process.env,key);else Object.assign(process.env,{[key]:value});}
 }
 function snapshot(){return{id:test.id,requestedLanguage:test.requestedLanguage,reviewNotes:test.reviewNotes,stage,payloadSha256,calls,backendRequests,backendStatus,backendResponse,tokens,promptTokens,finish,rawSyntheticReply,rawBackendEnvelope};}
}
