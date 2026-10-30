import {sourceQuoteContract,type AiQuoteContract} from '../lib/ai-source-quotes';
import {AI_FAILURE_STAGES} from '../lib/ai-diagnostics';
import {createHash} from 'node:crypto';
import {createReadStream,readFileSync,statSync} from 'node:fs';
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {cpus} from 'node:os';
import {join} from 'node:path';
import {z} from 'zod';
import {aiPromptForQuoteContract} from '../lib/ai-prompt';
import {AiReviewSchema,eligibleAiFacts} from '../lib/ai-review';
import {evaluationCorpus} from './corpus';
const MODEL='/model/model.gguf',BINARY='/opt/llama/build/bin/llama-server';
export const CPU_ALIAS='jobmatch-qwen2.5-0.5b-q8-diagnostic';
export const CPU_WEIGHT_SHA='ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e';
export const CPU_LLAMA_SHA='8642541b255bfb5dc39cd351a178be09013a55d6';
const format=z.toJSONSchema(AiReviewSchema);
const inputFor=(test:typeof evaluationCorpus[number])=>JSON.stringify({vacancy:test.vacancy,facts:eligibleAiFacts(test.facts).map(({id,text})=>({id,text}))});
export function approvedCpuEnvironment(env:NodeJS.ProcessEnv){
 return env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.JOBMATCH_AI_CPU_DIAGNOSTIC==='true'&&env.GITHUB_REPOSITORY==='kredavto/JobMatch-AI'&&env.JOBMATCH_REPOSITORY_VISIBILITY==='public'&&env.NODE_ENV==='test';
}
export function validateCpuPin(value:unknown){
 const pin=z.object({format:z.literal('jobmatch-cpu-model-pin-v1'),repository:z.literal('Qwen/Qwen2.5-0.5B-Instruct-GGUF'),revision:z.literal('df5bf01389a39c743ab467d734bf501681e041c5'),file:z.literal('qwen2.5-0.5b-instruct-q8_0.gguf'),sha256:z.literal(CPU_WEIGHT_SHA),bytes:z.literal(675710816),license:z.literal('Apache-2.0'),llamaRepository:z.literal('ggml-org/llama.cpp'),llamaRevision:z.literal(CPU_LLAMA_SHA),modelAlias:z.literal(CPU_ALIAS),context:z.literal(4096),threads:z.literal(4),maxTokens:z.literal(2048),seed:z.literal(42)}).strict();
 return pin.parse(value);
}
async function sha256(path:string){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
async function body(request:IncomingMessage){let size=0;const chunks:Buffer[]=[];for await(const chunk of request){size+=chunk.length;if(size>64000)throw Error();chunks.push(Buffer.from(chunk));}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
function send(response:ServerResponse,status:number,value:unknown){if(!response.destroyed){response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify(value));}}
/** CI-only transport adapter. It never reads expected gold, fabricates content or accepts caller endpoints. */
export async function createCpuBridge(backend:string,quoteContract:AiQuoteContract='legacy'){
 if(quoteContract!=='legacy'&&quoteContract!=='source-lines-v1')throw Error('Unknown quote contract');
 const prompt=aiPromptForQuoteContract(quoteContract);
 const url=new URL(backend);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('Loopback backend required');
 const remaining=new Map<string,number>(),formats=new Map<string,unknown>();
 for(const test of evaluationCorpus){const input=inputFor(test);remaining.set(input,(remaining.get(input)??0)+1);formats.set(input,quoteContract==='source-lines-v1'?sourceQuoteContract(test.vacancy).format:format);}
 const stats={acceptedRequests:0,backendResponses:0,generatedTokens:0,stopped:0,limited:0,transportFailures:0,rejectedRequests:0};
 let busy=false;const active=new Set<AbortController>();
 const server=createServer(async(request,response)=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),19500);active.add(controller);
  response.once('close',()=>controller.abort());
  let locked=false;
  try{
   if(request.method!=='POST'||request.url!=='/api/chat'||busy)throw Error();
   const payload=await body(request);
   const schema=z.object({model:z.literal(CPU_ALIAS),stream:z.literal(false),format:z.unknown(),options:z.object({temperature:z.literal(0),num_predict:z.literal(2048)}).strict(),messages:z.tuple([z.object({role:z.literal('system'),content:z.literal(prompt.text)}).strict(),z.object({role:z.literal('user'),content:z.string().max(48000)}).strict()])}).strict();
   const parsed=schema.parse(payload),input=parsed.messages[1].content;
   if(JSON.stringify(parsed.format)!==JSON.stringify(formats.get(input))||(remaining.get(input)??0)<1||busy)throw Error();
   remaining.set(input,remaining.get(input)!-1);busy=true;locked=true;stats.acceptedRequests++;
   const result=await fetch(new URL('/v1/chat/completions',url),{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({model:CPU_ALIAS,stream:false,messages:parsed.messages,response_format:{type:'json_object',schema:parsed.format},temperature:0,seed:42,max_tokens:2048})});
   if(!result.ok||!result.headers.get('content-type')?.startsWith('application/json'))throw Error();
   const reader=result.body?.getReader();if(!reader)throw Error();
   let size=0;const chunks:Uint8Array[]=[];
   try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>64000)throw Error();chunks.push(item.value);}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   const envelope=z.object({choices:z.tuple([z.object({message:z.object({role:z.literal('assistant'),content:z.string().max(60000)}),finish_reason:z.string().max(32)})]),usage:z.object({prompt_tokens:z.number().int().positive().max(4096),completion_tokens:z.number().int().positive().max(2056)})}).parse(JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks))));
   stats.backendResponses++;stats.generatedTokens+=envelope.usage.completion_tokens;
   const choice=envelope.choices[0];if(choice.finish_reason==='stop')stats.stopped++;else if(choice.finish_reason==='length')stats.limited++;
   // Content is passed byte-for-byte as a JSON string; no repair, gold fallback or retries.
   send(response,200,{done:true,done_reason:choice.finish_reason==='stop'?'stop':'length',message:choice.message});
  }catch{if(locked)stats.transportFailures++;else stats.rejectedRequests++;send(response,locked?502:400,{error:'Diagnostic request refused or incomplete'});}
  finally{clearTimeout(timer);active.delete(controller);if(locked)busy=false;}
 });
 server.requestTimeout=6000;server.headersTimeout=5000;server.maxRequestsPerSocket=40;
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const address=server.address();if(!address||typeof address==='string')throw Error();
 return {endpoint:'http://127.0.0.1:'+address.port+'/api/chat',stats,
  close:async()=>{for(const controller of active)controller.abort();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
async function waitReady(server:ChildProcess,port:number,signal:AbortSignal){
 const deadline=Date.now()+120000;
 while(Date.now()<deadline&&!signal.aborted&&server.exitCode===null){
  try{const response=await fetch('http://127.0.0.1:'+port+'/health',{redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(500)])});await response.body?.cancel();if(response.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw Error('Model startup failed');
}
async function stop(child:ChildProcess|undefined){
 if(!child||child.exitCode!==null||child.signalCode!==null)return;
 child.kill('SIGTERM');await Promise.race([once(child,'close'),new Promise(resolve=>setTimeout(resolve,1500))]);
 if(child.exitCode===null)child.kill('SIGKILL');
}
async function runCli(endpoint:string,signal:AbortSignal,quoteContract:AiQuoteContract){
 if(signal.aborted)throw Error('Diagnostic interrupted');
 const env={PATH:process.env.PATH,NODE_ENV:'test',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_ENDPOINT:endpoint,JOBMATCH_AI_MODEL:CPU_ALIAS,JOBMATCH_AI_EVAL_APPROVED:'true',JOBMATCH_AI_EVAL_DIAGNOSTICS:'stages-v1',JOBMATCH_AI_QUOTE_CONTRACT:quoteContract,JOBMATCH_AI_EVAL_MODEL_REVISION:'sha256:'+CPU_WEIGHT_SHA};
 const child=spawn(process.execPath,[join(__dirname,'run.cjs')],{env,stdio:['ignore','pipe','pipe']});
 const cancel=()=>child.kill('SIGTERM');signal.addEventListener('abort',cancel,{once:true});
 let stdout='',stderr='',overflow=false;const timer=setTimeout(()=>{overflow=true;child.kill('SIGKILL');},610000);
 child.stdout.on('data',data=>{stdout+=data;if(Buffer.byteLength(stdout)>64000){overflow=true;child.kill('SIGKILL');}});
 child.stderr.on('data',data=>{stderr+=data;if(Buffer.byteLength(stderr)>4000){overflow=true;child.kill('SIGKILL');}});
 try{const [code]=await once(child,'close');if(overflow||stderr||![0,1,2].includes(code as number))throw Error();return {exitCode:code,report:JSON.parse(stdout)};}
 finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);await stop(child);}
}
export function cpuServerArgs(){
 return ['--model',MODEL,'--alias',CPU_ALIAS,'--host','127.0.0.1','--port','18765','--offline','--no-webui','--ctx-size','4096','--parallel','1','--threads','4','--threads-batch','4','--n-gpu-layers','0','--load-mode','none','--no-warmup'];
}
type CpuPhase='pin'|'weights'|'binary'|'server-start'|'server-ready'|'evaluate'|'evaluation-returned'|'report';
function phase(value:CpuPhase){process.stdout.write('CPU_DIAGNOSTIC_PHASE '+value+'\n');}
export function validateCpuEvaluationDiagnostics(value:unknown,quoteContract:AiQuoteContract='legacy'){
 if(quoteContract!=='legacy'&&quoteContract!=='source-lines-v1')throw Error('Unknown quote contract');
 const parsed=z.object({schemaVersion:z.literal(quoteContract==='source-lines-v1'?3:2),quoteContractVersion:quoteContract==='source-lines-v1'?z.literal('source-lines-v1'):z.never().optional(),diagnosticFormat:z.literal('ai-failure-stages-v1'),errors:z.number().int().min(0).max(28),failureStageCounts:z.record(z.enum(AI_FAILURE_STAGES),z.number().int().min(0).max(28)),rows:z.array(z.object({status:z.enum(['graded','error']),failureStage:z.enum(AI_FAILURE_STAGES).optional()})).length(28)}).parse(value);
 const errors=parsed.rows.filter(row=>row.status==='error');
 if(errors.length!==parsed.errors||parsed.rows.some(row=>row.status==='graded'?row.failureStage!==undefined:row.failureStage===undefined)||AI_FAILURE_STAGES.some(stage=>parsed.failureStageCounts[stage]!==errors.filter(row=>row.failureStage===stage).length))throw Error('Diagnostic count mismatch');
 return true;
}
export async function main(){
 if(!approvedCpuEnvironment(process.env))throw Error('CI-only approval required');
 phase('pin');
 const requested=process.env.JOBMATCH_AI_CPU_QUOTE_CONTRACT;
 if(requested!==undefined&&requested!==''&&requested!=='legacy'&&requested!=='source-lines-v1')throw Error('Unknown CPU quote contract');
 const quoteContract:AiQuoteContract=requested==='source-lines-v1'?'source-lines-v1':'legacy';
 const pin=validateCpuPin(JSON.parse(readFileSync('evaluation/cpu-model.json','utf8')));
 const image=process.env.JOBMATCH_AI_CPU_IMAGE_ID;
 if(!image||!/^sha256:[a-f0-9]{64}$/.test(image))throw Error('Container identity required');
 phase('weights');
 const stat=statSync(MODEL);if(!stat.isFile()||stat.size!==pin.bytes||(stat.mode&0o222)!==0||await sha256(MODEL)!==pin.sha256)throw Error('Weights mismatch');
 phase('binary');
 const binarySha=await sha256(BINARY),licenseSha=await sha256('/model/LICENSE');
 const controller=new AbortController();const cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 const timer=setTimeout(cancel,750000);let server:ChildProcess|undefined,bridge:Awaited<ReturnType<typeof createCpuBridge>>|undefined;
 try{
  // Fixed private network namespace in workflow, loopback only. No remote endpoint option.
  const port=18765;
  phase('server-start');
  server=spawn(BINARY,cpuServerArgs(),{env:{PATH:process.env.PATH,HOME:'/tmp',LLAMA_CACHE:'/tmp'},stdio:'ignore'});
  server.on('error',cancel);controller.signal.addEventListener('abort',()=>server?.kill('SIGTERM'),{once:true});
  await waitReady(server,port,controller.signal);phase('server-ready');bridge=await createCpuBridge('http://127.0.0.1:'+port+'/',quoteContract);
  phase('evaluate');
  const startedAt=new Date().toISOString(),result=await runCli(bridge.endpoint,controller.signal,quoteContract);
  phase('evaluation-returned');
  validateCpuEvaluationDiagnostics(result.report,quoteContract);
  if(!result.report.complete||result.report.completed!==28||bridge.stats.acceptedRequests!==28||bridge.stats.backendResponses<1||bridge.stats.generatedTokens<1||await sha256(MODEL)!==pin.sha256)throw Error('No complete model diagnostic');
  const quality=result.report.passed?'synthetic-exact-gold-passed':result.report.errors?'synthetic-provider-or-contract-errors':'synthetic-quality-mismatch';
  phase('report');
  process.stdout.write((quoteContract==='source-lines-v1'?'JOBMATCH_CPU_DIAGNOSTIC_V3 ':'JOBMATCH_CPU_DIAGNOSTIC_V2 ')+JSON.stringify({format:quoteContract==='source-lines-v1'?'jobmatch-cpu-diagnostic-v3':'jobmatch-cpu-diagnostic-v2',...(quoteContract==='source-lines-v1'?{quoteContractVersion:quoteContract}:{}),runKind:'actual-local-cpu-inference/synthetic-only',startedAt,finishedAt:new Date().toISOString(),pin,weightsFileVerified:true,executionBinding:'readonly-file-and-owned-local-process',deploymentIdentityVerified:false,acceptance:'not-accepted',containerImageId:image,llamaBinarySha256:binarySha,licenseFileSha256:licenseSha,runtime:{node:process.version,architecture:process.arch,cpu:cpus()[0]?.model?.slice(0,200)??'unknown'},bridge:bridge.stats,diagnosticQuality:quality,evaluatorExitCode:result.exitCode,evaluation:result.report})+'\n');
 }finally{clearTimeout(timer);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);await bridge?.close();await stop(server);}
}
if(require.main===module)main().catch(()=>{process.stderr.write('CPU diagnostic refused or incomplete; no provider output or paths emitted.\n');process.exitCode=2;});
