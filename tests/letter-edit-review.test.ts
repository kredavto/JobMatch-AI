import {it,expect} from 'vitest';
import {reviewLetterEdit,validateReviewedLetterExport} from '../lib/letter-edit-review';
import {composeLetter,letterExport,validateLetterExport} from '../lib/cover-letter';
const facts=[{id:'f1',text:'SQL reduced time by 42%.',source:'synthetic',verified:true}],vacancy='SQL';
function packet(append=''){
 const original=composeLetter(facts,vacancy,['edit-f1'],'brief','en').text;
 const letter=letterExport(facts,vacancy,['edit-f1'],'brief','en',original+append),edit_review=reviewLetterEdit(original,letter.approved_text);
 return {format:'jobmatch-reviewed-cover-letter-v1',letter,edit_review,reviewed_issue_ids:edit_review.issues.map(i=>i.id).sort()};
}
it('unchanged template has no findings, but explicitly does not claim semantic verification',()=>{
 const p=packet();expect(p.edit_review).toEqual({format:'literal-edit-audit-v1',coverage:'bounded-lexical-only',semanticAssessment:'not-performed',edited:false,issues:[]});expect(validateReviewedLetterExport(p).letter).toEqual(p.letter);
});
it('every manual edit requires review even with identical numeric/negation multisets',()=>{
 const review=reviewLetterEdit('SQL saved 42%','SQL cost 42%');expect(review.issues.map(i=>i.kind)).toEqual(['manual-edit']);expect(review.semanticAssessment).toBe('not-performed');
});
it('preserves exact signs, percentage spacing, Unicode numbers, dates and code-point spans',()=>{
 const before='😀 42% 2018–2022 -2 ٤٢',after='😀 43 % 2019–2022 −2 42';const review=reviewLetterEdit(before,after);
 expect(review.issues.filter(i=>i.kind==='number-removed').map(i=>i.before?.quote)).toEqual(['42%','2018–2022','-2','٤٢']);
 expect(review.issues.filter(i=>i.kind==='number-added').map(i=>i.after?.quote)).toEqual(['43 %','2019–2022','−2','42']);
 for(const issue of review.issues)for(const [span,text]of [[issue.before,before],[issue.after,after]]as const)if(span)expect(Array.from(text).slice(span.start,span.end).join('')).toBe(span.quote);
 expect(review.issues[1].before).toEqual({quote:'42%',start:2,end:5});
});
it('compares occurrence counts rather than deduplicating repeated numbers',()=>{
 const r=reviewLetterEdit('42 42','42');expect(r.issues.map(i=>i.kind)).toEqual(['manual-edit','number-removed']);expect(r.issues[1].before?.start).toBe(3);
});
it.each(['не','нет','без','никогда','ни','no','not','never','without',"don't",'isn’t',"can't"] )('detects removal of marker %s',marker=>{
 const r=reviewLetterEdit('SQL '+marker+' Python','SQL Python');expect(r.issues.find(i=>i.kind==='negation-removed')?.before?.quote).toBe(marker);
});
it('detects additions without matching marker substrings in unrelated words',()=>{
 const r=reviewLetterEdit('notebook nothing not_work нередко','notebook nothing not_work нередко never');expect(r.issues.filter(i=>i.kind==='negation-added').map(i=>i.after?.quote)).toEqual(['never']);expect(r.issues.some(i=>i.kind==='negation-removed')).toBe(false);
});
it('acknowledges lexical blind spots instead of claiming a pass for role/unit or marker relocation',()=>{
 for(const [a,b]of [['10 years SQL; 5 years Python','5 years SQL; 10 years Python'],['42 months','42 years'],['not SQL; Python','SQL; not Python']])expect(reviewLetterEdit(a,b).issues.map(i=>i.kind)).toEqual(['manual-edit']);
});
it('fails closed above64 tokens per type and side, even on unchanged text',()=>{
 const text=Array(64).fill('42').join(' ');expect(reviewLetterEdit(text,text).coverage).toBe('bounded-lexical-only');expect(reviewLetterEdit(text+' 42',text+' 42').coverage).toBe('token-limit');expect(reviewLetterEdit('SQL',Array(65).fill('never').join(' ')).coverage).toBe('token-limit');
 const p=packet('\n'+Array(65).fill('42').join(' '));expect(()=>validateReviewedLetterExport(p)).toThrow('LETTER_EDIT_REVIEW_REQUIRED');
});
it.each(['','   ','\ud800','x'.repeat(15001)])('refuses unavailable input without an apparently complete report',text=>{expect(()=>reviewLetterEdit('SQL',text)).toThrow('LETTER_EDIT_REVIEW_UNAVAILABLE');});
it('requires every issue exactly once, in canonical order, with no extra acknowledgements',()=>{
 const p=packet('\nNever used 99%.');expect(validateReviewedLetterExport(p).edit_review).toEqual(p.edit_review);
 for(const ids of [[],p.reviewed_issue_ids.slice(1),[...p.reviewed_issue_ids,p.reviewed_issue_ids[0]],[...p.reviewed_issue_ids,'extra'],[...p.reviewed_issue_ids].reverse()])expect(()=>validateReviewedLetterExport({...p,reviewed_issue_ids:ids})).toThrow();
});
it('reconstructs audit from source and rejects omitted, invented, tampered or semantic-pass reports',()=>{
 const p=packet('\nNot 99%.');for(const change of [{issues:[]},{semanticAssessment:'verified'},{coverage:'complete'},{edited:false},{issues:p.edit_review.issues.map(i=>i.after?{...i,after:{...i.after,start:i.after.start+1}}:i)}])expect(()=>validateReviewedLetterExport({...p,edit_review:{...p.edit_review,...change}})).toThrow();
 const copy=JSON.parse(JSON.stringify(p));copy.letter.approved_text+=' 123';expect(()=>validateReviewedLetterExport(copy)).toThrow();expect(()=>validateReviewedLetterExport({...p,extra:'untrusted'})).toThrow();
});
it('accepts equivalent object-key order, while historical v1 decoding is unchanged',()=>{
 const p=packet(' Changed.'),review=Object.fromEntries(Object.entries(p.edit_review).reverse());expect(validateReviewedLetterExport({...p,edit_review:review}).letter).toEqual(p.letter);expect(validateLetterExport(p.letter)).toEqual(p.letter);expect(()=>validateLetterExport(p)).toThrow();
});
