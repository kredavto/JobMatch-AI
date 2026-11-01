import {z} from 'zod';
import {composeLetter,type LetterStyle} from './cover-letter';
import {reviewLetterEdit} from './letter-edit-review';
import type {Fact} from './engine';

import {LetterSnapshotSchemaV1 as schema,LetterSnapshotReviewSchemaV1 as reviewSchema,LETTER_SNAPSHOT_FORMAT,LETTER_TEMPLATE_VERSION,LETTER_SNAPSHOT_MAX_BYTES} from './letter-snapshot-schema-v1';
export {LETTER_SNAPSHOT_FORMAT,LETTER_TEMPLATE_VERSION,LETTER_SNAPSHOT_MAX_BYTES} from './letter-snapshot-schema-v1';
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
