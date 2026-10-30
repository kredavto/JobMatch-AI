import {noticeDigest,type ProcessingNotice,type ConsentReceipt,type ConsentPage} from '../../lib/consent-receipts';
export const consentOwner='11111111-1111-4111-8111-111111111111';
export async function noticeFor(locale:'ru'|'en'='ru',version='synthetic-active-v1',text='SYNTHETIC ONLY — no legal approval 😀\r\nExact bytes.  '):Promise<ProcessingNotice>{return {version,locale,text,sha256:await noticeDigest(text),digestFormat:'utf8-sha256-v1'};}
export async function receiptFor(sequence=1,notice?:ProcessingNotice,ownerId=consentOwner):Promise<ConsentReceipt>{
 const suffix=String(sequence).padStart(12,'0');return {format:'jobmatch-consent-receipt-v1',id:'22222222-2222-4222-8222-'+suffix,ownerId,sequence,commandId:'33333333-3333-4333-8333-'+suffix,notice:notice??await noticeFor('ru','synthetic-'+sequence),recordedAt:'2026-10-30T10:00:00.123456+00:00',provenance:'authenticated-user-report',assurance:'not-a-signature-or-legal-approval'};
}
export async function pageFor(count=0,after=0,through=count,locale:'ru'|'en'='ru'):Promise<ConsentPage>{
 const all=await Promise.all(Array.from({length:count},(_,index)=>receiptFor(index+1)));
 const rows=all.slice(after,Math.min(after+20,through)),last=after+rows.length;
 return {format:'jobmatch-consent-page-v1',ownerId:consentOwner,through,notice:await noticeFor(locale),legacyObservation:{kind:'legacy-workspace-observation',version:'privacy-v1',observedAt:'2020-01-01T00:00:00Z'},latestReceipt:through?all[through-1]:null,rows,nextAfter:last<through?last:null};
}
