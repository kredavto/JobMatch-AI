'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ProfileAcceptanceListSchema,collectProfileAcceptanceExport,validateProfileAcceptance,decodeProfileReceipt,type ProfileAcceptance,type ProfileAcceptanceList} from '../lib/ai-profile-acceptance';
import {aiProfileAcceptanceCopy} from '../lib/i18n/ai-profile-acceptance';
import {aiProfileCopy} from '../lib/i18n/ai-profile';
import {structuredProfileCopy} from '../lib/i18n/structured-profile';
import {PROFILE_FIELDS} from '../lib/structured-profile';
import {RequestError,errorFromResponse,requestErrorMessage} from '../lib/client-api';
import type {UiLocale} from '../lib/i18n/locale';
type Props={ownerId:string;disabled:boolean;locale:UiLocale;onConflict:()=>void};
export default function AiProfileHistoryPanel(props:Props){return <History key={JSON.stringify([props.ownerId,props.disabled])} {...props}/>;}
function History({ownerId,disabled,locale,onConflict}:Props){
 const t=aiProfileAcceptanceCopy(locale),ai=aiProfileCopy(locale),p=structuredProfileCopy(locale);
 const [items,setItems]=useState<ProfileAcceptanceList|null>(null),[record,setRecord]=useState<ProfileAcceptance|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<RequestError|'history'|'download'|null>(null);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 function cancel(){const owned=active.current;active.current=null;owned?.abort();setBusy(false);}
 async function read(id?:string){
  if(disabled||active.current)return;const owned=new AbortController();active.current=owned;setBusy(true);setError(null);setRecord(null);
  const timer=setTimeout(()=>owned.abort(),25000);
  try{
   const response=await fetch('/api/ai-profile'+(id?'?id='+encodeURIComponent(id):''),{cache:'no-store',headers:{'x-jobmatch-owner':ownerId},signal:owned.signal});
   const value:unknown=await response.json();if(active.current!==owned)return;if(owned.signal.aborted)throw Error();
   if(!response.ok)throw errorFromResponse({code:value!==null&&typeof value==='object'&&'code' in value?value.code:undefined},response.status,locale);
   if(id){const next=await validateProfileAcceptance(value,ownerId);if(next.id!==id)throw Error();if(active.current!==owned)return;if(owned.signal.aborted)throw Error();setRecord(next);}
   else{const next=ProfileAcceptanceListSchema.parse(value);if(next.ownerId!==ownerId)throw Error();setItems(next);}
  }catch(cause){if(active.current===owned){setError(cause instanceof RequestError?cause:'history');if(cause instanceof RequestError&&[401,409].includes(cause.status))onConflict();}}
  finally{clearTimeout(timer);if(active.current===owned){active.current=null;setBusy(false);}}
 }
 async function downloadJournal(){
  if(disabled||active.current)return;const owned=new AbortController();active.current=owned;setBusy(true);setError(null);
  const timer=setTimeout(()=>owned.abort(),120000);let url:string|undefined;
  async function fetchRecord(id?:string){
   const response=await fetch('/api/ai-profile'+(id?'?id='+encodeURIComponent(id):''),{cache:'no-store',headers:{'x-jobmatch-owner':ownerId},signal:owned.signal});
   const value:unknown=await response.json();if(active.current!==owned||owned.signal.aborted)throw Error();
   if(!response.ok)throw errorFromResponse({code:value!==null&&typeof value==='object'&&'code' in value?value.code:undefined},response.status,locale);
   return value;
  }
  try{
   const value=await collectProfileAcceptanceExport(ownerId,()=>fetchRecord(),id=>fetchRecord(id),owned.signal);
   if(active.current!==owned||owned.signal.aborted)return;
   url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='jobmatch-ai-profile-acceptances.json';link.click();
  }catch(cause){if(active.current===owned){setError(cause instanceof RequestError?cause:'history');if(cause instanceof RequestError&&[401,409].includes(cause.status))onConflict();}}
  finally{clearTimeout(timer);if(url){const ownedUrl=url;setTimeout(()=>URL.revokeObjectURL(ownedUrl),1000);}if(active.current===owned){active.current=null;setBusy(false);}}
 }
 function download(){
  if(disabled||active.current||!record)return;let url:string|undefined;
  try{url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='jobmatch-ai-profile-acceptance.json';link.click();}
  catch{setError('download');}finally{if(url){const owned=url;setTimeout(()=>URL.revokeObjectURL(owned),1000);}}
 }
 const payload=useMemo(()=>record?decodeProfileReceipt(record.receipt):null,[record]),dateFormat=new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'});
 return <section aria-labelledby="ai-profile-history-title"><h3 id="ai-profile-history-title">{t.history}</h3><p>{t.historyHelp}</p>
 <button type="button" disabled={disabled||busy} onClick={()=>void read()}>{busy?t.loading:items?t.refreshHistory:t.openHistory}</button>{busy&&<button type="button" onClick={cancel}>{t.cancel}</button>}<button type="button" disabled={disabled||busy} onClick={()=>void downloadJournal()}>{t.downloadAll}</button>
 {error&&<p role="alert">{error instanceof RequestError?requestErrorMessage(error,locale):error==='download'?t.downloadError:t.historyError}</p>}
 {items&&items.items.length===0&&<p role="status">{t.empty}</p>}
 {items&&<ul>{items.items.map(item=><li key={item.id}><time dateTime={item.created}>{dateFormat.format(new Date(item.created))}</time>{' — '}{t.count(item.entryCount)}{' — '}<span lang="">{item.model}</span>{' '}<button type="button" disabled={disabled||busy} onClick={()=>void read(item.id)}>{t.view}</button></li>)}</ul>}
 {record&&payload&&<article className="structured-entry"><h4>{t.count(record.selectedIndices.length)}</h4><button type="button" disabled={busy} onClick={()=>{if(!active.current)setRecord(null);}}>{t.close}</button><button type="button" disabled={disabled||busy} onClick={download}>{t.download}</button>
 <dl><dt>{ai.model}</dt><dd lang="">{payload.preview.origin.model}</dd><dt>{ai.digest}</dt><dd lang="" className="ai-profile-source">{payload.preview.origin.operatorDeclaredModelDigest}</dd></dl>
 <details><summary>{t.source}</summary><blockquote lang="" className="ai-profile-source">{payload.source.sourceOriginal}</blockquote></details>
 {record.selectedIndices.map(index=>{const candidate=payload.preview.candidates[index];return <section key={index}><h5>{p.kinds[candidate.kind]}</h5><details><summary>{ai.context}</summary><blockquote lang="" className="ai-profile-source">{candidate.context.quote}</blockquote></details><dl>{PROFILE_FIELDS.filter(name=>candidate.fields[name]).map(name=><div key={name}><dt>{p.fields[name]}</dt><dd><span lang="" className="ai-profile-source">{candidate.fields[name]!.quote}</span>{' '}<small>{p.range(candidate.fields[name]!.start,candidate.fields[name]!.end)}</small></dd></div>)}</dl></section>;})}
 </article>}
 </section>;
}
