'use client';
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {requestJson,RequestError} from '../lib/client-api';
import {knownSettingsOwner} from '../lib/settings-export';
import type {RemindersState} from '../lib/persisted-reminders';
import {FOREGROUND_INTERVAL,ForegroundReminderWindow} from '../lib/foreground-reminders';
import {foregroundRemindersCopy} from '../lib/i18n/foreground-reminders';
import type {UiLocale} from '../lib/i18n/locale';
type Status='off'|'enabled'|'pending'|'denied'|'unsupported'|'failed'|'paused';
type Props={ownerId?:string;state:RemindersState|null;busy:boolean;paused:boolean;locale:UiLocale;available:()=>boolean;current:()=>RemindersState|null;onFresh:(state:RemindersState)=>void;onFailure:(status:number)=>void};
export default function ForegroundReminders(props:Props){
 const t=foregroundRemindersCopy[props.locale],known=knownSettingsOwner(props.ownerId),[consent,setConsent]=useState(false),[enabled,setEnabled]=useState(false),[status,setStatus]=useState<Status>('off'),[checking,setChecking]=useState(false),[requested,setRequested]=useState(0);
 const latest=useRef(props),live=useRef(true),generation=useRef(0),opted=useRef(false),engine=useRef<ForegroundReminderWindow|null>(null),controller=useRef<AbortController|null>(null),reading=useRef(false),shown=useRef<{value:Notification;keys:string[]}|null>(null),tag=useRef('');
 useLayoutEffect(()=>{latest.current=props;},[props]);
 const close=useCallback(()=>{const n=shown.current;shown.current=null;try{n?.value.close();}catch{}},[]);
 const stop=useCallback((next:Status='off')=>{generation.current++;opted.current=false;controller.current?.abort();controller.current=null;close();if(live.current){setEnabled(false);setChecking(false);setStatus(next);}},[close]);
 useLayoutEffect(()=>{live.current=true;return()=>{live.current=false;stop();};},[stop]);
 const valid=useCallback((version:number)=>{const p=latest.current;return live.current&&opted.current&&generation.current===version&&knownSettingsOwner(p.ownerId)&&!p.busy&&!p.paused&&p.available()&&document.visibilityState==='visible';},[]);
 const check=useCallback(async()=>{
  const version=generation.current,p=latest.current,e=engine.current;
  if(!e||reading.current||!valid(version))return;
  if(typeof Notification!=='function'||Notification.permission!=='granted'){stop('denied');return;}
  const abort=new AbortController();controller.current=abort;reading.current=true;setChecking(true);
  try{
   let state:RemindersState;
   try{const raw=await requestJson<unknown>('/api/reminders?expectedOwnerId='+encodeURIComponent(p.ownerId!),{headers:{'x-jobmatch-owner':p.ownerId!},signal:abort.signal},p.locale);if(!valid(version))return;state=e.read(raw,latest.current.current());latest.current.onFresh(state);}
   catch(error){if(valid(version)){stop('failed');latest.current.onFailure(error instanceof RequestError?error.status:502);}return;}
   if(!valid(version)||Notification.permission!=='granted')return;
   const current=e.currentKeys(state);if(shown.current&&!shown.current.keys.some(key=>current.has(key)))close();
   const now=Date.now(),due=e.due(state,now);if(!due.length)return;
   const copy=foregroundRemindersCopy[latest.current.locale];
   // A constructor request is not a receipt of physical device delivery. No private fields enter the OS payload.
   close();
   const notification=new Notification(copy.notificationTitle,{body:copy.notificationBody,tag:tag.current,lang:latest.current.locale});
   shown.current={value:notification,keys:due.map(r=>r.key)};e.attempted(due,now);setRequested(n=>n+1);
   notification.onclick=()=>{try{window.focus();}catch{}};
   notification.onerror=()=>{if(live.current&&generation.current===version)stop('failed');};
  }catch{if(valid(version))stop('failed');}
  finally{if(controller.current===abort)controller.current=null;reading.current=false;if(live.current&&generation.current===version)setChecking(false);}
 },[valid,stop,close]);
 async function enable(){
  const p=latest.current;if(!consent||!p.state||!p.available()||p.busy||p.paused||!knownSettingsOwner(p.ownerId))return;
  if(!window.isSecureContext||typeof Notification!=='function'||typeof Notification.requestPermission!=='function'){setStatus('unsupported');return;}
  const version=++generation.current;setStatus('pending');
  try{
   const permission=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;
   if(!live.current||version!==generation.current||latest.current.ownerId!==p.ownerId)return;
   if(permission!=='granted'){setStatus('denied');return;}
   if(!latest.current.available()||latest.current.paused||latest.current.busy){setStatus('paused');return;}
   engine.current=new ForegroundReminderWindow(p.ownerId,Date.now());tag.current='jobmatch-reminders-'+crypto.randomUUID();opted.current=true;setEnabled(true);setStatus('enabled');
  }catch{if(live.current&&generation.current===version)setStatus('failed');}
 }
 useEffect(()=>{
  if(props.paused){void Promise.resolve().then(()=>{if(live.current&&latest.current.paused)stop('paused');});return;}
  if(!enabled||props.busy)return;
  let active=true;const tick=()=>{if(active)void check();};void Promise.resolve().then(tick);
  const timer=setInterval(tick,FOREGROUND_INTERVAL),visibility=()=>{if(document.visibilityState==='visible')tick();else controller.current?.abort();},hide=()=>stop();
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',hide);
  return()=>{active=false;clearInterval(timer);controller.current?.abort();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);};
 },[enabled,props.busy,props.paused,check,stop]);
 useEffect(()=>{const e=engine.current,s=props.state;if(e&&s&&shown.current){const keys=e.currentKeys(s);if(!shown.current.keys.some(key=>keys.has(key)))close();}},[props.state,close]);
 return <section id="foreground-reminders" aria-labelledby="foreground-reminders-title"><h3 id="foreground-reminders-title">{t.title}</h3><p>{t.help}</p><p>{t.privacy}</p>
  <label className="check"><input id="foreground-reminders-consent" type="checkbox" checked={consent} onChange={event=>{const checked=event.target.checked;setConsent(checked);if(!checked)stop();}}/>{t.consent}</label>
  <button id="foreground-reminders-enable" disabled={enabled||status==='pending'||!consent||!known||!props.state||props.busy||props.paused} onClick={()=>void enable()}>{t.enable}</button>
  <button id="foreground-reminders-stop" disabled={!enabled&&status!=='pending'} onClick={()=>stop()}>{t.disable}</button>
  <button id="foreground-reminders-check" disabled={!enabled||checking||props.busy||props.paused} onClick={()=>void check()}>{t.check}</button>
  <p role="status" data-foreground-status={status}>{t[status]}</p><p data-foreground-requests="">{t.requested(requested)}</p><p>{t.limits}</p>
 </section>;
}
