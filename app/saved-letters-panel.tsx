'use client';
import {useEffect,useRef,useState} from 'react';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {formatVersionCreated} from '../lib/i18n/version-dates';
import {savedLettersCopy,savedLetterErrorText,savedLetterNoticeText,type SavedLetterFeedback,type SavedLetterNotice} from '../lib/i18n/saved-letters';
import {decodeLetterReceipt,type SavedLettersState,type SavedLetterVersion,type LetterReceipt} from '../lib/saved-letter';
import {letterRequest,LetterClientError,validateLetterHistory,validateLetterHistoryRecord,validateLetterAcceptAck,validateLetterPreview,letterPreviewFresh,findLetterAttempt,requireAttemptReceipt,type ClientLetterPreview,type LetterPreviewBasis} from '../lib/saved-letter-client';
type Props={ownerId?:string;workspaceRevision:number;original?:string;snapshotJson?:string|null;allowSave?:boolean;disabled?:boolean;onBoundaryError?:(status:number)=>void;locale?:UiLocale};
function letterStatus(error:unknown){return error instanceof LetterClientError?error.status:502;}
export default function SavedLettersPanel(props:Props){return <BoundSavedLetters key={props.ownerId??'missing-owner'} {...props}/>;}
function BoundSavedLetters({ownerId,workspaceRevision,original='',snapshotJson=null,allowSave=false,disabled=false,onBoundaryError,locale:requestedLocale='ru'}:Props){
 const language=normalizeLocale(requestedLocale),t=savedLettersCopy[language];
 const [state,setState]=useState<SavedLettersState|null>(null),[record,setRecord]=useState<SavedLetterVersion|null>(null),[working,setWorking]=useState(false),[needsHistory,setNeedsHistory]=useState(false),[attempt,setAttempt]=useState<LetterReceipt|null>(null),[error,setError]=useState<SavedLetterFeedback|null>(null),[notice,setNotice]=useState<SavedLetterNotice|null>(null);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 function boundary(error:unknown){if(error instanceof LetterClientError&&(error.status===401||error.status===409))onBoundaryError?.(error.status);}
 async function perform(task:(controller:AbortController)=>Promise<void>,write=false){
  if(!ownerId||active.current)return;const controller=new AbortController();active.current=controller;setWorking(true);setError(null);setNotice(null);
  try{await task(controller);}catch(e){if(active.current===controller){setError({status:letterStatus(e),write});if(write)setNeedsHistory(true);boundary(e);}}
  finally{if(active.current===controller){active.current=null;setWorking(false);}}
 }
 const current=(c:AbortController)=>active.current===c&&!c.signal.aborted;
 async function load(){if(!ownerId||active.current)return;setNeedsHistory(true);await perform(async c=>{
  const value=await letterRequest('/api/letter-versions',ownerId!,c.signal);const checked=validateLetterHistory(value,ownerId!,state);let found:SavedLetterVersion|null=null;
  if(attempt){const item=await findLetterAttempt(checked,attempt);if(item){found=await validateLetterHistoryRecord(await letterRequest('/api/letter-versions?id='+item.id,ownerId!,c.signal),ownerId!,item);requireAttemptReceipt(found,attempt);}}
  if(!current(c))return;setState(checked);setRecord(found);setNeedsHistory(false);setAttempt(null);setNotice(attempt?found?{key:'found'}:{key:'pending'}:{key:'read'});
 });}
 async function accept(preview:ClientLetterPreview){
  if(disabled||needsHistory||!state||state.revision!==preview.basis.letterRevision||!letterPreviewFresh(preview)||preview.basis.ownerId!==ownerId||preview.basis.workspaceRevision!==workspaceRevision||preview.basis.original!==original||preview.basis.snapshotJson!==snapshotJson||active.current)return;
  const previous=state;setAttempt(preview.receipt);setNeedsHistory(true);
  await perform(async c=>{const b=preview.basis;const ack=await validateLetterAcceptAck(await letterRequest('/api/letter-versions',ownerId!,c.signal,{action:'accept',expectedOwnerId:ownerId,workspaceRevision:b.workspaceRevision,letterRevision:b.letterRevision,consentToStore:true,receipt:preview.receipt,accept:'SAVE_REVIEWED_LETTER_VERSION'}),preview,previous);if(!current(c))return;setState(ack.state);setRecord(ack.record);setAttempt(null);setNeedsHistory(false);setNotice({key:'saved',version:ack.record.version});},true);
 }
 async function open(item:SavedLettersState['items'][number]){await perform(async c=>{const row=await validateLetterHistoryRecord(await letterRequest('/api/letter-versions?id='+item.id,ownerId!,c.signal),ownerId!,item);if(current(c))setRecord(row);});}
 async function download(format:'txt'|'json'){if(!record)return;const row=record;await perform(async c=>{const item=state?.items.find(i=>i.id===row.id);if(!item)throw Error();const checked=await validateLetterHistoryRecord(row,ownerId!,item);if(!current(c))return;const content=format==='txt'?decodeLetterReceipt(checked.receipt).snapshot.text:JSON.stringify(checked,null,2);const url=URL.createObjectURL(new Blob([content],{type:format==='txt'?'text/plain;charset=utf-8':'application/json;charset=utf-8'}));try{const link=document.createElement('a');link.href=url;link.download='jobmatch-saved-letter-'+checked.version+'.'+format;link.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}});}
 const basis=ownerId&&snapshotJson?{ownerId,workspaceRevision,letterRevision:state?.revision??0,original,snapshotJson}:null;
 const snapshot=record?decodeLetterReceipt(record.receipt).snapshot:null;
 return <section id="saved-letters" className="card" lang={language} aria-label={t.region}><h2>{t.region}</h2><p>{t.help}</p><p>{t.serviceHelp}</p>
 {!ownerId&&<p>{t.ownerMissing}</p>}
 <button type="button" disabled={!ownerId||working} onClick={()=>void load()}>{t.read}</button>
 {working&&<p role="status">{t.working}</p>}{error&&<p role="alert">{savedLetterErrorText(error,language)}</p>}{notice&&<p role="status">{savedLetterNoticeText(notice,language)}</p>}{needsHistory&&<p role="alert">{t.needsHistory}</p>}
 {state&&<><p>{t.count(state.revision)}</p>{!state.items.length&&<p>{t.empty}</p>}<ul>{state.items.map(item=><li key={item.id}><span>{t.letter(item.version)} · {formatVersionCreated(item.created,language).text} · {t.historyRevision(item.workspaceRevision)}</span> <button type="button" disabled={working} onClick={()=>void open(item)}>{t.open(item.version)}</button></li>)}</ul></>}
 {allowSave&&<LetterSaveForm locale={language} key={JSON.stringify([ownerId,workspaceRevision,original,snapshotJson,disabled,working,needsHistory,state?.revision])} basis={basis} ready={!!state&&state.revision<50&&!disabled&&!working&&!needsHistory} onAccept={accept} onBoundaryError={onBoundaryError}/>}
 {record&&snapshot&&<article aria-label={t.acceptedRegion}><h3>{t.acceptedTitle(record.version)}</h3><p>{t.acceptedHelp}</p><pre lang="">{snapshot.text}</pre><details><summary>{t.provenance}</summary><p>{t.template}: <span lang="">{snapshot.templateVersion}</span>. {t.noModel} {t.profileRevision}: {decodeLetterReceipt(record.receipt).source.workspaceRevision}.</p><h4>{t.vacancy}</h4><pre lang="">{snapshot.source.vacancy}</pre>{snapshot.source.facts.map(f=><p key={f.id}><span lang="">{f.text}</span><small><span lang="">{f.id} · {f.source}</span> · {t.confirmed}</small></p>)}<p>{t.reviewCount(snapshot.approval.reviewedIssueIds.length)} {t.reviewHelp}</p></details><p>{t.jsonHelp}</p><button type="button" disabled={working} onClick={()=>void download('txt')}>{t.downloadTxt}</button><button type="button" disabled={working} onClick={()=>void download('json')}>{t.downloadJson}</button></article>}
 </section>;
}
function LetterSaveForm({basis,ready,onAccept,onBoundaryError,locale:requestedLocale='ru'}:{basis:LetterPreviewBasis|null;ready:boolean;onAccept:(preview:ClientLetterPreview)=>Promise<void>;onBoundaryError?:Props['onBoundaryError'];locale?:UiLocale}){
 const language=normalizeLocale(requestedLocale),t=savedLettersCopy[language];
 const [consent,setConsent]=useState(false),[working,setWorking]=useState(false),[preview,setPreview]=useState<ClientLetterPreview|null>(null),[accepted,setAccepted]=useState(false),[error,setError]=useState<SavedLetterFeedback|null>(null),[expired,setExpired]=useState(false),[,tick]=useState(0);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 useEffect(()=>{if(!preview)return;const timer=setInterval(()=>{tick(n=>n+1);if(!letterPreviewFresh(preview)){setExpired(true);setAccepted(false);clearInterval(timer);}},1000);return()=>clearInterval(timer);},[preview]);
 async function prepare(){if(!ready||!basis||!consent||active.current)return;const controller=new AbortController();active.current=controller;setWorking(true);setError(null);setPreview(null);setAccepted(false);setExpired(false);try{const b=basis;const value=await letterRequest('/api/letter-versions',b.ownerId,controller.signal,{action:'preview',expectedOwnerId:b.ownerId,workspaceRevision:b.workspaceRevision,letterRevision:b.letterRevision,consentToStore:true,snapshotJson:b.snapshotJson});const checked=await validateLetterPreview(value,b);if(active.current===controller&&!controller.signal.aborted)setPreview(checked);}catch(e){if(active.current===controller){setError({status:letterStatus(e),write:false});if(e instanceof LetterClientError&&(e.status===401||e.status===409))onBoundaryError?.(e.status);}}finally{if(active.current===controller){active.current=null;setWorking(false);}}}
 const fresh=!!preview&&!expired&&letterPreviewFresh(preview);
 return <section lang={language} aria-label={t.saveRegion}><h3>{t.saveTitle}</h3><p>{t.saveHelp}</p>
 {!basis&&<p>{t.missingBasis}</p>}
 <label className="check"><input type="checkbox" checked={consent} disabled={!ready||!basis||working} onChange={e=>{setConsent(e.target.checked);setPreview(null);setAccepted(false);}}/>{t.consent}</label>
 <button type="button" disabled={!ready||!basis||!consent||working} onClick={()=>void prepare()}>{t.preview}</button>
 {working&&<p role="status">{t.previewWorking}</p>}{error&&<p role="alert">{savedLetterErrorText(error,language)}</p>}
 {preview&&<><h4>{t.previewTitle}</h4><pre lang="">{preview.payload.snapshot.text}</pre><details><summary>{t.previewSources}</summary><pre lang="">{preview.payload.snapshot.source.vacancy}</pre>{preview.payload.snapshot.source.facts.map(f=><p key={f.id}><span lang="">{f.text}</span><small lang="">{f.source}</small></p>)}</details><p>{t.previewHelp}</p>{!fresh&&<p role="alert">{t.expired}</p>}<label className="check"><input type="checkbox" checked={accepted&&fresh} disabled={!ready||!fresh||working} onChange={e=>setAccepted(e.target.checked)}/>{t.accept}</label><button type="button" disabled={!ready||!consent||!accepted||!fresh||working} onClick={()=>{if(ready&&consent&&accepted&&preview&&letterPreviewFresh(preview))void onAccept(preview);}}>{t.save}</button></>}
 </section>;
}
