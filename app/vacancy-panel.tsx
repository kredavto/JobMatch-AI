'use client';
import {useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {DEMO_VACANCIES,vacancyId} from '../lib/engine';
import {overviewVacancyCopy} from '../lib/i18n/overview-vacancy';
import {workspaceErrorMessage,workspaceNoticeMessage} from '../lib/i18n/workspace-feedback';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
export default function VacancyPanel({locale:requestedLocale='ru',draft,setDraft,busy,canAnalyze,onSave,onAnalyze}:{locale?:UiLocale;draft:string;setDraft:Dispatch<SetStateAction<string>>;busy:boolean;canAnalyze:boolean;onSave:()=>Promise<unknown>;onAnalyze:()=>Promise<unknown>}){
 const locale=normalizeLocale(requestedLocale),t=overviewVacancyCopy[locale].vacancy;
 const [link,setLink]=useState(''),[linkResult,setLinkResult]=useState<{id:string}|{invalid:true}|null>(null),[working,setWorking]=useState(false),pending=useRef(false),disabled=busy||working;
 async function run(action:()=>Promise<unknown>){if(busy||pending.current)return;pending.current=true;setWorking(true);try{await action();}finally{pending.current=false;setWorking(false);}}
 function validateLink(){if(!link){setLinkResult(null);return;}try{setLinkResult({id:vacancyId(link)});}catch{setLinkResult({invalid:true});}}
 return <section className="card localized-panel" lang={locale} aria-label={t.region}><h2>{t.title}</h2><p>{t.help}</p><label>{t.link}<input lang="" value={link} onChange={event=>{setLink(event.target.value);setLinkResult(null);}} onBlur={validateLink} placeholder="https://hh.ru/vacancy/123456"/></label>{linkResult&&('id' in linkResult?<p role="status" className="notice">{workspaceNoticeMessage({key:'vacancyId',id:linkResult.id},locale)}</p>:<p role="alert" className="error">{workspaceErrorMessage({kind:'copy',key:'vacancyLink'},locale)}</p>)}<h3>{t.examples}</h3><p className="muted">{t.exampleHelp}</p><div className="actions">{DEMO_VACANCIES.map(example=><button key={example.title} lang="ru" onClick={()=>setDraft(example.text)}>{example.title}</button>)}</div><label>{t.text}<textarea lang="" rows={14} value={draft} onChange={event=>setDraft(event.target.value)} maxLength={30000}/></label><div className="actions"><button disabled={disabled||!draft.trim()} onClick={()=>void run(onSave)}>{t.save}</button><button className="primary" disabled={disabled||!canAnalyze} onClick={()=>void run(onAnalyze)}>{t.analyze}</button></div><p className="muted">{t.review}</p></section>;
}
