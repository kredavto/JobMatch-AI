import {it,expect} from 'vitest';
import {validateAiReview,eligibleAiFacts} from '../lib/ai-review';
const facts=[{id:'f1',text:'SQL',source:'input',verified:true},{id:'f2',text:'Python',source:'input',verified:false},{id:'f3',text:'Не работал с Python',source:'input',verified:true}];
it('keeps exact vacancy citations and references to confirmed facts only',()=>{const review={requirements:[{quote:'SQL',evidence_ids:['f1']},{quote:'Python',evidence_ids:[]}]};expect(validateAiReview(review,facts,'SQL\nPython')).toEqual(review);expect(eligibleAiFacts(facts)).toEqual([facts[0]]);});
it.each([
 {requirements:[{quote:'PostgreSQL',evidence_ids:['f1']}]},
 {requirements:[{quote:'SQL',evidence_ids:['f2']}]},
 {requirements:[{quote:'Python',evidence_ids:['f3']}]},
 {requirements:[{quote:'SQL',evidence_ids:['foreign']}]},
 {requirements:[{quote:'SQL',evidence_ids:['f1','f1']}]},
 {requirements:[{quote:'SQL',evidence_ids:['f1'],score:100}]},
 {requirements:[{quote:'SQL',evidence_ids:[]},{quote:'SQL',evidence_ids:[]}]},
 {requirements:[{quote:' SQL',evidence_ids:[]}]},
 {requirements:[],score:100}
])('rejects invented, ineligible, duplicate or expanded output %#',value=>{expect(()=>validateAiReview(value,facts,' SQL\nPython')).toThrow();});
it('rejects ambiguous IDs and revoked evidence',()=>{const review={requirements:[{quote:'SQL',evidence_ids:['f1']}]};expect(()=>validateAiReview(review,[facts[0],facts[0]],'SQL')).toThrow();expect(()=>validateAiReview(review,[{...facts[0],verified:false}],'SQL')).toThrow();});
