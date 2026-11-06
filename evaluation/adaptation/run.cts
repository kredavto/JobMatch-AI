import {readFileSync,statSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {cpus} from 'node:os';
import {approved,configure,evaluateCase,hash,type Case} from './harness.js';
const MODEL='/model/model.gguf',BINARY='/opt/llama/build/bin/llama-server';
const MODEL_SHA='ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e',LICENSE_SHA='832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e';
const CORPUS_SHA='fdf91523d67c0cc5a658285c3e49d78a5b83e372b146b0612e12829ff1061306';
async function digest(path:string){const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');}
async function main(){
 if(!approved(process.env)||process.argv.length!==2||process.platform!=='linux'||process.arch!=='x64'||!/^v24\./.test(process.version))throw Error('GATE');
 const startedAt=new Date().toISOString(),exactHead=process.env.JOBMATCH_EVAL_HEAD;if(!exactHead||! /^[a-f0-9]{40}$/.test(exactHead))throw Error('HEAD');
 const image=process.env.JOBMATCH_AI_CPU_IMAGE_ID;if(!image||!/^sha256:[a-f0-9]{64}$/.test(image))throw Error('IMAGE');
 const corpusBytes=readFileSync('evaluation/adaptation/corpus-v1.json');if(hash(corpusBytes)!==CORPUS_SHA)throw Error('CORPUS');const corpus:Case[]=JSON.parse(corpusBytes.toString('utf8'));if(corpus.length!==16)throw Error('COUNT');
 const pin=JSON.parse(readFileSync('evaluation/cpu-model.json','utf8'));if(pin.sha256!==MODEL_SHA||pin.bytes!==675710816||pin.llamaRevision!=='8642541b255bfb5dc39cd351a178be09013a55d6')throw Error('PIN');
 const stat=statSync(MODEL);if(!stat.isFile()||stat.size!==675710816||(stat.mode&0o222)!==0||await digest(MODEL)!==MODEL_SHA||await digest('/model/LICENSE')!==LICENSE_SHA)throw Error('WEIGHTS');
 const binarySha=await digest(BINARY),nativeFetch=globalThis.fetch,controller=new AbortController(),stop=()=>controller.abort();const timer=setTimeout(stop,750000);process.once('SIGTERM',stop);process.once('SIGINT',stop);
 const child=spawn(BINARY,['--model',MODEL,'--alias',pin.modelAlias,'--host','127.0.0.1','--port','18765','--ctx-size','4096','--parallel','1','--threads','4','--threads-batch','4','--n-gpu-layers','0','--load-mode','none','--no-warmup','--no-webui','--offline'],{env:{PATH:process.env.PATH,LLAMA_CACHE:'/tmp'},stdio:['ignore','ignore','pipe']});
 let startupStderr=Buffer.alloc(0),captureStartup=true,lastHealthStatus:number|null=null,spawnErrorCode:string|null=null;
 // Owned binary only, before any corpus request. Keep draining the pipe after
 // startup without retaining inference-time logs or changing any runtime gate.
 child.stderr.on('data',(part:Buffer)=>{if(captureStartup)startupStderr=Buffer.concat([startupStderr,part.subarray(-16384)]).subarray(-16384);});
 child.on('error',error=>{const code=(error as NodeJS.ErrnoException).code;spawnErrorCode=code&&['EACCES','ENOENT','ENOEXEC','ENOMEM','EAGAIN'].includes(code)?code:'OTHER';stop();});controller.signal.addEventListener('abort',()=>child.kill('SIGTERM'),{once:true});
 try{const deadline=Date.now()+120000;let ready=false;while(Date.now()<deadline&&!controller.signal.aborted&&child.exitCode===null){try{const response=await nativeFetch('http://127.0.0.1:18765/health',{redirect:'error',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(1000)])});lastHealthStatus=response.status;ready=response.ok;void response.body?.cancel().catch(()=>{});if(ready)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  if(!ready){process.stdout.write('JOBMATCH_ADAPTATION_STARTUP_V1 '+JSON.stringify({exactHead,containerImageId:image,binarySha256:binarySha,phase:'before-corpus-requests',backendRequests:0,lastHealthStatus,spawnErrorCode,exitCode:child.exitCode,signalCode:child.signalCode,stderrTail:startupStderr.toString('utf8'),acceptance:'not-accepted'})+'\n');throw Error('STARTUP');}
  captureStartup=false;startupStderr=Buffer.alloc(0);configure();const rows:Awaited<ReturnType<typeof evaluateCase>>[]=[];
  for(const test of corpus){if(controller.signal.aborted)break;rows.push(await evaluateCase(test,async(payload,signal)=>nativeFetch('http://127.0.0.1:18765/v1/chat/completions',{method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({model:payload.model,stream:false,messages:payload.messages,response_format:{type:'json_object',schema:payload.format},temperature:payload.options.temperature,seed:42,max_tokens:payload.options.num_predict})}),controller.signal));}
  const interrupted=controller.signal.aborted,weightsStillVerified=await digest(MODEL)===MODEL_SHA;
  const sourceFiles=['lib/ai-resume-adaptation-provider.ts','lib/ai-resume-adaptation.ts','lib/ai-provider.ts','lib/ai-review.ts','lib/engine.ts','lib/evidence-review.ts'];
  const report={format:'jobmatch-main-adaptation-cpu-v1',exactHead,startedAt,finishedAt:new Date().toISOString(),acceptance:'not-accepted',semanticAssessment:'not-performed',independentHeldOut:'not-performed',runKind:'actual-local-cpu/synthetic-only',pin,corpusSha256:CORPUS_SHA,sourceSha256:Object.fromEntries(sourceFiles.map(f=>[f,hash(readFileSync(f))])),containerImageId:image,binarySha256:binarySha,licenseSha256:LICENSE_SHA,weightsFileVerified:true,modelIdentityVerified:false,deploymentIdentityVerified:false,executionBinding:'readonly-file-and-owned-local-process',runtime:{node:process.version,cpu:cpus()[0]?.model},interrupted,weightsStillVerified,complete:rows.length===16&&!interrupted,planned:16,completed:rows.length,backendResponses:rows.filter(r=>r.backendResponse).length,generatedTokens:rows.reduce((n,r)=>n+r.tokens,0),goldPasses:rows.filter(r=>r.passed).length,stageCounts:Object.fromEntries([...new Set(rows.map(r=>r.stage))].map(stage=>[stage,rows.filter(r=>r.stage===stage).length])),rows};
  process.stdout.write('JOBMATCH_MAIN_ADAPTATION_CPU_V1 '+JSON.stringify(report)+'\n');if(interrupted||!weightsStillVerified||rows.length!==16||report.backendResponses!==16||rows.some(r=>r.finish!=='stop'))process.exitCode=2;
 }finally{clearTimeout(timer);process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);child.kill('SIGTERM');await new Promise(r=>{if(child.exitCode!==null)return r(null);const t=setTimeout(()=>{child.kill('SIGKILL');r(null);},3000);child.once('exit',()=>{clearTimeout(t);r(null);});});}
}
if(require.main===module)main().catch(()=>{process.stderr.write('ADAPTATION_DIAGNOSTIC_REFUSED_OR_INCOMPLETE\n');process.exitCode=2;});
