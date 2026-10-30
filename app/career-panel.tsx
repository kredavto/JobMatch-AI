'use client';
import {useMemo,useState} from 'react';
import {careerPlan,careerPlanText} from '../lib/career-coach';
import type {Fact} from '../lib/engine';
import {letterCoachCopy,careerAdvice} from '../lib/i18n/letter-coach';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
export default function CareerPanel({facts,vacancy,onProfile,locale:requestedLocale='ru'}:{facts:Fact[];vacancy:string;onProfile:()=>void;locale?:UiLocale}){
 const locale=normalizeLocale(requestedLocale),t=letterCoachCopy[locale].coach;
 const items=useMemo(()=>careerPlan(facts,vacancy),[facts,vacancy]);
 const [outputLanguage,setOutputLanguage]=useState<UiLocale>(locale);
 const [filter,setFilter]=useState('all'),[downloadFailed,setDownloadFailed]=useState(false);
 const visible=items.filter(item=>filter==='all'||item.status===filter);
 function download(){if(!visible.length)return;try{const url=URL.createObjectURL(new Blob([careerPlanText(visible,outputLanguage)],{type:'text/plain;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='jobmatch-interview-plan.txt';try{anchor.click();setDownloadFailed(false);}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}catch{setDownloadFailed(true);}}
 return <section className="card localized-panel" lang={locale} aria-label={t.region}><h2>{t.title}</h2><p>{t.help}</p><p>{t.caveat}</p><label>{t.filter}<select aria-label={t.filter} value={filter} onChange={event=>{setFilter(event.target.value);setDownloadFailed(false);}}><option value="all">{t.all}</option><option value="unconfirmed">{t.unconfirmed}</option><option value="supported">{t.supported}</option></select></label><p role="status">{t.shown}: {visible.length} {t.of} {items.length}</p>
 {!visible.length&&<p>{t.empty}</p>}
 {visible.map(item=><details key={item.id}><summary>{item.must?t.mandatory+' · ':''}<span lang="">{item.quote}</span> — {item.status==='supported'?t.supported:t.unconfirmed}</summary>{item.partial&&<p>{t.partial}</p>}{item.evidence.length>0&&<><h3>{t.evidence}</h3><ul>{item.evidence.map(fact=><li key={fact.id}><span lang="">{fact.text}</span><br/><small>Evidence: <span lang="">{fact.id}</span> · {t.source}: <span lang="">{fact.source}</span></small></li>)}</ul></>}<h3>{t.steps}</h3><ol>{item.steps.map(step=>{const copy=careerAdvice(step,locale);return <li key={step} lang={copy.catalogued?locale:''}>{copy.text}</li>;})}</ol><h3>{t.questions}</h3><ul>{item.questions.map(question=>{const copy=careerAdvice(question,locale);return <li key={question} lang={copy.catalogued?locale:''}>{copy.text}</li>;})}</ul></details>)}
 {downloadFailed&&<p role="alert">{t.downloadError}</p>}<p className="muted">{t.template}</p><label>{t.outputLanguage}<select aria-label={t.outputLanguage} value={outputLanguage} onChange={event=>{setOutputLanguage(normalizeLocale(event.target.value));setDownloadFailed(false);}}><option value="ru" lang="ru">Русский</option><option value="en" lang="en">English</option></select></label><p className="muted">{t.languageHelp}</p><div className="actions"><button disabled={!visible.length} onClick={download}>{t.download}</button><button onClick={onProfile}>{t.profile}</button></div><p className="muted">{t.exportHelp}</p></section>;
}
