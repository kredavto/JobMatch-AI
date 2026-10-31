import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {once} from 'node:events';
import {spawn,type ChildProcess} from 'node:child_process';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {z} from 'zod';
import {aiProfileBody,aiProfilePreview} from '../lib/ai-profile-provider';
import {AI_PROFILE_PROMPT,AI_PROFILE_PROMPT_VERSION,AI_PROFILE_VERSION} from '../lib/ai-profile';
import {AI_FAILURE_STAGES,type AiFailureStage} from '../lib/ai-diagnostics';
import {profileCorpus,PROFILE_CORPUS_VERSION,gradeProfile} from './profile-corpus';
import {approvedCpuEnvironment,cpuModelSlot,cpuModelIdentity,cpuServerArgs,validateCpuPin,cpuFileSha256,waitCpuReady,stopCpuProcess,CPU_LICENSE_SHA,type CpuModelSlot} from './cpu-diagnostic.cjs';
const MODEL='/model/model.gguf',BINARY='/opt/llama/build/bin/llama-server';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
function send(response:ServerResponse,status:number,value:unknown){if(!response.destroyed){response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify(value));}}
async function body(request:IncomingMessage){let size=0;const chunks:Buffer[]=[];for await(const chunk of request){size+=chunk.length;if(size>64000)throw Error();chunks.push(Buffer.from(chunk));}return new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks));}
/** Fixed synthetic request whitelist. No gold reads, arbitrary input, repair or retry. */
export async function createProfileCpuBridge(backend:string,slot:CpuModelSlot='baseline'){
 const alias=cpuModelIdentity(slot).modelAlias,url=new URL(backend);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('Loopback backend required');
 const remaining=new Map<string,number>();for(const test of profileCorpus){const input=aiProfileBody(test.source,alias);remaining.set(input,(remaining.get(input)??0)+1);}
 const stats={acceptedRequests:0,backendResponses:0,generatedTokens:0,stopped:0,limited:0,backendFailures:0,rejectedRequests:0};
 let busy=false;const active=new Set<AbortController>();
 const server=createServer(async(request,response)=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),19500);active.add(controller);response.once('close',()=>controller.abort());let locked=false;
  try{
   if(request.method!=='POST'||request.url!=='/api/chat'||busy)throw Error();const text=await body(request);
   if((remaining.get(text)??0)<1||busy)throw Error();const payload=JSON.parse(text);remaining.set(text,remaining.get(text)!-1);busy=true;locked=true;stats.acceptedRequests++;
   const result=await fetch(new URL('/v1/chat/completions',url),{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({model:alias,stream:false,messages:payload.messages,response_format:{type:'json_object',schema:payload.format},temperature:0,seed:42,max_tokens:2048})});
   if(!result.ok||!result.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error();
   const reader=result.body?.getReader();if(!reader)throw Error();let size=0;const chunks:Uint8Array[]=[];
   try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>64000)throw Error();chunks.push(item.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   const envelope=z.object({choices:z.tuple([z.object({message:z.object({role:z.literal('assistant'),content:z.string().max(60000)}),finish_reason:z.enum(['stop','length'])})]),usage:z.object({prompt_tokens:z.number().int().positive().max(4096),completion_tokens:z.number().int().positive().max(2056)})}).parse(JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks))));
   stats.backendResponses++;stats.generatedTokens+=envelope.usage.completion_tokens;const choice=envelope.choices[0];if(choice.finish_reason==='stop')stats.stopped++;else stats.limited++;
   send(response,200,{done:true,done_reason:choice.finish_reason,message:choice.message});
  }catch{if(locked)stats.backendFailures++;else stats.rejectedRequests++;send(response,locked?502:400,{error:'Profile diagnostic request refused or incomplete'});}
  finally{clearTimeout(timer);active.delete(controller);if(locked)busy=false;}
 });
 server.requestTimeout=6000;server.headersTimeout=5000;server.maxRequestsPerSocket=40;server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error();
 return {endpoint:'http://127.0.0.1:'+address.port+'/api/chat',stats,close:async()=>{for(const controller of active)controller.abort();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
export function approvedProfileCpuEnvironment(env:NodeJS.ProcessEnv){return approvedCpuEnvironment(env)&&env.JOBMATCH_AI_PROFILE_CPU_DIAGNOSTIC==='true';}
type Row={id:string;language:string;category:string;durationMs:number}&({status:'graded';passed:boolean;missingRecords:number;unexpectedRecords:number}|{status:'error';passed:false;failureStage:AiFailureStage});
async function evaluate(signal:AbortSignal){
 const rows:Row[]=[],startedAt=new Date().toISOString();
 for(const test of profileCorpus){if(signal.aborted)throw Error();let stage:AiFailureStage='unknown';const start=Date.now();
  try{const preview=await aiProfilePreview(test.source,signal,value=>{stage=value;});stage='grading-validation';const grade=gradeProfile(test,preview);rows.push({id:test.id,language:test.language,category:test.category,status:'graded',...grade,durationMs:Date.now()-start});}
  catch{if(signal.aborted)throw Error();rows.push({id:test.id,language:test.language,category:test.category,status:'error',passed:false,failureStage:stage,durationMs:Date.now()-start});}
 }
 const errors=rows.filter(row=>row.status==='error').length,passed=rows.filter(row=>row.passed).length;
 return {format:'jobmatch-profile-evaluation-v1',corpusVersion:PROFILE_CORPUS_VERSION,corpusSha256:hash(JSON.stringify(profileCorpus)),promptVersion:AI_PROFILE_PROMPT_VERSION,promptSha256:hash(AI_PROFILE_PROMPT),contractVersion:AI_PROFILE_VERSION,startedAt,finishedAt:new Date().toISOString(),planned:12,completed:rows.length,complete:rows.length===12,passed:passed===12,errors,exactGoldPasses:passed,mismatches:12-passed-errors,evaluatorExitCode:errors?2:passed===12?0:1,failureStageCounts:Object.fromEntries(AI_FAILURE_STAGES.map(stage=>[stage,rows.filter(row=>row.status==='error'&&row.failureStage===stage).length])),rows};
}
function phase(name:'pin'|'weights'|'binary'|'server-start'|'server-ready'|'evaluate'|'evaluation-returned'|'report'){process.stdout.write('PROFILE_CPU_PHASE '+name+'\n');}
export async function main(){
 if(!approvedProfileCpuEnvironment(process.env)||process.argv.length!==2||process.platform!=='linux'||process.arch!=='x64'||!/^v24\./.test(process.version))throw Error();phase('pin');const slot=cpuModelSlot(process.env.JOBMATCH_AI_CPU_MODEL_SLOT);
 const pin=validateCpuPin(JSON.parse(readFileSync(slot==='baseline'?'evaluation/cpu-model.json':'evaluation/cpu-model-candidate.json','utf8')),slot),image=process.env.JOBMATCH_AI_CPU_IMAGE_ID;
 if(!image||!/^sha256:[a-f0-9]{64}$/.test(image)||profileCorpus.length!==12)throw Error();
 phase('weights');const stat=statSync(MODEL);if(!stat.isFile()||stat.size!==pin.bytes||(stat.mode&0o222)!==0||await cpuFileSha256(MODEL)!==pin.sha256)throw Error();
 phase('binary');const binarySha=await cpuFileSha256(BINARY),licenseSha=await cpuFileSha256('/model/LICENSE');if(licenseSha!==CPU_LICENSE_SHA)throw Error();
 const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);const timer=setTimeout(cancel,750000);
 let server:ChildProcess|undefined,bridge:Awaited<ReturnType<typeof createProfileCpuBridge>>|undefined;
 try{
  phase('server-start');server=spawn(BINARY,cpuServerArgs(slot),{env:{PATH:process.env.PATH,LLAMA_CACHE:'/tmp'},stdio:'ignore'});server.on('error',cancel);controller.signal.addEventListener('abort',()=>server?.kill('SIGTERM'),{once:true});
  await waitCpuReady(server,18765,controller.signal);phase('server-ready');bridge=await createProfileCpuBridge('http://127.0.0.1:18765/',slot);
  // This process receives only the CI whitelist, and its endpoint is the owned synthetic bridge.
  Object.assign(process.env,{JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_PROFILE_ENABLED:'true',JOBMATCH_AI_PROFILE_MODEL_REVISION:'sha256:'+pin.sha256,JOBMATCH_AI_ENDPOINT:bridge.endpoint,JOBMATCH_AI_MODEL:pin.modelAlias});
  phase('evaluate');const evaluation=await evaluate(controller.signal);phase('evaluation-returned');
  const stats=bridge.stats,afterSha=await cpuFileSha256(MODEL),operationalErrors=evaluation.rows.filter(row=>row.status==='error'&&['transport','http-status-or-type','body-read','cancelled','timeout'].includes(row.failureStage)).length;
  if(controller.signal.aborted||!evaluation.complete||stats.acceptedRequests!==12||stats.backendResponses<1||stats.generatedTokens<stats.backendResponses||stats.backendResponses+stats.backendFailures!==12||stats.stopped+stats.limited!==stats.backendResponses||stats.rejectedRequests!==0||operationalErrors<stats.backendFailures||afterSha!==pin.sha256)throw Error();
  phase('report');process.stdout.write('JOBMATCH_PROFILE_CPU_DIAGNOSTIC_V1 '+JSON.stringify({format:'jobmatch-profile-cpu-diagnostic-v1',runKind:'actual-local-cpu-inference/synthetic-profile-only',pin,containerImageId:image,llamaBinarySha256:binarySha,licenseFileSha256:licenseSha,weightsFileVerified:true,executionBinding:'readonly-file-and-owned-local-process',deploymentIdentityVerified:false,modelIdentityVerified:false,acceptance:'not-accepted',semanticAssessment:'not-performed',independentHeldOut:'not-performed',runtime:{node:process.version,architecture:process.arch,cpu:cpus()[0]?.model?.slice(0,200)??'unknown'},backendComplete:stats.backendResponses===12&&stats.backendFailures===0,bridge:stats,evaluation})+'\n');
 }finally{clearTimeout(timer);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);await bridge?.close();await stopCpuProcess(server);}
}
if(require.main===module)main().catch(()=>{process.stderr.write('CPU profile diagnostic refused or incomplete; no provider output or paths emitted.\n');process.exitCode=2;});
