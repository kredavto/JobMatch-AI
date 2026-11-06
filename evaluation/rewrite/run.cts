import {readFileSync,statSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {cpus} from 'node:os';
import {approved,evaluateCase,hash,RewriteCorpus,RUNTIME,ALIAS} from './harness.js';
const MODEL='/model/model.gguf',BINARY='/opt/llama/build/bin/llama-server';
const MODEL_SHA='ca59ca7f13d0e15a8cfa77bd17e65d24f6844b554a7b6c12e07a5f89ff76844e';
const LICENSE_SHA='832dd9e00a68dd83b3c3fb9f5588dad7dcf337a0db50f7d9483f310cd292e92e';
const CORPUS_SHA='0703166fc0491ed093676cd6612331f680f26f45b6b4883eed9e2465c10bdf73';
type Row=Awaited<ReturnType<typeof evaluateCase>>;
/** Transport/runtime totals only. No gold, semantic or model acceptance score. */
export function totals(rows:Row[],interrupted:boolean,weightsStillVerified:boolean){
 const completed=rows.length,backendResponses=rows.filter(r=>r.backendResponse).length;
 const complete=completed===6&&!interrupted;
 return{planned:6,completed,backendResponses,complete,
  runtimeSuccess:complete&&weightsStillVerified&&backendResponses===6&&rows.every(r=>r.finish==='stop'&&r.calls===1&&r.backendRequests===1&&r.tokens>0&&r.promptTokens>0),
  contractValid:rows.filter(r=>r.status==='contract-valid').length,
  generatedTokens:rows.reduce((n,r)=>n+r.tokens,0),
  changedClaims:rows.reduce((n,r)=>n+(r.preview?.review.claims.filter(c=>c.changed).length??0),0),
  lexicalFindings:rows.reduce((n,r)=>n+(r.preview?.review.claims.reduce((m,c)=>m+c.lexical.issues.length,0)??0),0),
  acceptance:'not-accepted' as const,semanticAssessment:'not-performed' as const,independentHeldOut:'not-performed' as const};
}
async function digest(path:string){const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');}
async function main(){
 if(!approved(process.env)||process.argv.length!==2||process.platform!=='linux'||process.arch!=='x64'||!/^v24\./.test(process.version))throw Error('GATE');
 const exactHead=process.env.JOBMATCH_EVAL_HEAD,image=process.env.JOBMATCH_AI_CPU_IMAGE_ID;
 if(!exactHead||!/^[a-f0-9]{40}$/.test(exactHead)||!image||!/^sha256:[a-f0-9]{64}$/.test(image))throw Error('IDENTITY');
 const corpusBytes=readFileSync('evaluation/rewrite/corpus-v1.json');if(hash(corpusBytes)!==CORPUS_SHA)throw Error('CORPUS');
 const corpus=RewriteCorpus.parse(JSON.parse(corpusBytes.toString('utf8')));
 const pin=JSON.parse(readFileSync('evaluation/cpu-model.json','utf8'));
 if(pin.sha256!==MODEL_SHA||pin.bytes!==675710816||pin.modelAlias!==ALIAS||pin.llamaRevision!=='8642541b255bfb5dc39cd351a178be09013a55d6'||pin.context!==4096||pin.maxTokens!==2048)throw Error('PIN');
 const stat=statSync(MODEL);
 if(!stat.isFile()||stat.size!==675710816||(stat.mode&0o222)!==0||await digest(MODEL)!==MODEL_SHA||await digest('/model/LICENSE')!==LICENSE_SHA)throw Error('WEIGHTS');
 const startedAt=new Date().toISOString(),binarySha256=await digest(BINARY),controller=new AbortController(),stop=()=>controller.abort();
 const timer=setTimeout(stop,750000);process.once('SIGTERM',stop);process.once('SIGINT',stop);
 const args=['--model',MODEL,'--alias',ALIAS,'--host','127.0.0.1','--port','18765','--ctx-size',String(RUNTIME.context),'--parallel','1','--threads',String(RUNTIME.threads),'--threads-batch',String(RUNTIME.threads),'--n-gpu-layers','0','--load-mode','none','--no-warmup','--no-webui','--offline'];
 const child=spawn(BINARY,args,{env:{PATH:process.env.PATH,LLAMA_CACHE:'/tmp'},stdio:['ignore','ignore','pipe']});
 let startupStderr=Buffer.alloc(0),lastHealthStatus:number|null=null;
 child.stderr.on('data',(part:Buffer)=>{startupStderr=Buffer.concat([startupStderr,part]).subarray(-16384);});
 child.on('error',stop);controller.signal.addEventListener('abort',()=>child.kill('SIGTERM'),{once:true});
 try{
  const deadline=Date.now()+120000;let ready=false;
  while(Date.now()<deadline&&!controller.signal.aborted&&child.exitCode===null){
   try{const r=await fetch('http://127.0.0.1:18765/health',{redirect:'error',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(1000)])});lastHealthStatus=r.status;ready=r.ok;await r.body?.cancel();if(ready)break;}catch{}
   await new Promise(r=>setTimeout(r,250));
  }
  if(!ready){process.stdout.write('JOBMATCH_REWRITE_STARTUP_V1 '+JSON.stringify({exactHead,containerImageId:image,binarySha256,serverArgs:args,lastHealthStatus,exitCode:child.exitCode,signalCode:child.signalCode,stderrTail:startupStderr.toString('utf8'),acceptance:'not-accepted'})+'\n');throw Error('STARTUP');}
  const rows:Row[]=[];
  for(const test of corpus.cases){
   if(controller.signal.aborted)break;
   rows.push(await evaluateCase(test,async(payload,signal)=>fetch('http://127.0.0.1:18765/v1/chat/completions',{
    method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:payload.model,stream:false,messages:payload.messages,response_format:{type:'json_object',schema:payload.format},temperature:payload.options.temperature,seed:RUNTIME.seed,max_tokens:payload.options.num_predict})
   }),controller.signal));
  }
  const interrupted=controller.signal.aborted;
  const weightsStillVerified=(statSync(MODEL).mode&0o222)===0&&statSync(MODEL).size===675710816&&await digest(MODEL)===MODEL_SHA&&await digest('/model/LICENSE')===LICENSE_SHA;
  const sourceFiles=['evaluation/rewrite/run.cts','evaluation/rewrite/harness.ts','evaluation/rewrite/tsconfig.json','evaluation/cpu-model.json','evaluation/cpu/Dockerfile','lib/ai-rewrite-provider.ts','lib/ai-rewrite-prompt.ts','lib/ai-rewrite.ts','lib/ai-rewrite-signing.ts','lib/ai-provider.ts','lib/ai-review.ts','lib/letter-edit-review.ts','lib/body.ts','lib/errors.ts','lib/engine.ts','lib/application-write-response.ts'];
  const compiledFiles=['evaluation/dist/evaluation/rewrite/run.cjs','evaluation/dist/evaluation/rewrite/harness.js',...sourceFiles.filter(f=>f.startsWith('lib/')).map(f=>'evaluation/dist/'+f.replace(/\.ts$/,'.js'))];
  const report={format:'jobmatch-rewrite-cpu-v1',exactHead,startedAt,finishedAt:new Date().toISOString(),runKind:'actual-local-cpu/synthetic-only',
   pin,actualRuntime:RUNTIME,serverArgs:args,corpusSha256:CORPUS_SHA,
   sourceSha256:Object.fromEntries(sourceFiles.map(f=>[f,hash(readFileSync(f))])),compiledSha256:Object.fromEntries(compiledFiles.map(f=>[f,hash(readFileSync(f))])),
   containerImageId:image,binarySha256,licenseSha256:LICENSE_SHA,weightsFileVerified:true,weightsStillVerified,
   modelIdentityVerified:false,deploymentIdentityVerified:false,executionBinding:'readonly-file-and-owned-local-process',
   adapter:'owned-loopback/openai-to-ollama-envelope-only',runtime:{node:process.version,cpu:cpus()[0]?.model},interrupted,...totals(rows,interrupted,weightsStillVerified),rows};
  process.stdout.write('JOBMATCH_REWRITE_CPU_V1 '+JSON.stringify(report)+'\n');
  if(!report.runtimeSuccess)process.exitCode=2;
 }finally{
  clearTimeout(timer);process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);controller.abort();child.kill('SIGTERM');
  await new Promise(r=>{if(child.exitCode!==null||child.signalCode!==null)return r(null);const t=setTimeout(()=>{child.kill('SIGKILL');r(null);},3000);child.once('exit',()=>{clearTimeout(t);r(null);});});
 }
}
if(require.main===module)main().catch(()=>{process.stderr.write('REWRITE_DIAGNOSTIC_REFUSED_OR_INCOMPLETE\n');process.exitCode=2;});
