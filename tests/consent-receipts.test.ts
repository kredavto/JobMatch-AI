import {it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {ConsentRequestSchema,noticeDigest,validateNotice,validateConsentPage,validateConsentAck,collectConsentExport} from '../lib/consent-receipts';
import {consentOwner,noticeFor,receiptFor,pageFor} from './fixtures/consent-receipts';
it('hashes exact UTF-8, including emoji, CRLF and trailing spaces, without normalization',async()=>{
 const text='SYNTHETIC 😀\r\nСтрока  ';expect(await noticeDigest(text)).toBe(createHash('sha256').update(text,'utf8').digest('hex'));
 expect(await noticeDigest(text)).not.toBe(await noticeDigest(text.trim()));expect(await noticeDigest('é')).not.toBe(await noticeDigest('e\u0301'));
});
it.each(['',' \r\n','bad\u0000text','bad\u000btext','bad\ud800text','x'.repeat(16001)])('refuses unsafe or oversized notice text %#',async text=>{await expect(noticeDigest(text)).rejects.toThrow();});
it('keeps UTF-16 and Unicode code point limits consistent with PostgreSQL',async()=>{
 const text='😀'.repeat(16000);expect((await validateNotice(await noticeFor('en','unicode',text))).text).toBe(text);
 await expect(noticeDigest(text+'😀')).rejects.toThrow();
});
it('requires an explicit true acknowledgement and accepts no owner/text/time/IP metadata',async()=>{
 const notice=await noticeFor(),request={expectedSequence:0,commandId:'33333333-3333-4333-8333-000000000001',noticeVersion:notice.version,noticeLocale:notice.locale,noticeSha256:notice.sha256,acknowledged:true};
 expect(ConsentRequestSchema.parse(request)).toEqual(request);
 for(const patch of [{acknowledged:false},{acknowledged:undefined},{ownerId:consentOwner},{text:notice.text},{recordedAt:'2020-01-01T00:00:00Z'},{ip:'127.0.0.1'},{noticeSha256:notice.sha256.toUpperCase()},{expectedSequence:-1}])expect(ConsentRequestSchema.safeParse({...request,...patch}).success).toBe(false);
});
it('accepts only the requested owner/command/next sequence and exact displayed notice',async()=>{
 const notice=await noticeFor(),receipt=await receiptFor(1,notice),request={expectedSequence:0,commandId:receipt.commandId,noticeVersion:notice.version,noticeLocale:notice.locale,noticeSha256:notice.sha256,acknowledged:true as const};
 expect(await validateConsentAck(receipt,consentOwner,request,notice)).toEqual(receipt);
 for(const patch of [{ownerId:'44444444-4444-4444-8444-444444444444'},{sequence:2},{commandId:'44444444-4444-4444-8444-444444444444'},{assurance:'legally-approved'},{notice:{...notice,text:notice.text+' Changed'}}])await expect(validateConsentAck({...receipt,...patch},consentOwner,request,notice)).rejects.toThrow();
 await expect(validateConsentAck(receipt,consentOwner,{...request,acknowledged:false as never},notice)).rejects.toThrow();
});
it.each(['owner','missing-row','cursor','head','latest','order','unknown-field','body'] as const)('rejects inconsistent page %s',async problem=>{
 const page=await pageFor(21);
 if(problem==='owner')page.rows[0].ownerId='44444444-4444-4444-8444-444444444444';
 if(problem==='missing-row')page.rows.pop();if(problem==='cursor')page.nextAfter=19;if(problem==='head')page.through=20;
 if(problem==='latest')page.latestReceipt=page.rows[0];if(problem==='order')page.rows.reverse();
 if(problem==='unknown-field')Object.assign(page,{accepted:true});if(problem==='body')page.rows[0].notice.text+=' Changed';
 await expect(validateConsentPage(page,consentOwner,'ru')).rejects.toThrow();
});
it('distinguishes a legacy observation from acceptance and validates an empty journal',async()=>{
 const page=await pageFor();const parsed=await validateConsentPage(page,consentOwner,'ru');expect(parsed.through).toBe(0);expect(parsed.rows).toEqual([]);expect(parsed.latestReceipt).toBeNull();expect(parsed.legacyObservation?.kind).toBe('legacy-workspace-observation');
});
it('exports a fixed high-water mark through complete validated pages',async()=>{
 const first=await pageFor(41),read=vi.fn(async(after:number,through:number)=>pageFor(50,after,through));
 const output=await collectConsentExport(consentOwner,'ru',first,read);
 expect(read.mock.calls).toEqual([[20,41],[40,41]]);expect(output.snapshotSequence).toBe(41);expect(output.receipts).toHaveLength(41);expect(output.complete).toBe(true);expect(output.receipts.at(-1)?.sequence).toBe(41);
 expect(output.legacyObservation).toEqual(first.legacyObservation);expect(output.assurance).toContain('not-independent');
});
it('never returns a partial export after a failed/mismatched page or exceeded byte budget',async()=>{
 const first=await pageFor(21);
 await expect(collectConsentExport(consentOwner,'ru',first,async()=>{throw Error('PRIVATE');})).rejects.toThrow();
 await expect(collectConsentExport(consentOwner,'ru',first,async()=>pageFor(22,20,22))).rejects.toThrow();
 await expect(collectConsentExport(consentOwner,'ru',await pageFor(1),async()=>{throw Error();},10)).rejects.toThrow('EXPORT_LIMIT');
});
