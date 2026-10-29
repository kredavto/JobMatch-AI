import {createHash} from 'node:crypto';
import {aiConfig,aiReview} from '../lib/ai-provider';
import {AI_PROMPT_VERSION,AI_SYSTEM_PROMPT} from '../lib/ai-prompt';
import {CORPUS_VERSION,evaluationCorpus} from './corpus';
import {evaluateCorpus} from './grade';
/** Offline synthetic fixtures only; operator must explicitly approve this endpoint run. */
async function main(){
 if(process.env.JOBMATCH_AI_EVAL_APPROVED!=='true')throw Error('Evaluation approval required');
 const config=aiConfig();
 const revision=process.env.JOBMATCH_AI_EVAL_MODEL_REVISION;
 if(!revision||!/^sha256:[a-f0-9]{64}$/.test(revision))throw Error('Operator-declared model digest required');
 const controller=new AbortController();
 const cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 const timer=setTimeout(cancel,600000),startedAt=new Date().toISOString();
 try{
  const result=await evaluateCorpus(evaluationCorpus,test=>aiReview(test.facts,test.vacancy,controller.signal),controller.signal);
  const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
  // Never emit endpoint, token, prompts, facts, model output or provider diagnostics.
  process.stdout.write(JSON.stringify({schemaVersion:1,runKind:'operator-configured-endpoint',startedAt,finishedAt:new Date().toISOString(),corpusVersion:CORPUS_VERSION,corpusSha256:hash(JSON.stringify(evaluationCorpus)),promptVersion:AI_PROMPT_VERSION,promptSha256:hash(AI_SYSTEM_PROMPT),model:config.model,operatorDeclaredModelDigest:revision,modelIdentityVerified:false,semanticAcceptance:'synthetic-exact-gold-only',...result})+'\n');
  process.exitCode=!result.complete||result.errors?2:result.passed?0:1;
 }finally{clearTimeout(timer);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
main().catch(()=>{process.stderr.write('AI evaluation refused or failed; verify approval, own endpoint and model digest. No provider diagnostics emitted.\n');process.exitCode=2;});
