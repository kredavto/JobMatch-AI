import {z} from 'zod';
import {LetterSnapshotSchemaV1} from './letter-snapshot-schema-v1';
import {LetterReceiptSchema,SavedLettersStateSchema,decodeLetterReceipt,letterPayloadSha256,validateSavedLetterVersion,type SavedLettersState,type SavedLetterVersion,type LetterReceipt} from './saved-letter';
export type LetterPreviewBasis={ownerId:string;workspaceRevision:number;letterRevision:number;original:string;snapshotJson:string};
const envelope=z.strictObject({format:z.literal('jobmatch-letter-preview-v1'),ownerId:z.uuid(),workspaceRevision:z.number().int().nonnegative(),letterRevision:z.number().int().min(0).max(49),receipt:LetterReceiptSchema,semanticAssessment:z.literal('not-performed'),modelVersion:z.null()});
export async function validateLetterPreview(value:unknown,basis:LetterPreviewBasis,wall=Date.now(),monotonic=performance.now()){
 const result=envelope.parse(value),payload=decodeLetterReceipt(result.receipt),snapshot=LetterSnapshotSchemaV1.parse(JSON.parse(basis.snapshotJson));
 if(result.ownerId!==basis.ownerId||result.workspaceRevision!==basis.workspaceRevision||result.letterRevision!==basis.letterRevision||payload.source.ownerId!==basis.ownerId||payload.source.workspaceRevision!==basis.workspaceRevision||payload.source.letterRevision!==basis.letterRevision||payload.source.originalSha256!==await letterPayloadSha256(basis.original)||JSON.stringify(payload.snapshot)!==JSON.stringify(snapshot)||payload.issuedAt*1000>wall+5000||payload.expiresAt*1000<=wall)throw Error('INVALID_LETTER_PREVIEW');
 return {receipt:result.receipt,payload,basis,receivedWall:wall,receivedMonotonic:monotonic,deadline:monotonic+Math.min(600000,payload.expiresAt*1000-wall)};
}
export type ClientLetterPreview=Awaited<ReturnType<typeof validateLetterPreview>>;
export function letterPreviewFresh(preview:ClientLetterPreview,wall=Date.now(),monotonic=performance.now()){
 return Number.isFinite(wall)&&Number.isFinite(monotonic)&&wall>=preview.receivedWall&&monotonic>=preview.receivedMonotonic&&wall<preview.payload.expiresAt*1000&&monotonic<preview.deadline;
}
export function validateLetterHistory(value:unknown,ownerId:string,previous?:SavedLettersState|null){
 const state=SavedLettersStateSchema.parse(value);if(state.ownerId!==ownerId||previous&&(previous.ownerId!==ownerId||state.revision<previous.revision||previous.items.some((item,i)=>JSON.stringify(item)!==JSON.stringify(state.items[state.revision-previous.revision+i]))))throw Error('INVALID_LETTER_HISTORY');return state;
}
export async function validateLetterHistoryRecord(value:unknown,ownerId:string,item:SavedLettersState['items'][number]){
 const row=await validateSavedLetterVersion(value,ownerId),p=decodeLetterReceipt(row.receipt);
 if(row.id!==item.id||row.version!==item.version||row.created!==item.created||row.payloadSha256!==item.payloadSha256||p.source.workspaceRevision!==item.workspaceRevision||p.snapshot.templateVersion!==item.templateVersion||p.snapshot.style!==item.style||p.snapshot.review.edited!==item.edited)throw Error('INVALID_LETTER_HISTORY_RECORD');return row;
}
export async function validateLetterAcceptAck(value:unknown,preview:ClientLetterPreview,previous:SavedLettersState){
 const result=z.strictObject({state:z.unknown(),record:z.unknown()}).parse(value),state=validateLetterHistory(result.state,preview.basis.ownerId,previous);
 if(state.revision!==preview.basis.letterRevision+1||previous.revision!==preview.basis.letterRevision)throw Error('INVALID_LETTER_ACK');
 const row=await validateLetterHistoryRecord(result.record,preview.basis.ownerId,state.items[0]);
 if(row.receipt.payload!==preview.receipt.payload||row.receipt.signature!==preview.receipt.signature||row.id!==preview.payload.id)throw Error('INVALID_LETTER_ACK');return {state,record:row};
}
export async function findLetterAttempt(state:SavedLettersState,receipt:LetterReceipt){
 const payload=decodeLetterReceipt(receipt);if(state.ownerId!==payload.source.ownerId)throw Error('INVALID_LETTER_HISTORY');
 const item=state.items.find(i=>i.id===payload.id);if(item&&(item.payloadSha256!==await letterPayloadSha256(receipt.payload)||item.version!==payload.source.letterRevision+1))throw Error('INVALID_LETTER_HISTORY');return item;
}
export function requireAttemptReceipt(row:SavedLetterVersion,receipt:LetterReceipt){if(row.receipt.payload!==receipt.payload||row.receipt.signature!==receipt.signature)throw Error('INVALID_LETTER_ATTEMPT');}
export class LetterClientError extends Error{constructor(public status:number){super('LETTER_REQUEST_FAILED');}}
/** Explicit UI actions only; bounded response, fixed errors, no automatic retry. */
export async function letterRequest(url:string,ownerId:string,signal:AbortSignal,body?:unknown):Promise<unknown>{
 let response:Response;try{response=await fetch(url,{method:body===undefined?'GET':'POST',cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(20000)]),headers:{'x-jobmatch-owner':ownerId,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{throw new LetterClientError(0);}
 if(!response.ok){try{await response.body?.cancel();}catch{}throw new LetterClientError(response.status);}
 const reader=response.body?.getReader();if(!reader)throw new LetterClientError(502);let size=0;
 try{const chunks:Uint8Array[]=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2100000)throw Error();chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}return JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(bytes));}catch{try{await reader.cancel();}catch{}throw new LetterClientError(502);}finally{reader.releaseLock();}
}
