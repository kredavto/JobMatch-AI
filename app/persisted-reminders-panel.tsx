'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import ForegroundReminders from './foreground-reminders';
import {sameJson} from '../lib/application-write-response';
import type {Application} from '../lib/db';
import {knownSettingsOwner} from '../lib/settings-export';
import {RequestError,requestJson} from '../lib/client-api';
import {RemindersStateSchema,validateReminderWrite,type ReminderCommand,type RemindersState,type PersistedReminder} from '../lib/persisted-reminders';
import {calendarTimeOptions,formatCalendarOffset} from '../lib/calendar-time';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {remindersCopy} from '../lib/i18n/reminders';
import {reminderForm,reminderProposal,reminderDraftStale,acknowledgeReminderDraft,type ReminderDraft,type ReminderForm} from './reminder-draft';
type ErrorKey=keyof typeof remindersCopy.ru.errors;
type Notice='read'|'saved'|'newer'|'downloaded';
type Props={ownerId?:string;workspaceRevision:number;applications:Application[];busy:boolean;paused:boolean;visible:boolean;locale:UiLocale;onPending:(value:boolean)=>void;onReloadWorkspace:()=>Promise<unknown>;onFailure:(status:number)=>void};
export default function PersistedRemindersPanel({ownerId,workspaceRevision,applications,busy,paused,visible,locale:requestedLocale,onPending,onReloadWorkspace,onFailure}:Props){
 const locale=normalizeLocale(requestedLocale),t=remindersCopy[locale],known=knownSettingsOwner(ownerId);
 const [state,setState]=useState<RemindersState|null>(null),[draft,setDraft]=useState<ReminderDraft|null>(null),[pending,setPending]=useState(false),[needsRead,setNeedsRead]=useState(false),[error,setError]=useState<ErrorKey|null>(null),[notice,setNotice]=useState<Notice|null>(null),[deleteId,setDeleteId]=useState<string|null>(null);
 const stored=useRef<RemindersState|null>(null),active=useRef(true),requestRef=useRef<AbortController|null>(null),session=useRef(0),epoch=useRef(0),pendingCallback=useRef(onPending),context=useRef({ownerId,workspaceRevision});
 useLayoutEffect(()=>{pendingCallback.current=onPending;context.current={ownerId,workspaceRevision};},[onPending,ownerId,workspaceRevision]);
 const heading=useRef<HTMLHeadingElement>(null),newButton=useRef<HTMLButtonElement>(null),firstField=useRef<HTMLSelectElement>(null),editing=useRef<string|null>(null),restoreFocus=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;requestRef.current?.abort();pendingCallback.current(false);};},[]);
 const draftId=draft?.id??null;
 useEffect(()=>{if(draftId&&draftId!==editing.current&&visible)firstField.current?.focus();if(!draftId&&editing.current)restoreFocus.current=true;if(!draftId&&!busy&&visible&&restoreFocus.current){(newButton.current?.disabled?heading.current:newButton.current)?.focus();restoreFocus.current=false;}editing.current=draftId;},[draftId,busy,visible]);
 const stale=!!draft&&!!state&&reminderDraftStale(draft,state,workspaceRevision),locked=busy||paused||needsRead||!known;
 const localStart=draft?.form.localStart,zone=draft?.form.zone;
 const time=useMemo(()=>{if(!localStart||!zone)return [];try{return calendarTimeOptions(localStart,zone);}catch{return [];}},[localStart,zone]);
 const proposal=useMemo(()=>draft?reminderProposal(draft):null,[draft]);
 function fail(cause:unknown,write:boolean){
  const status=cause instanceof RequestError?cause.status:502;
  setError(status===401?'auth':status===409?'conflict':status===429?'rate':status===503?'unavailable':write?'write':'read');
  if(status===0||status===401||status===409||status>=500){setNeedsRead(true);onFailure(status);}
 }
 function start(write=false){if(requestRef.current||busy||!known)return null;const controller=new AbortController();requestRef.current=controller;setPending(write);onPending(true);setError(null);setNotice(null);return controller;}
 function finish(controller:AbortController){controller.abort();if(requestRef.current===controller)requestRef.current=null;if(active.current){setPending(false);onPending(false);}}
 async function load(){
  const controller=start();if(!controller)return;const owner=ownerId;
  try{if(needsRead||paused)await onReloadWorkspace();if(!active.current||context.current.ownerId!==owner)return;
   const raw=await requestJson<unknown>('/api/reminders?expectedOwnerId='+encodeURIComponent(owner!),{headers:{'x-jobmatch-owner':owner!},signal:controller.signal},locale);
   const next=RemindersStateSchema.parse(raw);if(next.ownerId!==owner||context.current.ownerId!==owner)throw new RequestError('',409);
   if(!active.current)return;stored.current=next;setState(next);setNeedsRead(false);setDeleteId(null);setNotice('read');
  }catch(e){if(active.current)fail(e,false);}finally{finish(controller);}
 }
 async function write(command:ReminderCommand){
  if(locked||!state)return null;const before=state,owner=ownerId,revision=workspaceRevision,controller=start(true);if(!controller)return null;
  try{const raw=await requestJson<unknown>('/api/reminders',{method:'POST',headers:{'Content-Type':'application/json','x-jobmatch-owner':owner!},signal:controller.signal,body:JSON.stringify({expectedOwnerId:owner,workspaceRevision:revision,revision:before.revision,consentToStore:true,command})},locale);
   if(!active.current)return null;if(context.current.ownerId!==owner||context.current.workspaceRevision!==revision)throw new RequestError('',409);
   const after=validateReminderWrite(raw,before,command);stored.current=after;setState(after);setDeleteId(null);setNotice('saved');if(visible)heading.current?.focus();return after;
  }catch(e){if(active.current)fail(e,true);return null;}finally{finish(controller);}
 }
 function open(row?:PersistedReminder){
  if(locked||!state)return;session.current++;epoch.current++;
  let zone='UTC';try{zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch{}
  setDraft({id:row?.id??crypto.randomUUID(),base:row??null,workspaceRevision,form:row?reminderForm(row):{applicationId:'',kind:'interview',localStart:'',zone,offset:'',minutes:30,description:''},consent:false});setError(null);setNotice(null);
 }
 function edit(patch:Partial<ReminderForm>){epoch.current++;setDraft(current=>current?{...current,form:{...current.form,...patch}}:current);setError(null);setNotice(null);}
 function discard(){session.current++;epoch.current++;setDraft(null);setError(null);setNotice(null);}
 async function save(){
  if(!draft||!state||!draft.consent||stale||!proposal||!applications.some(a=>a.id===draft.form.applicationId)){setError('invalid');return;}
  const submitted=draft,submittedEpoch=epoch.current,submittedSession=session.current;
  const after=await write(proposal);if(!after)return;const record=after.items.find(r=>r.id===submitted.id);if(!record)return;
  const sameSession=session.current===submittedSession,unchanged=epoch.current===submittedEpoch;
  setDraft(current=>acknowledgeReminderDraft(current,submitted,record,unchanged,sameSession));if(sameSession&&!unchanged)setNotice('newer');
 }
 function download(){
  if(!state||locked)return;let url:string|undefined;
  try{const checked=RemindersStateSchema.parse(state);if(checked.ownerId!==context.current.ownerId)throw Error();url=URL.createObjectURL(new Blob([JSON.stringify(checked,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='jobmatch-reminders.json';a.click();setNotice('downloaded');setError(null);}
  catch{setError('download');}finally{if(url){const created=url;setTimeout(()=>URL.revokeObjectURL(created),1000);}}
 }
 return <section id="saved-reminders" className="card" lang={locale} aria-labelledby="saved-reminders-title">
  <h2 id="saved-reminders-title" ref={heading} tabIndex={-1}>{t.title}</h2><p>{t.intro}</p><p>{t.loadHelp}</p>
  {!known&&<p role="alert">{t.errors.owner}</p>}{error&&<p role="alert" data-reminder-error="">{t.errors[error]}</p>}{notice&&<p role="status" data-reminder-notice="">{t[notice]}</p>}
  <button id="saved-reminders-load" disabled={busy||!known} onClick={()=>void load()}>{needsRead||paused?t.reload:t.load}</button>
  {state?<><button id="saved-reminders-new" ref={newButton} disabled={locked||state.items.length>=100} onClick={()=>open()}>{t.new}</button><button id="saved-reminders-download" disabled={locked} onClick={download}>{t.download}</button>{state.items.length>=100&&<p>{t.limit}</p>}{!state.items.length&&<p>{t.empty}</p>}</>:<p>{t.unloaded}</p>}
  <ForegroundReminders ownerId={ownerId} state={state} busy={busy} paused={paused||needsRead} locale={locale} available={()=>active.current&&!requestRef.current&&!needsRead&&!paused&&!busy&&known} current={()=>stored.current} onFresh={next=>{const previous=stored.current;if(!active.current||requestRef.current||next.ownerId!==ownerId||previous&&(next.revision<previous.revision||next.revision===previous.revision&&!sameJson(next,previous)))throw new RequestError('',409);stored.current=next;setState(next);}} onFailure={status=>fail(new RequestError('',status),false)}/>
  {draft&&<fieldset id="saved-reminder-editor"><legend>{draft.base?t.edit:t.new}</legend><p>{t.draftHelp}</p>
   <label htmlFor="saved-reminder-application">{t.application}</label><select ref={firstField} id="saved-reminder-application" value={draft.form.applicationId} onChange={e=>edit({applicationId:e.target.value})}><option value="">{t.chooseApplication}</option>{!applications.some(a=>a.id===draft.form.applicationId)&&draft.form.applicationId&&<option value={draft.form.applicationId}>{t.missingApplication}</option>}{applications.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select>
   <label htmlFor="saved-reminder-kind">{t.kind}</label><select id="saved-reminder-kind" value={draft.form.kind} onChange={e=>edit({kind:e.target.value as ReminderForm['kind']})}>{(['interview','follow-up'] as const).map(k=><option key={k} value={k}>{t.kinds[k]}</option>)}</select>
   <label htmlFor="saved-reminder-zone">{t.zone}</label><input id="saved-reminder-zone" value={draft.form.zone} maxLength={100} onChange={e=>edit({zone:e.target.value,offset:''})}/>
   <label htmlFor="saved-reminder-when">{t.when}</label><input id="saved-reminder-when" type="datetime-local" min="2000-01-01T00:00" max="2099-12-31T23:59" value={draft.form.localStart} onChange={e=>edit({localStart:e.target.value,offset:''})}/>
   {time.length>1&&<><p>{t.ambiguous}</p><label htmlFor="saved-reminder-offset">{t.offset}</label><select id="saved-reminder-offset" value={draft.form.offset} onChange={e=>edit({offset:e.target.value})}><option value="">{t.chooseOffset}</option>{time.map(c=><option key={c.dueAt} value={String(c.offsetMinutes)}>{formatCalendarOffset(c.offsetMinutes)} · {c.dueAt}</option>)}</select></>}
   {!!localStart&&!!zone&&!time.length&&<p role="alert" data-reminder-time-error="">{t.errors.time}</p>}
   <p>{t.timeHelp}</p>{draft.base&&<p>{t.savedUtc} <span lang="">{draft.base.dueAt}</span></p>}{proposal&&'dueAt' in proposal&&<p data-reminder-preview="">{t.preview} <span lang="">{proposal.dueAt}</span></p>}
   <label htmlFor="saved-reminder-minutes">{t.duration}</label><select id="saved-reminder-minutes" value={draft.form.minutes} onChange={e=>edit({minutes:Number(e.target.value) as ReminderForm['minutes']})}>{([15,30,60,90] as const).map(n=><option key={n} value={n}>{t.minute(n)}</option>)}</select>
   <label htmlFor="saved-reminder-description">{t.description}</label><textarea id="saved-reminder-description" lang="" value={draft.form.description} maxLength={6000} onChange={e=>edit({description:e.target.value})}/><p>{t.descriptionHelp}</p><p>{t.privacy}</p>
   <label className="check"><input id="saved-reminder-consent" type="checkbox" checked={draft.consent} onChange={e=>{epoch.current++;const consent=e.target.checked;setDraft(current=>current?{...current,consent}:current);}}/>{t.consent}</label>
   {stale&&<><p role="alert" data-reminder-conflict="">{t.stale}</p><details><summary>{t.saved}</summary><pre lang="">{JSON.stringify(state?.items.find(r=>r.id===draft.id)??null,null,2)}</pre></details><button id="saved-reminder-compare" disabled={locked} onClick={()=>{if(!state)return;epoch.current++;setDraft(current=>current?{...current,base:state.items.find(r=>r.id===current.id)??null,workspaceRevision}:current);}}>{t.compare}</button></>}
   <button id="saved-reminder-save" disabled={locked||stale||!draft.consent||!proposal||!applications.some(a=>a.id===draft.form.applicationId)} onClick={()=>void save()}>{t.save}</button><button id="saved-reminder-discard" onClick={discard}>{t.discard}</button>{pending&&<p>{t.pending}</p>}
  </fieldset>}
  {state?.items.map(row=><article className="application" key={row.id} data-reminder-id={row.id}><h3>{t.kinds[row.kind]} · <span lang="">{applications.find(a=>a.id===row.applicationId)?.title??t.missingApplication}</span></h3><p>{t.statuses[row.status]}</p><p lang="" style={{overflowWrap:'anywhere'}}>{row.localStart} · {row.zone} · {formatCalendarOffset(row.offsetMinutes)} · {row.dueAt}</p><pre lang="" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.description}</pre>
   <button data-action="edit-reminder" disabled={locked} onClick={()=>open(row)}>{t.edit}</button>{row.status==='scheduled'&&<><button data-action="complete-reminder" disabled={locked} onClick={()=>void write({action:'complete',id:row.id})}>{t.complete}</button><button data-action="cancel-reminder" disabled={locked} onClick={()=>void write({action:'cancel',id:row.id})}>{t.cancel}</button></>}
   {deleteId===row.id?<><p>{t.deleteHelp}</p><button data-action="confirm-delete-reminder" disabled={locked} onClick={()=>void write({action:'delete',id:row.id})}>{t.confirmDelete}</button><button disabled={busy} onClick={()=>setDeleteId(null)}>{t.keep}</button></>:<button data-action="delete-reminder" disabled={locked} onClick={()=>setDeleteId(row.id)}>{t.remove}</button>}
  </article>)}
 </section>;
}
