import {z} from 'zod';
export const consentLimits={receipts:200,page:20,textCodePoints:16000,textBytes:64000,exportBytes:32*1024*1024} as const;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
function validText(text:string){const bytes=encoder.encode(text);return text.trim().length>0&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)&&Array.from(text).length<=consentLimits.textCodePoints&&bytes.byteLength<=consentLimits.textBytes&&decoder.decode(bytes)===text;}
const version=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/),locale=z.enum(['ru','en']),hash=z.string().regex(/^[a-f0-9]{64}$/),sequence=z.number().int().min(0).max(consentLimits.receipts);
export const NoticeSchema=z.object({version,locale,text:z.string().min(1).max(32000).refine(validText),sha256:hash,digestFormat:z.literal('utf8-sha256-v1')}).strict();
export type ProcessingNotice=z.infer<typeof NoticeSchema>;
export const ConsentRequestSchema=z.object({expectedSequence:sequence,commandId:z.uuid(),noticeVersion:version,noticeLocale:locale,noticeSha256:hash,acknowledged:z.literal(true)}).strict();
export type ConsentRequest=z.infer<typeof ConsentRequestSchema>;
export const ReceiptSchema=z.object({format:z.literal('jobmatch-consent-receipt-v1'),id:z.uuid(),ownerId:z.uuid(),sequence:z.number().int().min(1).max(consentLimits.receipts),commandId:z.uuid(),notice:NoticeSchema,recordedAt:z.iso.datetime({offset:true}),provenance:z.literal('authenticated-user-report'),assurance:z.literal('not-a-signature-or-legal-approval')}).strict();
export type ConsentReceipt=z.infer<typeof ReceiptSchema>;
const legacy=z.object({kind:z.literal('legacy-workspace-observation'),version:z.string().min(1).max(200),observedAt:z.iso.datetime({offset:true})}).strict();
export const ConsentPageSchema=z.object({format:z.literal('jobmatch-consent-page-v1'),ownerId:z.uuid(),through:sequence,notice:NoticeSchema.nullable(),legacyObservation:legacy.nullable(),latestReceipt:ReceiptSchema.nullable(),noticeReceipt:ReceiptSchema.nullable(),rows:z.array(ReceiptSchema).max(consentLimits.page),nextAfter:sequence.nullable()}).strict();
export type ConsentPage=z.infer<typeof ConsentPageSchema>;
export async function noticeDigest(text:string){if(!validText(text))throw Error('INVALID_NOTICE');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))),byte=>byte.toString(16).padStart(2,'0')).join('');}
export async function validateNotice(value:unknown){const notice=NoticeSchema.parse(value);if(await noticeDigest(notice.text)!==notice.sha256)throw Error('INVALID_NOTICE');return notice;}
export async function validateConsentReceipt(value:unknown,ownerId:string){const receipt=ReceiptSchema.parse(value);if(receipt.ownerId!==ownerId)throw Error('OWNER');await validateNotice(receipt.notice);return receipt;}
export async function validateConsentPage(value:unknown,ownerId:string,noticeLocale:'ru'|'en',after=0,through?:number){
 const page=ConsentPageSchema.parse(value);
 if(page.ownerId!==ownerId||!Number.isInteger(after)||after<0||after>page.through||(through!==undefined&&page.through!==through))throw Error('INVALID_PAGE');
 if(page.notice){await validateNotice(page.notice);if(page.notice.locale!==noticeLocale)throw Error('INVALID_NOTICE_LOCALE');}
 if(page.through===0){if(page.latestReceipt!==null)throw Error('INVALID_LATEST');}
 else if(!page.latestReceipt||page.latestReceipt.sequence!==page.through)throw Error('INVALID_LATEST');
 if(page.latestReceipt)await validateConsentReceipt(page.latestReceipt,ownerId);
 if(page.noticeReceipt){await validateConsentReceipt(page.noticeReceipt,ownerId);if(!page.notice||page.noticeReceipt.sequence>page.through||JSON.stringify(page.noticeReceipt.notice)!==JSON.stringify(page.notice))throw Error('INVALID_NOTICE_RECEIPT');}
 if(page.rows.length!==Math.min(consentLimits.page,page.through-after))throw Error('INCOMPLETE_PAGE');
 for(let index=0;index<page.rows.length;index++){const row=await validateConsentReceipt(page.rows[index],ownerId);if(row.sequence!==after+index+1)throw Error('INVALID_SEQUENCE');}
 if(new Set(page.rows.map(row=>row.id)).size!==page.rows.length||new Set(page.rows.map(row=>row.commandId)).size!==page.rows.length||new Set(page.rows.map(row=>row.notice.version+'\n'+row.notice.locale)).size!==page.rows.length)throw Error('DUPLICATE');
 const end=after+page.rows.length;
 if(page.nextAfter!==(end<page.through?end:null))throw Error('INVALID_CURSOR');
 const latest=page.rows.find(row=>row.sequence===page.through);
 if(latest&&JSON.stringify(latest)!==JSON.stringify(page.latestReceipt))throw Error('INVALID_LATEST');
 return page;
}
export async function validateConsentAck(value:unknown,ownerId:string,request:ConsentRequest,notice:ProcessingNotice){
 request=ConsentRequestSchema.parse(request);const receipt=await validateConsentReceipt(value,ownerId);
 if(receipt.commandId!==request.commandId||receipt.sequence!==request.expectedSequence+1||request.noticeVersion!==notice.version||request.noticeLocale!==notice.locale||request.noticeSha256!==notice.sha256||JSON.stringify(receipt.notice)!==JSON.stringify(NoticeSchema.parse(notice)))throw Error('INVALID_ACK');
 return receipt;
}
/** Frozen receipt high-water mark. No partial archive is returned for a failed or inconsistent page. */
export async function collectConsentExport(ownerId:string,noticeLocale:'ru'|'en',first:unknown,read:(after:number,through:number)=>Promise<unknown>,byteLimit:number=consentLimits.exportBytes){
 const start=await validateConsentPage(first,ownerId,noticeLocale),rows=[...start.rows];let page=start;
 const ids=new Set(rows.map(row=>row.id)),commands=new Set(rows.map(row=>row.commandId)),versions=new Set(rows.map(row=>row.notice.version+'\n'+row.notice.locale));
 while(page.nextAfter!==null){
  const after=page.nextAfter;page=await validateConsentPage(await read(after,start.through),ownerId,noticeLocale,after,start.through);
  for(const row of page.rows){const key=row.notice.version+'\n'+row.notice.locale;if(ids.has(row.id)||commands.has(row.commandId)||versions.has(key))throw Error('DUPLICATE');ids.add(row.id);commands.add(row.commandId);versions.add(key);rows.push(row);}
  if(rows.length>consentLimits.receipts)throw Error('EXPORT_LIMIT');
 }
 if(rows.length!==start.through||(start.latestReceipt&&JSON.stringify(rows.at(-1))!==JSON.stringify(start.latestReceipt)))throw Error('INCOMPLETE_EXPORT');
 const result={format:'jobmatch-consent-receipts-v1' as const,complete:true as const,ownerId,snapshotSequence:start.through,legacyObservation:start.legacyObservation,receipts:rows,assurance:'user-reports-not-independent-legal-or-signature-proof' as const};
 if(encoder.encode(JSON.stringify(result,null,2)).byteLength>byteLimit)throw Error('EXPORT_LIMIT');
 return result;
}

export const ConsentReadResponseSchema=z.object({page:ConsentPageSchema,acceptanceEnabled:z.boolean()}).strict();
