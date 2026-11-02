import {z} from 'zod';
import type {Fact} from './engine';
import type {LetterStyle} from './cover-letter';
import {composeDocumentLetter,ENGLISH_LETTER_TEMPLATE_VERSION} from './document-letter';
import {reviewLetterEdit} from './letter-edit-review';
import {LetterSnapshotReviewSchemaV1 as reviewSchema} from './letter-snapshot-schema-v1';
export const ENGLISH_LETTER_RECORD_FORMAT='jobmatch-english-letter-record-v1';
export const ENGLISH_LETTER_RECORD_MAX_BYTES=1_000_000;
const text=(max:number)=>z.string().min(1).max(max).refine(value=>value.isWellFormed()&&!!value.trim()&&!value.includes('\0'));
const schema=z.strictObject({
 format:z.literal(ENGLISH_LETTER_RECORD_FORMAT),trust:z.literal('unsigned-editable-local-snapshot'),
 documentLanguage:z.literal('en'),templateVersion:z.literal(ENGLISH_LETTER_TEMPLATE_VERSION),
 contentReview:z.literal('reported-user-review'),semanticAssessment:z.literal('not-performed'),modelVersion:z.null(),
 source:z.strictObject({facts:z.array(z.strictObject({id:text(200),text:text(2000),source:text(2000),verified:z.boolean()})).min(1).max(5),vacancy:text(30000)}),
 selection:z.array(text(205)).min(1).max(5),style:z.enum(['professional','brief','confident','executive']),
 generated:text(15000),text:text(15000),review:reviewSchema,
 approval:z.strictObject({wholeLetter:z.literal(true),reviewedIssueIds:z.array(text(100)).max(257)})
});
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
