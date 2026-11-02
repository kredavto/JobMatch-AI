'use client';
import {useMemo,useState} from 'react';
import {careerPlan,careerPlanText} from '../lib/career-coach';
import type {Fact} from '../lib/engine';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {careerCopy,careerAdvice} from '../lib/i18n/career';
function Advice({value,locale}:{value:string;locale:UiLocale}){const result=careerAdvice(value,locale);return <li lang={result.catalogued?locale:''}>{result.text}</li>;}
export default function CareerPanel({facts,vacancy,onProfile,locale:requestedLocale='ru'}:{facts:Fact[];vacancy:string;onProfile:()=>void;locale?:UiLocale}){
 const language=normalizeLocale(requestedLocale),t=careerCopy[language];
 const items=useMemo(()=>careerPlan(facts,vacancy),[facts,vacancy]);
 const [filter,setFilter]=useState('all'),[downloadFailed,setDownloadFailed]=useState(false);
 const visible=items.filter(i=>filter==='all'||i.status===filter);
 function download(){if(!visible.length)return;setDownloadFailed(false);try{const url=URL.createObjectURL(new Blob([careerPlanText(visible)],{type:'text/plain;charset=utf-8'}));try{const a=document.createElement('a');a.href=url;a.download='jobmatch-interview-plan.txt';a.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}catch{setDownloadFailed(true);}}
 return <section id="career-plan" className="card" lang={language} aria-label={t.region}><h2>{t.title}</h2><p>{t.help}</p><p>{t.caveat}</p><label htmlFor="career-requirement-filter">{t.filter}</label><select id="career-requirement-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t.all}</option><option value="unconfirmed">{t.unconfirmed}</option><option value="supported">{t.supported}</option></select><p role="status">{t.shown}: {visible.length} {t.of} {items.length}</p>
 {!visible.length&&<p>{t.empty}</p>}
 {visible.map(item=><details key={item.id}><summary>{item.must?t.mandatory+' · ':''}<span lang="">{item.quote}</span> — {item.status==='supported'?t.supported:t.unconfirmed}</summary>{item.partial&&<p>{t.partial}</p>}{item.evidence.length>0&&<><h3>{t.evidence}</h3><ul>{item.evidence.map(f=><li key={f.id}><span lang="">{f.text}</span><small>Evidence: <span lang="">{f.id}</span> · {t.source}: <span lang="">{f.source}</span></small></li>)}</ul></>}<h3>{t.steps}</h3><ol>{item.steps.map(s=><Advice key={s} value={s} locale={language}/>)}</ol><h3>{t.questions}</h3><ul>{item.questions.map(q=><Advice key={q} value={q} locale={language}/>)}</ul></details>)}
 <div className="actions"><button disabled={!visible.length} onClick={download}>{t.download}</button><button onClick={onProfile}>{t.profile}</button></div>{downloadFailed&&<p role="alert">{t.downloadError}</p>}<p className="muted">{t.exportHelp}</p><p className="muted">{t.template}</p></section>;
}
