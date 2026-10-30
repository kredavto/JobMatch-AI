import {aiFailureStage,type AiFailureStage} from '../lib/ai-diagnostics';
import {validateAiReview} from '../lib/ai-review';
import type {EvaluationCase} from './corpus';
export function gradeReview(test:EvaluationCase,value:unknown){
 const result=validateAiReview(value,test.facts,test.vacancy);
 const expected=new Map(test.expected.map(row=>[row.quote,new Set(row.evidence_ids)]));
 const actual=new Map(result.requirements.map(row=>[row.quote,new Set(row.evidence_ids)]));
 let missingRequirements=0,unexpectedRequirements=0,missingLinks=0,unsupportedLinks=0;
 for(const [quote,ids] of expected){
  const got=actual.get(quote);if(!got)missingRequirements++;
  for(const id of ids)if(!got?.has(id))missingLinks++;
 }
 for(const [quote,ids] of actual){const gold=expected.get(quote);if(!gold)unexpectedRequirements++;for(const id of ids)if(!gold?.has(id))unsupportedLinks++;}
 return {passed:missingRequirements+unexpectedRequirements+missingLinks+unsupportedLinks===0,missingRequirements,unexpectedRequirements,missingLinks,unsupportedLinks};
}
export async function evaluateCorpus(corpus:readonly EvaluationCase[],invoke:(test:EvaluationCase)=>Promise<unknown>,signal:AbortSignal,diagnostics?:{failureStage:(caseId:string,phase:'invoke'|'grade')=>AiFailureStage}){
 if(!corpus.length||new Set(corpus.map(row=>row.id)).size!==corpus.length)throw Error('Invalid evaluation corpus');
 // Validate trusted labels before any endpoint access, not midway through a run.
 for(const row of corpus){if(!row.expected.length||!gradeReview(row,{requirements:row.expected}).passed)throw Error('Invalid evaluation labels');}
 const rows=[];
 for(const test of corpus){
  if(signal.aborted)break;
  const start=performance.now();
  let phase:'invoke'|'grade'='invoke';
  try{const value=await invoke(test);phase='grade';rows.push({id:test.id,language:test.language,category:test.category,status:'graded' as const,...gradeReview(test,value),durationMs:Math.round(performance.now()-start)});}
  catch{
   let failureStage:AiFailureStage='unknown';
   if(diagnostics){try{failureStage=aiFailureStage(diagnostics.failureStage(test.id,phase));}catch{/* No diagnostic callback failure can hide the original failed case. */}}
   rows.push({id:test.id,language:test.language,category:test.category,status:'error' as const,passed:false,durationMs:Math.round(performance.now()-start),...(diagnostics?{failureStage}:{})});
  }
 }
 const complete=rows.length===corpus.length&&!signal.aborted;
 return {complete,passed:complete&&rows.every(row=>row.passed),planned:corpus.length,completed:rows.length,errors:rows.filter(row=>row.status==='error').length,rows};
}
