import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {UserError} from './errors';
import type {Workspace} from './db';
import {composeLetter} from './cover-letter';
import {validateLetterSnapshotJson} from './letter-snapshot';
import {LetterReceiptSchema,decodeLetterReceipt,LETTER_RECEIPT_TTL,LETTER_RECEIPT_BYTES,type LetterReceipt} from './saved-letter';
export type LetterSigningConfig={key:Buffer;keyId:string};
const DOMAIN='jobmatch-letter-receipt-v1\n';
export function letterSigningConfig():LetterSigningConfig{
 const flag=process.env.JOBMATCH_SAVED_LETTERS_ENABLED,key=process.env.JOBMATCH_LETTER_SIGNING_SECRET;
 if(flag!=='true'||!key||!/^[a-f0-9]{64}$/.test(key))throw new UserError('Серверное сохранение писем недоступно.',503);
 const bytes=Buffer.from(key,'hex');return {key:bytes,keyId:createHash('sha256').update(bytes).digest('hex')};
}
export function issueLetterReceipt(ownerId:string,workspace:Workspace,letterRevision:number,snapshotJson:string,config:LetterSigningConfig):LetterReceipt{
 const parsed=validateLetterSnapshotJson(snapshotJson);if(!parsed.ok)throw new UserError('Снимок письма не прошёл проверку.',400);
 const snapshot=parsed.snapshot;if(workspace.ownerId!==undefined&&workspace.ownerId!==ownerId)throw Error('CONFLICT');
 const same=(a:{id:string;text:string;source:string;verified:boolean},b:typeof a)=>a.id===b.id&&a.text===b.text&&a.source===b.source&&a.verified===b.verified;
 try{if(workspace.vacancy!==snapshot.source.vacancy||snapshot.source.facts.some(f=>!workspace.facts.some(current=>same(current,f)))||composeLetter(workspace.facts,workspace.vacancy,snapshot.selection,snapshot.style).text!==snapshot.generated)throw Error();}catch{throw Error('CONFLICT');}
 const issuedAt=Math.floor(Date.now()/1000),payload=JSON.stringify({format:'jobmatch-letter-receipt-v1',id:randomUUID(),issuerKeyId:config.keyId,issuedAt,expiresAt:issuedAt+LETTER_RECEIPT_TTL,source:{ownerId,workspaceRevision:workspace.revision,letterRevision,originalSha256:createHash('sha256').update(workspace.original).digest('hex')},snapshot:{...snapshot,approval:{...snapshot.approval,reviewedIssueIds:[...snapshot.approval.reviewedIssueIds].sort()}}});
 if(Buffer.byteLength(payload)>LETTER_RECEIPT_BYTES)throw new UserError('Снимок слишком велик для серверной версии.',413);
 const receipt={payload,signature:createHmac('sha256',config.key).update(DOMAIN+payload).digest('hex')};decodeLetterReceipt(receipt);return receipt;
}
export function verifyLetterReceipt(value:unknown,ownerId:string,config:LetterSigningConfig){
 try{const receipt=LetterReceiptSchema.parse(value),expected=createHmac('sha256',config.key).update(DOMAIN+receipt.payload).digest();if(!timingSafeEqual(expected,Buffer.from(receipt.signature,'hex')))throw Error();const p=decodeLetterReceipt(receipt),now=Math.floor(Date.now()/1000);if(p.source.ownerId!==ownerId||p.issuerKeyId!==config.keyId||p.issuedAt>now+5||p.expiresAt<=now)throw Error();return {receipt,payload:p};}catch{throw new UserError('Предпросмотр письма устарел или не прошёл проверку.',400);}
}
