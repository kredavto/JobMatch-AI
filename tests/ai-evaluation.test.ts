import {it,expect} from 'vitest';
import {evaluationCorpus} from '../evaluation/corpus';
import {gradeReview,evaluateCorpus} from '../evaluation/grade';
const sample=evaluationCorpus[0];
it('gold corpus covers both languages with unique cases and valid provenance',async()=>{
 expect(evaluationCorpus).toHaveLength(28);expect(new Set(evaluationCorpus.map(row=>row.id)).size).toBe(28);
 const result=await evaluateCorpus(evaluationCorpus,async row=>({requirements:row.expected}),new AbortController().signal);
 expect(result).toMatchObject({complete:true,passed:true,completed:28,errors:0});
 for(const language of ['ru','en'])expect(result.rows.filter(row=>row.language===language)).toHaveLength(14);
});
it('empty model output cannot pass through perfect precision with zero recall',()=>{
 expect(gradeReview(sample,{requirements:[]})).toMatchObject({passed:false,missingRequirements:1,missingLinks:1});
});
it('detects wrong yet eligible links, omitted links and extra valid quotes separately',()=>{
 const test={...sample,vacancy:'Python\nSQL',facts:[...sample.facts,{id:'other',text:'SQL',verified:true,source:'synthetic'}]};
 expect(gradeReview(test,{requirements:[{quote:'Python',evidence_ids:['other']},{quote:'SQL',evidence_ids:['other']}]})).toEqual({passed:false,missingRequirements:0,unexpectedRequirements:1,missingLinks:1,unsupportedLinks:2});
});
it('link ordering does not affect exact set comparison',()=>{
 const test=evaluationCorpus.find(row=>row.id==='en-compound-complete')!;
 expect(gradeReview(test,{requirements:[{quote:test.vacancy,evidence_ids:['f2','f1']}]}).passed).toBe(true);
});
it.each([
 {requirements:[{quote:'invented',evidence_ids:[]}]},
 {requirements:[{quote:'Python',evidence_ids:['foreign']}]},
 {requirements:[{quote:'Python',evidence_ids:['f1','f1']}]},
 {requirements:[{quote:'Python',evidence_ids:['f1'],score:100}]}
])('rejects invalid output before any semantic grading',value=>expect(()=>gradeReview(sample,value)).toThrow());
it('does not retry or leak provider diagnostics and does not call a cancelled run',async()=>{
 let calls=0;const result=await evaluateCorpus([sample],async()=>{calls++;throw Error('secret-token-and-document');},new AbortController().signal);
 expect(calls).toBe(1);expect(result).toMatchObject({complete:true,passed:false,errors:1});expect(JSON.stringify(result)).not.toContain('secret');
 const controller=new AbortController();controller.abort();const cancelled=await evaluateCorpus([sample],async()=>{throw Error('should not run');},controller.signal);
 expect(cancelled).toMatchObject({complete:false,passed:false,completed:0});
});
it('preflights every gold case before endpoint access',async()=>{
 let calls=0;await expect(evaluateCorpus([sample,{...sample,id:'bad',expected:[{quote:'invented',evidence_ids:[]}]}],async()=>{calls++;return{};},new AbortController().signal)).rejects.toThrow();expect(calls).toBe(0);
});
it('rejects empty or duplicated corpora',async()=>{
 for(const corpus of [[],[sample,sample]])await expect(evaluateCorpus(corpus,async()=>({}),new AbortController().signal)).rejects.toThrow();
});
