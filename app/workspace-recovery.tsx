'use client';
import {useRef} from 'react';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {workspaceShell} from '../lib/i18n/workspace';
export function WorkspaceReauth({locale='ru',email,password,busy,onEmail,onPassword,onSubmit}:{locale?:UiLocale;email:string;password:string;busy:boolean;onEmail:(value:string)=>void;onPassword:(value:string)=>void;onSubmit:()=>Promise<unknown>}){
 const pending=useRef(false),language=normalizeLocale(locale),copy=(key:keyof typeof workspaceShell)=>workspaceShell[key][language];
 return <section className="card" lang={language} aria-label={copy('reauthRegion')}><h2>{copy('reauthTitle')}</h2><p>{copy('reauthHint')}</p><form onSubmit={event=>{event.preventDefault();if(busy||pending.current)return;pending.current=true;void Promise.resolve().then(onSubmit).finally(()=>{pending.current=false;});}}><label>{copy('originalEmail')}<input type="email" required maxLength={200} autoComplete="username" disabled={busy} value={email} onChange={event=>{if(!busy&&!pending.current)onEmail(event.target.value);}}/></label><label>{copy('reauthPassword')}<input type="password" required minLength={12} maxLength={128} autoComplete="current-password" disabled={busy} value={password} onChange={event=>{if(!busy&&!pending.current)onPassword(event.target.value);}}/></label><button className="primary" disabled={busy}>{copy('reauthSubmit')}</button></form></section>;
}
export function WorkspaceSync({locale='ru',busy,original,vacancy,goal,onReload}:{locale?:UiLocale;busy:boolean;original:string;vacancy:string;goal:string;onReload:()=>Promise<unknown>}){
 const pending=useRef(false),language=normalizeLocale(locale),copy=(key:keyof typeof workspaceShell)=>workspaceShell[key][language];
 return <section className="card" lang={language} aria-label={copy('syncRegion')}><h2>{copy('syncTitle')}</h2><p>{copy('syncHint')}</p><button disabled={busy} onClick={()=>{if(busy||pending.current)return;pending.current=true;void Promise.resolve().then(onReload).finally(()=>{pending.current=false;});}}>{copy('reload')}</button><details><summary>{copy('serverTexts')}</summary><h3>{copy('resume')}</h3><pre>{original}</pre><h3>{copy('vacancy')}</h3><pre>{vacancy}</pre><h3>{copy('goal')}</h3><pre>{goal}</pre></details></section>;
}
