'use client';
import {useMemo,useRef,useState} from 'react';
import type {Application} from '../lib/db';
import {calendarFile} from '../lib/calendar';
import {calendarTimeOptions,calendarStart,CalendarTimeFailure} from '../lib/calendar-time';
import {calendarCopy,type CalendarError} from '../lib/i18n/calendar';
import {formatUtcOffset} from '../lib/i18n/dates';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
type Kind=keyof typeof calendarCopy.ru.kinds;
export default function ApplicationReminder({applications,locale:requestedLocale='ru'}:{applications:Application[];locale?:UiLocale}){
 const locale=normalizeLocale(requestedLocale),t=calendarCopy[locale];
 const [application,setApplication]=useState(''),[kind,setKind]=useState<Kind>('Интервью'),[when,setWhen]=useState(''),[zone,setZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone),[offset,setOffset]=useState(''),[minutes,setMinutes]=useState<15|30|60|90>(30),[description,setDescription]=useState(''),[alarm,setAlarm]=useState(true),[error,setError]=useState<CalendarError|null>(null),[notice,setNotice]=useState(false);
 const uid=useRef('');const selected=applications.find(a=>a.id===application);
 const time=useMemo(()=>{if(!when)return {candidates:[],error:null};try{return {candidates:calendarTimeOptions(when,zone),error:null};}catch(e){return {candidates:[],error:e instanceof CalendarTimeFailure?e.code:'time' as const};}},[when,zone]);
 const chosen=time.candidates.length===1?time.candidates[0]:time.candidates.find(candidate=>String(candidate.offsetMinutes)===offset),preview=chosen?.dueAt;
 function changed(){uid.current='';setError(null);setNotice(false);}
 function changedTime(){setOffset('');changed();}
 function download(){
  let url:string|undefined;
  try{
   if(!selected){setError('application');return;}
   const start=calendarStart(when,zone,offset);uid.current||=crypto.randomUUID();
   const text=calendarFile({uid:uid.current,title:kind+' — '+selected.title,description,start,created:new Date(),minutes,alarm});
   url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='jobmatch-reminder.ics';anchor.click();setError(null);setNotice(true);
  }catch(e){setError(e instanceof CalendarTimeFailure?e.code:'prepare');setNotice(false);}
  finally{if(url){const createdUrl=url;setTimeout(()=>URL.revokeObjectURL(createdUrl),1000);}}
 }
 return <section className="card" aria-label={t.title}><h2>{t.title}</h2><p>{t.intro}</p>{!applications.length?<p>{t.empty}</p>:<>
  <label>{t.application}<select aria-label={t.application} value={application} onChange={e=>{setApplication(e.target.value);changed();}}><option value="">{t.chooseApplication}</option>{applications.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
  <label>{t.kind}<select aria-label={t.kind} value={kind} onChange={e=>{setKind(e.target.value as Kind);changed();}}>{(Object.keys(t.kinds) as Kind[]).map(value=><option key={value} value={value}>{t.kinds[value]}</option>)}</select></label>
  <label>{t.zone}<input value={zone} maxLength={100} onChange={e=>{setZone(e.target.value);changedTime();}}/></label><p className="muted">{t.zoneHelp}</p>
  <label>{t.when}<input type="datetime-local" min="2000-01-01T00:00" max="2099-12-31T23:59" value={when} onChange={e=>{setWhen(e.target.value);changedTime();}}/></label>
  {time.error&&<p role="alert">{t.errors[time.error]}</p>}
  {time.candidates.length>1&&<><p>{t.ambiguous}</p><label>{t.offset}<select aria-label={t.offset} value={offset} onChange={e=>{setOffset(e.target.value);changed();}}><option value="">{t.chooseOffset}</option>{time.candidates.map(candidate=><option key={candidate.dueAt} value={String(candidate.offsetMinutes)}>{formatUtcOffset(candidate.offsetMinutes)} · {candidate.dueAt}</option>)}</select></label></>}
  {preview&&<p>{t.preview} {preview}. {t.previewHelp}</p>}
  <label>{t.duration}<select aria-label={t.duration} value={minutes} onChange={e=>{setMinutes(Number(e.target.value) as 15|30|60|90);changed();}}>{[15,30,60,90].map(n=><option value={n} key={n}>{t.minute(n)}</option>)}</select></label>
  <label>{t.description}<textarea maxLength={3000} value={description} onChange={e=>{setDescription(e.target.value);changed();}}/></label>
  <label className="check"><input type="checkbox" checked={alarm} onChange={e=>{setAlarm(e.target.checked);changed();}}/>{t.alarm}</label><p className="muted">{t.privacy}</p><p className="muted">{t.template}</p>
  <button disabled={!selected||!preview} onClick={download}>{t.download}</button>
 </>}{error&&<p role="alert">{t.errors[error]}</p>}{notice&&<p role="status">{t.ready}</p>}</section>;
}
