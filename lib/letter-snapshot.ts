import {z} from 'zod';
import {composeLetter,letterStyles,type LetterStyle} from './cover-letter';
import {reviewLetterEdit,LETTER_EDIT_REVIEW_VERSION} from './letter-edit-review';
import type {Fact} from './engine';

export const LETTER_SNAPSHOT_FORMAT='jobmatch-local-letter-snapshot-v1';
// Bump whenever composition, framing, evidence selection or gates change.
export const LETTER_TEMPLATE_VERSION='main-ru-letter-81cb1a6-v1';
export const LETTER_SNAPSHOT_MAX_BYTES=1_000_000;
const text=(max:number)=>z.string().min(1).max(max).refine(s=>s.isWellFormed()&&!!s.trim());
const span=z.strictObject({quote:text(15000),start:z.number().int().min(0).max(15000),end:z.number().int().min(0).max(15000)});
const reviewSchema=z.strictObject({format:z.literal(LETTER_EDIT_REVIEW_VERSION),coverage:z.literal('bounded-lexical-only'),semanticAssessment:z.literal('not-performed'),edited:z.boolean(),issues:z.array(z.strictObject({id:text(100),kind:z.enum(['manual-edit','number-added','number-removed','negation-added','negation-removed']),before:span.nullable(),after:span.nullable()})).max(257)});
const schema=z.strictObject({
 format:z.literal(LETTER_SNAPSHOT_FORMAT),trust:z.literal('unsigned-editable-local-snapshot'),templateVersion:z.literal(LETTER_TEMPLATE_VERSION),
 source:z.strictObject({facts:z.array(z.strictObject({id:text(200),text:text(2000),source:text(2000),verified:z.boolean()})).min(1).max(5),vacancy:text(30000)}),
 selection:z.array(text(205)).min(1).max(5),style:z.enum(Object.keys(letterStyles) as [LetterStyle,...LetterStyle[]]),
 generated:text(15000),text:text(15000),review:reviewSchema,
 approval:z.strictObject({wholeLetter:z.literal(true),reviewedIssueIds:z.array(text(100)).max(257)})
});
export type LetterSnapshot=z.infer<typeof schema>;
function assertSnapshot(input:unknown):LetterSnapshot{
 const result=schema.parse(input);
 const {source,selection,style,generated,text:approved,review,approval}=result;
 if(new Set(source.facts.map(f=>f.id)).size!==source.facts.length)throw Error('DUPLICATE_SOURCE');
 if(selection.length!==source.facts.length||source.facts.some(f=>!selection.includes('edit-'+f.id)))throw Error('SOURCE_SELECTION_MISMATCH');
 if(composeLetter(source.facts,source.vacancy,selection,style).text!==generated)throw Error('TEMPLATE_MISMATCH');
 const recomputed=reviewLetterEdit(generated,approved);
 // Parse both into the same fixed field order; reject extra fields and any altered span/issue.
 if(JSON.stringify(reviewSchema.parse(recomputed))!==JSON.stringify(review))throw Error('REVIEW_MISMATCH');
 const expected=review.issues.map(i=>i.id).sort();
 if(JSON.stringify([...approval.reviewedIssueIds].sort())!==JSON.stringify(expected))throw Error('ACK_MISMATCH');
 return result;
}
/** Internal consistency only. Does not authenticate sources, approval, truth or current server state. */
export function validateLetterSnapshotJson(json:string):{ok:true;snapshot:LetterSnapshot}|{ok:false;error:'INVALID_LOCAL_LETTER_SNAPSHOT'}{
 try{if(typeof json!=='string'||json.length>LETTER_SNAPSHOT_MAX_BYTES||new TextEncoder().encode(json).length>LETTER_SNAPSHOT_MAX_BYTES)throw Error('SIZE');return {ok:true,snapshot:assertSnapshot(JSON.parse(json))};}catch{return {ok:false,error:'INVALID_LOCAL_LETTER_SNAPSHOT'};}
}
export function createLetterSnapshotJson(input:{facts:Fact[];vacancy:string;selection:string[];style:LetterStyle;generated:string;text:string;reviewedIssueIds:string[];wholeLetter:boolean}){
 if(composeLetter(input.facts,input.vacancy,input.selection,input.style).text!==input.generated)throw Error('CURRENT_SOURCE_MISMATCH');
 const snapshot=assertSnapshot({format:LETTER_SNAPSHOT_FORMAT,trust:'unsigned-editable-local-snapshot',templateVersion:LETTER_TEMPLATE_VERSION,source:{facts:input.facts.filter(f=>input.selection.includes('edit-'+f.id)).map(({id,text,source,verified})=>({id,text,source,verified})),vacancy:input.vacancy},selection:input.selection,style:input.style,generated:input.generated,text:input.text,review:reviewLetterEdit(input.generated,input.text),approval:{wholeLetter:input.wholeLetter,reviewedIssueIds:[...input.reviewedIssueIds].sort()}});
 const json=JSON.stringify(snapshot,null,2);
 if(!validateLetterSnapshotJson(json).ok)throw Error('INVALID_LOCAL_LETTER_SNAPSHOT');
 return json;
}
