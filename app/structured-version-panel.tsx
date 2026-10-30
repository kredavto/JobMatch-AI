'use client';
import {useEffect,useRef,useState} from 'react';
import {structuredVersionCopy} from '../lib/i18n/structured-version';
import {formatInstant} from '../lib/i18n/dates';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {RequestError,errorFromResponse,requestErrorMessage} from '../lib/client-api';
import type {StructuredProfile} from '../lib/structured-profile';
import {TEMPLATE_VERSION,ENGLISH_TEMPLATE_VERSION,type TemplateVersion,contextIssue,VersionListSchema,validateStructuredPreview,validateStructuredVersion,type StructuredPreview,type StructuredVersion,type VersionList} from '../lib/structured-version';
type Props={profile:StructuredProfile;disabled:boolean;onConflict:()=>void;locale?:UiLocale};
export default function StructuredVersionPanel({profile,disabled,onConflict,locale:requestedLocale='ru'}:Props){
 const locale=normalizeLocale(requestedLocale),t=structuredVersionCopy(locale);
 const [selected,setSelected]=useState<string[]>([]),[preview,setPreview]=useState<StructuredPreview|null>(null),[accepted,setAccepted]=useState(false),[saved,setSaved]=useState<StructuredVersion|null>(null),[list,setList]=useState<VersionList|null>(null),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false),[error,setError]=useState<''|'invalidReply'|RequestError>('');
 const [template,setTemplate]=useState<TemplateVersion>(TEMPLATE_VERSION);
 const pending=useRef(false),active=useRef(true),controller=useRef<AbortController|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;controller.current?.abort();};},[]);
 const eligible=profile.entries.filter(entry=>entry.confirmed&&!contextIssue(profile,entry));
 const canWrite=!disabled&&!busy&&!blocked&&profile.source_matches;
 async function request(action:'preview'|'save'|'list'|'detail',id?:string){
  const write=action==='preview'||action==='save';
  if(pending.current||disabled||(write&&(!canWrite||!selected.length))||(action==='save'&&(!preview||!accepted)))return;
  pending.current=true;setBusy(true);setError('');controller.current=new AbortController();
  try{
   const response=await fetch('/api/structured-versions'+(action==='detail'?'?id='+id:''),{method:write?'POST':'GET',cache:'no-store',headers:{'Content-Type':'application/json','x-jobmatch-owner':profile.ownerId},signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(30000)]),...(write?{body:JSON.stringify({action,expectedOwnerId:profile.ownerId,workspaceRevision:profile.workspace_revision,profileRevision:profile.revision,entryIds:selected,...(template===ENGLISH_TEMPLATE_VERSION?{templateVersion:template}:{}),...(action==='save'?{previewHash:preview!.preview_hash,accept:'SAVE_LITERAL_VERSION'}:{})})}:{})});
   const value=await response.json();if(!response.ok)throw errorFromResponse(value,response.status,locale);
   if(action==='preview'){
    const next=await validateStructuredPreview(value,profile.ownerId,profile.workspace_revision,profile.revision,selected,template);if(!active.current)return;setPreview(next);setAccepted(false);setSaved(null);
   }else if(action==='list'){
    const next=VersionListSchema.parse(value);if(next.ownerId!==profile.ownerId)throw Error();if(!active.current)return;setList(next);
   }else{
    const next=await validateStructuredVersion(value,profile.ownerId);
    const summary=action==='detail'?list?.versions.find(row=>row.id===id):undefined;
    if(summary&&(next.template_version!==summary.template_version||next.preview_hash!==summary.preview_hash))throw Error();
    if((action==='save'&&(next.template_version!==preview!.template_version||next.preview_hash!==preview!.preview_hash||next.snapshot.revision!==profile.revision||next.snapshot.workspace_revision!==profile.workspace_revision))||(action==='detail'&&next.id!==id))throw Error();
    if(!active.current)return;setSaved(next);if(action==='save'){setPreview(null);setSelected([]);setAccepted(false);setList(null);}
   }
  }catch(cause){if(!active.current)return;if(write)setBlocked(true);if(cause instanceof RequestError&&[401,409].includes(cause.status))onConflict();setError(cause instanceof RequestError?cause:'invalidReply');}
  finally{pending.current=false;if(active.current)setBusy(false);}
 }
 function download(value:StructuredVersion,format:'json'|'txt'){
  const url=URL.createObjectURL(new Blob([format==='json'?JSON.stringify(value,null,2):value.text],{type:format==='json'?'application/json':'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='jobmatch-structured-version.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section lang={locale} className="localized-panel" aria-labelledby="structured-versions-title"><h3 id="structured-versions-title">{t.title}</h3><p>{t.intro}</p><p>{t.templateLanguage}</p>
 {error&&<p role="alert" className="error">{error instanceof RequestError?requestErrorMessage(error,locale):t[error]}</p>}{blocked&&<p role="alert">{t.blocked}</p>}
 <fieldset disabled={!canWrite}><legend>{t.selectLegend}</legend>{eligible.length?eligible.map(entry=><label className="check" key={entry.id}><input type="checkbox" checked={selected.includes(entry.id)} onChange={event=>{setSelected(previous=>event.target.checked?[...previous,entry.id]:previous.filter(id=>id!==entry.id));setPreview(null);setAccepted(false);}}/>{t.include}<span lang="">{entry.fields.title?.quote||entry.fields.description?.quote}</span></label>):<p>{t.empty}</p>}
 <label>{t.templateLabel}<select value={template} disabled={!canWrite} onChange={event=>{setTemplate(event.target.value as TemplateVersion);setPreview(null);setAccepted(false);}}><option value={TEMPLATE_VERSION}>{t.russianTemplate}</option><option value={ENGLISH_TEMPLATE_VERSION}>{t.englishTemplate}</option></select></label>
 <p>{t.guard}</p>
 {profile.entries.filter(entry=>entry.confirmed&&contextIssue(profile,entry)).map(entry=><p key={entry.id}>{t.risky(entry.fields.title?.quote||entry.fields.description?.quote||'')}</p>)}
 <button disabled={!canWrite||!selected.length} onClick={()=>void request('preview')}>{t.preview}</button></fieldset>
 {preview&&<article><h4>{t.previewTitle}</h4><pre className="output" lang="">{preview.text}</pre><p>{t.provenance(preview.template_version,preview.snapshot.source_workspace_revision,preview.snapshot.revision,preview.snapshot.entries.length)}</p><label className="check"><input type="checkbox" checked={accepted} disabled={!canWrite} onChange={event=>setAccepted(event.target.checked)}/>{t.accept}</label><button disabled={!canWrite||!accepted} onClick={()=>void request('save')}>{t.save}</button><button disabled={busy} onClick={()=>{setPreview(null);setAccepted(false);}}>{t.cancel}</button></article>}
 <button disabled={busy||disabled} onClick={()=>void request('list')}>{t.history}</button>
 {list&&<><p>{t.historyCount(list.versions.length)}</p>{list.versions.map(row=><p key={row.id}><time dateTime={row.created}>{formatInstant(row.created,locale)}</time> · {t.summary(row.profile_revision,row.text_length)} <button disabled={busy||disabled} onClick={()=>void request('detail',row.id)}>{t.open(row.id)}</button></p>)}</>}
 {saved&&<article><h4>{t.savedTitle}</h4><p>{t.id} {saved.id}. {t.created} <time dateTime={saved.created}>{formatInstant(saved.created,locale)}</time>. {t.savedMeta(saved.template_version)}</p><pre className="output" lang="">{saved.text}</pre><details><summary>{t.snapshot}</summary><pre className="output" lang="">{JSON.stringify(saved.snapshot,null,2)}</pre></details><button disabled={busy||disabled} onClick={()=>download(saved,'txt')}>{t.downloadText}</button><button disabled={busy||disabled} onClick={()=>download(saved,'json')}>{t.downloadJson}</button></article>}
 </section>;
}
