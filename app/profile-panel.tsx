'use client';
import {useRef,useState,type Dispatch,type SetStateAction} from 'react';
import type {Fact} from '../lib/engine';
import type {FactHistory} from '../lib/history-schema';
import {profileCopy} from '../lib/i18n/profile';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {formatInstant} from '../lib/i18n/dates';

export type ProfileCommand={action:'goal'|'import'|'fact';text:string}|{action:'verify';ids:string[];verified:boolean};
type Props={
 locale?:UiLocale;busy:boolean;goal:string;resume:string;fact:string;facts:Fact[];
 setGoal:Dispatch<SetStateAction<string>>;setResume:Dispatch<SetStateAction<string>>;setFact:Dispatch<SetStateAction<string>>;
 onCommand:(command:ProfileCommand)=>Promise<boolean>;onUpload:(file:File)=>Promise<void>;
 history:FactHistory[];historyLoaded:boolean;historyCursor:number|null;onHistory:(more?:boolean)=>Promise<void>;
};
function download(snapshot:FactHistory){const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='jobmatch-facts-'+snapshot.id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
/** Controlled drafts and history stay with the workspace; locale changes never remount them. */
export default function ProfilePanel({locale:requestedLocale='ru',busy,goal,resume,fact,facts,setGoal,setResume,setFact,onCommand,onUpload,history,historyLoaded,historyCursor,onHistory}:Props){
 const locale=normalizeLocale(requestedLocale),t=profileCopy[locale];
 const pending=useRef(false),[working,setWorking]=useState(false);const disabled=busy||working;
 async function run(action:()=>Promise<unknown>){if(busy||pending.current)return;pending.current=true;setWorking(true);try{await action();}finally{pending.current=false;setWorking(false);}}
 return <div className="localized-panel profile-panel" lang={locale} role="region" aria-label={t.region}>
  <section className="card"><h2>{t.goal}</h2><label>{t.goalLabel}<input lang="" value={goal} onChange={e=>setGoal(e.target.value)} placeholder={t.goalPlaceholder}/></label><button disabled={disabled} onClick={()=>void run(()=>onCommand({action:'goal',text:goal}))}>{t.saveGoal}</button><p className="muted">{t.goalHelp}</p></section>
  <section className="card"><h2>{t.original}</h2><label>{t.upload}<input type="file" accept=".txt,.docx,.pdf" disabled={disabled} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(()=>onUpload(file));}}/></label><label>{t.review}<textarea lang="" rows={12} value={resume} onChange={e=>setResume(e.target.value)} placeholder={t.resumePlaceholder}/></label><button className="primary" disabled={disabled||!resume.trim()} onClick={()=>void run(()=>onCommand({action:'import',text:resume}))}>{t.saveResume}</button><p className="muted">{t.importHelp}</p></section>
  <section className="card"><h2>{t.facts} <span className="badge">{t.confirmed(facts.filter(f=>f.verified).length)}</span></h2><p>{t.confirmationHelp}</p>{!facts.length&&<p>{t.emptyFacts}</p>}{facts.map(f=><label className="fact" key={f.id}><input type="checkbox" checked={f.verified} disabled={disabled} onChange={e=>{const verified=e.target.checked;void run(()=>onCommand({action:'verify',ids:[f.id],verified}));}}/><span><span lang="">{f.text}</span><small><span lang="">{f.id} · {f.source}</span> · {f.verified?t.verified:t.unverified}</small></span></label>)}<label>{t.factLabel}<input lang="" value={fact} onChange={e=>setFact(e.target.value)} placeholder={t.factPlaceholder}/></label><button disabled={disabled||!fact.trim()} onClick={()=>{const submitted=fact;void run(async()=>{if(await onCommand({action:'fact',text:submitted}))setFact(current=>current===submitted?'':current);});}}>{t.addFact}</button></section>
  <section className="card"><h2>{t.history}</h2><p>{t.historyHelp}</p><button disabled={disabled} onClick={()=>void run(()=>onHistory())}>{t.refresh}</button>{historyLoaded&&!history.length&&<p>{t.emptyHistory}</p>}{history.map(h=><details key={h.id}><summary>{t.revision(h.workspace_revision)} · <time dateTime={h.captured_at}>{formatInstant(h.captured_at,locale)}</time> · {h.kind==='baseline'?t.baseline:t.change}</summary>{h.facts.map(f=><p key={f.id}><span lang="">{f.text}</span><small><span lang="">{f.source}</span> · {f.verified?t.verified:t.unverified} · <span lang="">{f.id}</span></small></p>)}{!h.facts.length&&<p>{t.emptyProfile}</p>}<button onClick={()=>download(h)}>{t.download}</button></details>)}{historyCursor!==null&&<button disabled={disabled} onClick={()=>void run(()=>onHistory(true))}>{t.older}</button>}<p className="muted">{t.historyRetention}</p></section>
 </div>;
}
