'use client';
import {useEffect,useRef,useState} from 'react';
import StructuredProposalsPanel from './structured-proposals-panel';
import {structuredProposalCopy} from '../lib/i18n/structured-proposals';
import type {StructuredProposal} from '../lib/structured-proposals';
import {PROFILE_FIELDS,PROFILE_KINDS,sourceSelection,StructuredCommandSchema,validateStructuredProfile,type StructuredProfile,type ProfileFields,type StructuredCommand} from '../lib/structured-profile';
import StructuredVersionPanel from './structured-version-panel';
import {structuredProfileCopy} from '../lib/i18n/structured-profile';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {RequestError,errorFromResponse,requestErrorMessage} from '../lib/client-api';
type Props={ownerId:string;workspaceRevision:number;disabled:boolean;onConflict:()=>void;locale?:UiLocale};
export default function StructuredProfilePanel({ownerId,workspaceRevision,disabled,onConflict,locale:requestedLocale='ru'}:Props){
 const locale=normalizeLocale(requestedLocale),t=structuredProfileCopy(locale),proposalText=structuredProposalCopy(locale);
 const [readGeneration,setReadGeneration]=useState(0);
 const [profile,setProfile]=useState<StructuredProfile|null>(null),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false),[error,setError]=useState<''|'invalidReply'|'selectionError'|RequestError>(''),[notice,setNotice]=useState(false);
 const [kind,setKind]=useState<typeof PROFILE_KINDS[number]>('employment'),[field,setField]=useState<typeof PROFILE_FIELDS[number]>('title'),[fields,setFields]=useState<ProfileFields>({}),[resetAccepted,setResetAccepted]=useState(false);
 const [draftContext,setDraftContext]=useState<string|null>(null);
 const sourceContext=profile?JSON.stringify([ownerId,profile.source_workspace_revision,profile.source_original,profile.source_fact_ids]):null;
 const draftStale=Object.keys(fields).length>0&&draftContext!==sourceContext;
 const source=useRef<HTMLTextAreaElement>(null),controller=useRef<AbortController|null>(null),active=useRef(true),pending=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;controller.current?.abort();};},[]);
 const mismatch=!!profile&&profile.workspace_revision!==workspaceRevision;
 async function execute(command?:StructuredCommand){
  if(pending.current||busy||disabled||(command&&(blocked||mismatch||!profile)))return;
  pending.current=true;
  setBusy(true);setError('');setNotice(false);controller.current=new AbortController();
  try{
   const response=await fetch('/api/structured-profile',{method:command?'POST':'GET',cache:'no-store',headers:{'Content-Type':'application/json','x-jobmatch-owner':ownerId},signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(30000)]),...(command?{body:JSON.stringify({expectedOwnerId:ownerId,workspaceRevision,profileRevision:profile!.revision,command:StructuredCommandSchema.parse(command)})}:{})});
   const value=await response.json();if(!response.ok)throw errorFromResponse(value,response.status,locale);
   const next=validateStructuredProfile(value,ownerId,workspaceRevision);
   if(command&&next.revision!==profile!.revision+1)throw Error();
   if(!active.current)return;setProfile(next);if(!command)setReadGeneration(previous=>previous+1);setBlocked(false);setResetAccepted(false);
   if(command){setFields({});setDraftContext(null);setNotice(true);}
  }catch(cause){if(!active.current)return;setBlocked(true);if(cause instanceof RequestError&&[401,409].includes(cause.status))onConflict();setError(cause instanceof RequestError?cause:'invalidReply');}
  finally{pending.current=false;if(active.current)setBusy(false);}
 }
 function capture(){
  try{if(!source.current||!profile||draftStale)throw Error();const selected=sourceSelection(profile.source_original,source.current.selectionStart,source.current.selectionEnd);setFields(previous=>({...previous,[field]:selected}));setDraftContext(sourceContext);setError('');}catch{setError('selectionError');}
 }
 function exportProfile(){if(!profile)return;const url=URL.createObjectURL(new Blob([JSON.stringify(profile,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='jobmatch-structured-profile.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const canWrite=!!profile&&!busy&&!disabled&&!blocked&&!mismatch;
 function adopt(candidate:StructuredProposal){
  if(!profile||!profile.source_matches||!canWrite||draftStale||Object.keys(fields).length)return;
  const command=StructuredCommandSchema.safeParse({action:'add',kind:candidate.kind,fields:candidate.fields});
  if(!command.success||command.data.action!=='add')return;
  const points=Array.from(profile.source_original);
  if(Object.values(command.data.fields).some(value=>points.slice(value.start,value.end).join('')!==value.quote)){setError('selectionError');return;}
  setKind(command.data.kind);setFields(command.data.fields);setDraftContext(sourceContext);setError('');setNotice(false);
 }

 return <section lang={locale} className="card localized-panel" aria-labelledby="structured-profile-title"><h2 id="structured-profile-title">{t.title}</h2><p>{t.intro}</p>
 <button disabled={busy||disabled} onClick={()=>void execute()}>{profile?t.refresh:t.open}</button>
 {error&&<p role="alert" className="error">{error instanceof RequestError?requestErrorMessage(error,locale):t[error]} {t.noRetry}</p>}{notice&&<p role="status" className="notice">{t.saved}</p>}{mismatch&&<p role="alert">{t.mismatch}</p>}
 {profile&&<><p>{t.stats(profile.revision,profile.source_workspace_revision,profile.entries.length)}</p>
 <button disabled={busy||disabled||blocked||mismatch} onClick={exportProfile}>{t.download}</button>
 {!profile.source_matches&&<p role="alert" className="notice">{t.stale}</p>}
 <label>{t.source}<textarea ref={source} lang="" readOnly rows={8} value={profile.source_original}/></label>
 {profile.source_matches&&<StructuredProposalsPanel key={JSON.stringify([sourceContext,profile.revision,profile.workspace_revision,profile.source_matches,readGeneration])} source={profile.source_original} locale={locale} disabled={!canWrite||draftStale||profile.entries.length>=50} hasDraft={Object.keys(fields).length>0} onAdopt={adopt}/>}
 {draftStale&&<p role="alert">{proposalText.stale}</p>}
 {Object.keys(fields).length>0&&<button type="button" disabled={busy} onClick={()=>{setFields({});setDraftContext(null);}}>{proposalText.clear}</button>}
 {profile.source_matches&&<fieldset disabled={!canWrite||draftStale}><legend>{t.addLegend}</legend>
 <label>{t.kind}<select value={kind} onChange={event=>{setKind(event.target.value as typeof kind);setFields({});setDraftContext(null);}}>{PROFILE_KINDS.map(item=><option key={item} value={item}>{t.kinds[item]}</option>)}</select></label>
 <label>{t.field}<select value={field} onChange={event=>setField(event.target.value as typeof field)}>{PROFILE_FIELDS.filter(item=>item!=='credential'||kind==='certification').map(item=><option key={item} value={item}>{t.fields[item]}</option>)}</select></label>
 <button type="button" onClick={capture}>{t.capture}</button>
 <dl>{PROFILE_FIELDS.map(name=>fields[name]&&<div key={name}><dt>{t.fields[name]}</dt><dd><span lang="">{fields[name]!.quote}</span> <small>{t.shortRange(fields[name]!.start,fields[name]!.end)}</small><button type="button" onClick={()=>setFields(previous=>{const next={...previous};delete next[name];return next;})}>{t.removeField(t.fields[name])}</button></dd></div>)}</dl>
 <p>{t.fieldHint}</p>
 <button disabled={draftStale||!StructuredCommandSchema.safeParse({action:'add',kind,fields}).success} onClick={()=>void execute({action:'add',kind,fields})}>{t.add}</button></fieldset>}
 {profile.entries.map(entry=><article key={entry.id} className="structured-entry"><h3>{t.kinds[entry.kind]}</h3><dl>{PROFILE_FIELDS.map(name=>entry.fields[name]&&<div key={name}><dt>{t.fields[name]}</dt><dd><span lang="">{entry.fields[name]!.quote}</span> <small>{t.range(entry.fields[name]!.start,entry.fields[name]!.end)}</small></dd></div>)}</dl><label className="check"><input type="checkbox" checked={entry.confirmed} disabled={!canWrite||(!profile.source_matches&&!entry.confirmed)} onChange={event=>void execute({action:'confirm',id:entry.id,confirmed:event.target.checked})}/>{t.confirm}</label><button disabled={!canWrite} onClick={()=>void execute({action:'delete',id:entry.id})}>{t.delete}</button></article>)}
 <StructuredVersionPanel key={`${ownerId}:${profile.revision}:${profile.workspace_revision}:${readGeneration}`} locale={locale} profile={profile} disabled={busy||disabled||blocked||mismatch} onConflict={onConflict}/>
 <details><summary>{t.resetTitle}</summary><p>{t.resetHint}</p><label className="check"><input type="checkbox" checked={resetAccepted} disabled={!canWrite} onChange={event=>setResetAccepted(event.target.checked)}/>{t.resetAccept}</label><button disabled={!canWrite||!resetAccepted} onClick={()=>void execute({action:'reset',confirm:'RESET_STRUCTURED_PROFILE'})}>{t.reset}</button></details></>}
 </section>;
}
