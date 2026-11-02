import {z} from 'zod';
import type {Fact} from './engine';
import type {LetterStyle} from './cover-letter';
import {composeDocumentLetter,ENGLISH_LETTER_TEMPLATE_VERSION} from './document-letter';
import {EnglishLetterRecordSchemaV1 as schema,ENGLISH_LETTER_RECORD_FORMAT,ENGLISH_LETTER_RECORD_MAX_BYTES} from './english-letter-record-schema-v1';
export {ENGLISH_LETTER_RECORD_FORMAT,ENGLISH_LETTER_RECORD_MAX_BYTES} from './english-letter-record-schema-v1';
import {reviewLetterEdit} from './letter-edit-review';
import {LetterSnapshotReviewSchemaV1 as reviewSchema} from './letter-snapshot-schema-v1';
export type EnglishLetterRecord=z.infer<typeof schema>;
function checked(input:unknown):EnglishLetterRecord{
 const record=schema.parse(input),{source,selection,style,generated,text:approved,review,approval}=record;
 if(new Set(source.facts.map(fact=>fact.id)).size!==source.facts.length)throw Error('DUPLICATE_SOURCE');
 if(selection.length!==source.facts.length||source.facts.some(fact=>!selection.includes('edit-'+fact.id)))throw Error('SOURCE_SELECTION_MISMATCH');
 if(composeDocumentLetter(source.facts,source.vacancy,selection,style,'en').text!==generated)throw Error('TEMPLATE_MISMATCH');
 const recomputed=reviewLetterEdit(generated,approved);
 if(JSON.stringify(reviewSchema.parse(recomputed))!==JSON.stringify(review))throw Error('REVIEW_MISMATCH');
 if(JSON.stringify([...approval.reviewedIssueIds].sort())!==JSON.stringify(review.issues.map(issue=>issue.id).sort()))throw Error('ACK_MISMATCH');
 return record;
}
/** Internal reconstruction/lexical consistency only. Does not authenticate source, approval or truth. */
export function validateEnglishLetterRecordJson(json:string):{ok:true;record:EnglishLetterRecord}|{ok:false;error:'INVALID_ENGLISH_LETTER_RECORD'}{
 try{if(typeof json!=='string'||json.length>ENGLISH_LETTER_RECORD_MAX_BYTES||new TextEncoder().encode(json).length>ENGLISH_LETTER_RECORD_MAX_BYTES)throw Error('SIZE');return {ok:true,record:checked(JSON.parse(json))};}catch{return {ok:false,error:'INVALID_ENGLISH_LETTER_RECORD'};}
}
export function createEnglishLetterRecordJson(input:{facts:Fact[];vacancy:string;selection:string[];style:LetterStyle;generated:string;text:string;reviewedIssueIds:string[];wholeLetter:boolean}){
 if(composeDocumentLetter(input.facts,input.vacancy,input.selection,input.style,'en').text!==input.generated)throw Error('CURRENT_SOURCE_MISMATCH');
 const record=checked({format:ENGLISH_LETTER_RECORD_FORMAT,trust:'unsigned-editable-local-snapshot',documentLanguage:'en',templateVersion:ENGLISH_LETTER_TEMPLATE_VERSION,contentReview:'reported-user-review',semanticAssessment:'not-performed',modelVersion:null,
 source:{facts:input.facts.filter(fact=>input.selection.includes('edit-'+fact.id)).map(({id,text,source,verified})=>({id,text,source,verified})),vacancy:input.vacancy},
 selection:input.selection,style:input.style,generated:input.generated,text:input.text,review:reviewLetterEdit(input.generated,input.text),approval:{wholeLetter:input.wholeLetter,reviewedIssueIds:[...input.reviewedIssueIds].sort()}});
 const json=JSON.stringify(record,null,2);if(!validateEnglishLetterRecordJson(json).ok)throw Error('INVALID_ENGLISH_LETTER_RECORD');return json;
}
