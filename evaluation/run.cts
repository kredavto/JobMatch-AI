import {configuredAiQuoteContract} from '../lib/ai-source-quotes';
import {AI_FAILURE_STAGES,type AiFailureStage} from '../lib/ai-diagnostics';
import {createHash} from 'node:crypto';
import {aiConfig,aiReview} from '../lib/ai-provider';
import {aiPromptForQuoteContract} from '../lib/ai-prompt';
import {CORPUS_VERSION,evaluationCorpus} from './corpus';
import {evaluateCorpus} from './grade';
/** Offline synthetic fixtures only; operator must explicitly approve this endpoint run. */
async function main(){
 if(process.env.JOBMATCH_AI_EVAL_APPROVED!=='true')throw Error('Evaluation approval required');
 const requested=process.env.JOBMATCH_AI_EVAL_DIAGNOSTICS;
 if(requested!==undefined&&requested!==''&&requested!=='off'&&requested!=='stages-v1')throw Error('Unknown diagnostic format');
 const diagnostics=requested==='stages-v1';
 const config=aiConfig(),quoteContract=configuredAiQuoteContract(),prompt=aiPromptForQuoteContract(quoteContract);
 const revision=process.env.JOBMATCH_AI_EVAL_MODEL_REVISION;
 if(!revision||!/^sha256:[a-f0-9]{64}$/.test(revision))throw Error('Operator-declared model digest required');
 const controller=new AbortController();
 const cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 const timer=setTimeout(cancel,600000),startedAt=new Date().toISOString();
 try{
  const stages=new Map<string,AiFailureStage>();
  const result=await evaluateCorpus(evaluationCorpus,test=>aiReview(test.facts,test.vacancy,controller.signal,diagnostics?stage=>{stages.set(test.id,stage);}:undefined),controller.signal,diagnostics?{failureStage:(id,phase)=>phase==='grade'?'grading-validation':stages.get(id)??'unknown'}:undefined);
  const stageCounts=diagnostics?Object.fromEntries(AI_FAILURE_STAGES.map(stage=>[stage,result.rows.filter(row=>'failureStage' in row&&row.failureStage===stage).length])):undefined;
  const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
  // Never emit endpoint, token, prompts, facts, model output or provider diagnostics.
  process.stdout.write(JSON.stringify({schemaVersion:quoteContract==='source-lines-v1'?3:diagnostics?2:1,...(quoteContract==='source-lines-v1'?{quoteContractVersion:quoteContract}:{}),...(diagnostics?{diagnosticFormat:'ai-failure-stages-v1',failureStageCounts:stageCounts}:{}),runKind:'operator-configured-endpoint',startedAt,finishedAt:new Date().toISOString(),corpusVersion:CORPUS_VERSION,corpusSha256:hash(JSON.stringify(evaluationCorpus)),promptVersion:prompt.version,promptSha256:hash(prompt.text),model:config.model,operatorDeclaredModelDigest:revision,modelIdentityVerified:false,semanticAcceptance:'synthetic-exact-gold-only',...result})+'\n');
  process.exitCode=!result.complete||result.errors?2:result.passed?0:1;
 }finally{clearTimeout(timer);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
main().catch(()=>{process.stderr.write('AI evaluation refused or failed; verify approval, own endpoint and model digest. No provider diagnostics emitted.\n');process.exitCode=2;});
