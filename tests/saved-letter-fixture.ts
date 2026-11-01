import {createHash} from 'node:crypto';
import golden from './fixtures/letter-snapshot-v1.json';
import type {Workspace} from '../lib/db';
import {issueLetterReceipt} from '../lib/saved-letter-signing';
import {decodeLetterReceipt,letterPayloadSha256} from '../lib/saved-letter';
export const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
export const config={key:Buffer.from('ab'.repeat(32),'hex'),keyId:createHash('sha256').update(Buffer.from('ab'.repeat(32),'hex')).digest('hex')};
export const workspace:Workspace={ownerId:owner,revision:3,original:'SQL\r\nПример 🧑‍💻',facts:golden.source.facts,vacancy:'SQL',goal:'',versions:[],applications:[]};
export const snapshotJson=JSON.stringify(golden);
export async function savedFixture(){const receipt=issueLetterReceipt(owner,workspace,0,snapshotJson,config),p=decodeLetterReceipt(receipt),payloadSha256=await letterPayloadSha256(receipt.payload),created=new Date(p.issuedAt*1000).toISOString();const record={format:'jobmatch-saved-letter-version-v1' as const,ownerId:owner,id:p.id,version:1,created,receipt,payloadSha256,issuer:'server-key-holder' as const,sourceVerification:'current-at-acceptance' as const,receiptSignature:'verified-at-acceptance' as const,contentReview:'reported-user-review' as const,semanticAssessment:'not-performed' as const,modelVersion:null};const state={format:'jobmatch-saved-letters-state-v1' as const,ownerId:owner,revision:1,items:[{id:p.id,version:1,created,workspaceRevision:3,templateVersion:p.snapshot.templateVersion,style:p.snapshot.style,edited:p.snapshot.review.edited,payloadSha256}]};return {receipt,p,record,state};}
export const emptyState={format:'jobmatch-saved-letters-state-v1',ownerId:owner,revision:0,items:[]};
