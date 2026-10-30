'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {ConsentReadResponseSchema,ConsentRequestSchema,validateConsentPage,validateConsentAck,collectConsentExport,type ConsentPage,type ConsentReceipt,type ConsentRequest,type ProcessingNotice} from '../lib/consent-receipts';
import {RequestError,errorFromResponse,requestErrorMessage} from '../lib/client-api';
import {consentCopy} from '../lib/i18n/consent-receipts';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {formatInstant} from '../lib/i18n/dates';
type Props={ownerId?:string;disabled:boolean;locale?:UiLocale;onOwnerConflict?:()=>void};
type Data={page:ConsentPage;acceptanceEnabled:boolean;rows:ConsentReceipt[]};
type ErrorKey='invalidReply'|'loadFailed'|'downloadFailed'|'unknownOutcome';
type Attempt={request:ConsentRequest;notice:ProcessingNotice};
export default function ConsentReceiptsPanel({ownerId,disabled,locale:requestedLocale='ru',onOwnerConflict}:Props){
 const locale=normalizeLocale(requestedLocale),t=consentCopy[locale];
 // Document language is independent of UI language; only explicit changes clear its acceptance.
 const [documentLocale,setDocumentLocale]=useState<UiLocale>(locale),[data,setData]=useState<Data|null>(null),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState<''|'load'|'more'|'accept'|'export'>(''),[blocked,setBlocked]=useState(false),[error,setError]=useState<ErrorKey|RequestError|null>(null),[saved,setSaved]=useState<ConsentReceipt|null>(null),[refreshFailed,setRefreshFailed]=useState(false);
 const active=useRef(true),pending=useRef(false),epoch=useRef(0),controller=useRef<AbortController|null>(null),attempt=useRef<Attempt|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;epoch.current++;controller.current?.abort();};},[ownerId]);
 const known=z.uuid().safeParse(ownerId).success,current=data?.page.ownerId===ownerId?data:null,record=saved?.ownerId===ownerId?saved:null;
 const locked=disabled||!!busy||!known;
 function fail(cause:unknown,fallback:ErrorKey){if(cause instanceof RequestError&&(cause.status===401||cause.code==='OWNER_CHANGED'))onOwnerConflict?.();setError(cause instanceof RequestError?cause:fallback);}
 async function decoded(response:Response){let value:unknown;try{value=await response.json();}catch{value=null;}if(!response.ok){const code=value&&typeof value==='object'&&'code' in value?value.code:undefined;throw errorFromResponse({code},response.status);}return value;}
 async function read(after=0,through?:number){
  controller.current=new AbortController();
  const url='/api/consent-receipts?'+new URLSearchParams({expectedOwnerId:ownerId!,locale:documentLocale,...(after?{after:String(after)}:{}),...(through===undefined?{}:{through:String(through)})});
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(30000)])});
  const value=ConsentReadResponseSchema.parse(await decoded(response));
  return {page:await validateConsentPage(value.page,ownerId!,documentLocale,after,through),acceptanceEnabled:value.acceptanceEnabled};
 }
 async function run(kind:'load'|'more'|'accept'|'export'){
  if(pending.current||locked)return;
  const source=current;
  if(kind==='more'&&(!source||source.page.nextAfter===null))return;
  if(kind==='accept'&&(!source||blocked||!accepted||!source.acceptanceEnabled||!source.page.notice||source.page.noticeReceipt||source.page.through>=200))return;
  pending.current=true;const token=++epoch.current;const valid=()=>active.current&&epoch.current===token;
  setBusy(kind);setError(null);if(kind==='accept')setRefreshFailed(false);
  try{
   if(kind==='accept'){
    const notice=source!.page.notice!,previous=attempt.current;
    const request=previous&&previous.request.expectedSequence===source!.page.through&&previous.notice.version===notice.version&&previous.notice.locale===notice.locale&&previous.notice.sha256===notice.sha256?previous.request:ConsentRequestSchema.parse({expectedSequence:source!.page.through,commandId:crypto.randomUUID(),noticeVersion:notice.version,noticeLocale:notice.locale,noticeSha256:notice.sha256,acknowledged:true});
    attempt.current={request,notice};
    const response=await fetch('/api/consent-receipts?expectedOwnerId='+encodeURIComponent(ownerId!),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(30000)});
    const receipt=await validateConsentAck(await decoded(response),ownerId!,request,notice);
    if(!valid())return;setSaved(receipt);setAccepted(false);setBlocked(true);
    try{const next=await read();if(!valid())return;setData({...next,rows:next.page.rows});setBlocked(false);}
    catch(cause){if(!valid())return;setRefreshFailed(true);fail(cause,'loadFailed');}
   }else if(kind==='export'){
    const first=await read();if(!valid())return;
    const output=await collectConsentExport(ownerId!,documentLocale,first.page,async(after,through)=>{if(!valid())throw Error();const next=await read(after,through);if(!valid())throw Error();return next.page;});
    if(!valid())return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
    try{const link=document.createElement('a');link.href=url;link.download='jobmatch-consent-receipts.json';link.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
   }else{
    const next=await read(kind==='more'?source!.page.nextAfter!:0,kind==='more'?source!.page.through:undefined);if(!valid())return;
    const rows=kind==='more'?[...source!.rows,...next.page.rows]:next.page.rows;
    if(new Set(rows.map(row=>row.id)).size!==rows.length||new Set(rows.map(row=>row.commandId)).size!==rows.length||new Set(rows.map(row=>row.notice.version+'\n'+row.notice.locale)).size!==rows.length)throw Error();
    setData({...next,rows});setAccepted(false);setBlocked(false);setRefreshFailed(false);
    const pendingReceipt=attempt.current&&[next.page.noticeReceipt,next.page.latestReceipt,...next.page.rows].find(row=>row?.commandId===attempt.current!.request.commandId);
    if(pendingReceipt)setSaved(pendingReceipt);
   }
  }catch(cause){if(!valid())return;if(kind==='accept')setBlocked(true);fail(cause,kind==='accept'?'unknownOutcome':kind==='export'?'downloadFailed':'invalidReply');}
  finally{if(valid()){pending.current=false;setBusy('');}}
 }
 function changeDocumentLocale(next:string){if(locked)return;epoch.current++;controller.current?.abort();setDocumentLocale(normalizeLocale(next));setData(null);setAccepted(false);setSaved(null);setBlocked(false);setError(null);setRefreshFailed(false);attempt.current=null;}
 function details(receipt:ConsentReceipt){return <><p>{t.version}: <span lang="">{receipt.notice.version}</span> · {t.language}: <span lang="">{receipt.notice.locale}</span></p><p>{t.recordedAt}: <time dateTime={receipt.recordedAt}>{formatInstant(receipt.recordedAt,locale)}</time></p><code>{receipt.notice.sha256}</code><pre lang={receipt.notice.locale}>{receipt.notice.text}</pre></>;}
 const selectable=!locked&&!blocked&&!!current?.acceptanceEnabled&&!!current.page.notice&&!current.page.noticeReceipt&&current.page.through<200;
 return <section className="card consent-panel" lang={locale} role="region" aria-label={t.region}>
  <h2>{t.title}</h2><p>{t.intro}</p>{!known&&<p>{t.ownerUnknown}</p>}
  <label>{t.noticeLanguage}<select aria-label={t.noticeLanguage} value={documentLocale} disabled={locked} onChange={event=>changeDocumentLocale(event.target.value)}><option value="ru" lang="ru">Русский</option><option value="en" lang="en">English</option></select></label>
  <button disabled={locked} onClick={()=>void run('load')}>{busy==='load'?t.loading:t.load}</button>
  {error&&<p className="error" role="alert">{error instanceof RequestError?requestErrorMessage(error,locale):t[error]}</p>}
  {blocked&&<p>{t.blocked}</p>}{record&&<article className="notice"><p role="status">{refreshFailed?t.savedReadFailed:t.saved}</p><details><summary>{t.recordDetails}</summary>{details(record)}</details></article>}
  {current&&<>{!current.acceptanceEnabled&&<p>{t.off}</p>}{!current.page.notice?<p>{t.noNotice}</p>:<article><h3>{t.noticeTitle}</h3><p>{t.version}: <span lang="">{current.page.notice.version}</span> · {t.language}: <span lang="">{current.page.notice.locale}</span></p><div className="consent-text" tabIndex={0} role="region" aria-label={t.noticeTitle}><pre lang={current.page.notice.locale}>{current.page.notice.text}</pre></div><details><summary>{t.digest}</summary><code>{current.page.notice.sha256}</code></details>
   {current.page.noticeReceipt?<p>{t.already}</p>:<><label className="check"><input type="checkbox" checked={accepted} disabled={!selectable} onChange={event=>setAccepted(event.target.checked)}/>{t.checkbox}</label><button className="primary" disabled={!selectable||!accepted} onClick={()=>void run('accept')}>{busy==='accept'?t.saving:t.accept}</button></>}</article>}
   {current.page.through>=200&&<p>{t.limit}</p>}
   <h3>{t.history}</h3><p>{t.count(current.page.through)}</p>{!current.page.through&&<p>{t.empty}</p>}
   {current.rows.map(receipt=><details key={receipt.id}><summary><span lang="">#{receipt.sequence} · {receipt.notice.version} · {receipt.notice.locale}</span> · {formatInstant(receipt.recordedAt,locale)}</summary>{details(receipt)}</details>)}
   {current.page.nextAfter!==null&&<button disabled={locked} onClick={()=>void run('more')}>{t.more}</button>}
   {current.page.legacyObservation&&<details><summary>{t.legacy}</summary><p>{t.legacyHelp}</p><p><span lang="">{current.page.legacyObservation.version}</span> · <time dateTime={current.page.legacyObservation.observedAt}>{formatInstant(current.page.legacyObservation.observedAt,locale)}</time></p></details>}
   <p><button disabled={locked} onClick={()=>void run('export')}>{busy==='export'?t.exporting:t.export}</button></p><p>{t.exportHelp}</p>
  </>}
  <p>{t.boundary}</p><p>{t.localOnly}</p>
 </section>;
}
