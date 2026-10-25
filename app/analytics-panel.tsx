'use client';
import AnalyticsTimeline from './analytics-timeline';
import {useState} from 'react';
import type {Application,Version} from '../lib/db';
import {applicationsCsv,filterError,previousPeriod,selectApplications,summarize,versionBreakdown,type AnalyticsFilter} from '../lib/analytics';
import {analyticsRu as t} from '../lib/i18n/analytics';
const initial:AnalyticsFilter={from:'',to:'',versionId:''};
const percent=(value:number|null)=>value===null?'—':Math.round(value)+'%';
export default function AnalyticsPanel({applications,versions}:{applications:Application[];versions:Version[]}){
 const [filter,setFilter]=useState(initial);
 const error=filterError(filter),rows=selectApplications(applications,filter),stats=summarize(rows);
 const prior=previousPeriod(filter),before=prior?summarize(selectApplications(applications,prior)):null;
 const label=(id:string)=>{if(!id)return t.unlinked;const i=versions.findIndex(v=>v.id===id);return i<0?t.unknownVersion:t.versionName+' '+(i+1);};
 function exportCsv(){const url=URL.createObjectURL(new Blob([applicationsCsv(rows,t.csvHeaders)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='jobmatch-applications.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <>
 <section className="card"><h2>{t.title}</h2><div className="compare"><label>{t.from}<input type="date" value={filter.from} onChange={e=>setFilter({...filter,from:e.target.value})}/></label><label>{t.to}<input type="date" value={filter.to} onChange={e=>setFilter({...filter,to:e.target.value})}/></label></div>
 <label htmlFor="analytics-version">{t.version}</label><select id="analytics-version" value={filter.versionId} onChange={e=>setFilter({...filter,versionId:e.target.value})}><option value="">{t.all}</option><option value="unlinked">{t.unlinked}</option>{versions.map(v=><option key={v.id} value={v.id}>{label(v.id)}</option>)}</select>
 <button onClick={()=>setFilter(initial)}>{t.reset}</button><p>{t.cohort}</p><p>{t.outcomes}</p>{error&&<p role="alert" className="error">{t[error]}</p>}</section>
 {!error&&<><div className="stats" aria-live="polite"><article className="card"><span>{t.counts}</span><strong>{stats.total}</strong></article><article className="card"><span>{t.sent}</span><strong>{stats.sent}</strong></article><article className="card"><span>{t.responseRate}</span><strong>{percent(stats.responseRate)}</strong><p>{stats.responses} / {stats.sent} · {t.responseDenominator}</p></article><article className="card"><span>{t.interviewRate}</span><strong>{percent(stats.interviewRate)}</strong><p>{stats.interviews} / {stats.sent} · {t.interviewDenominator}</p></article></div>
 {!rows.length&&<p role="status">{t.empty}</p>}
 <section className="card"><h2>{t.comparison}</h2>{prior&&before?<div className="table-wrap" tabIndex={0} role="region" aria-label={t.comparison}><table><caption className="sr-only">{t.comparison}</caption><thead><tr><th scope="col">{t.period}</th><th scope="col">{t.sent}</th><th scope="col">{t.responseRate}</th><th scope="col">{t.interviewRate}</th></tr></thead><tbody>{[{name:t.current,period:filter,data:stats},{name:t.previous,period:prior,data:before}].map(row=><tr key={row.name}><th scope="row">{row.name}{' '}<small style={{display:'block'}}>{row.period.from} — {row.period.to}</small></th><td>{row.data.sent}</td><td>{percent(row.data.responseRate)} ({row.data.responses}/{row.data.sent})</td><td>{percent(row.data.interviewRate)} ({row.data.interviews}/{row.data.sent})</td></tr>)}</tbody></table></div>:<p>{t.noComparison}</p>}</section>
 <AnalyticsTimeline applications={rows}/><section className="card"><h2>{t.breakdown}</h2><div className="table-wrap" tabIndex={0} role="region" aria-label={t.breakdown}><table><caption className="sr-only">{t.breakdown}</caption><thead><tr><th scope="col">{t.version}</th><th scope="col">{t.sent}</th><th scope="col">{t.responses}</th><th scope="col">{t.interviews}</th></tr></thead><tbody>{versionBreakdown(rows).map(row=><tr key={row.versionId}><th scope="row">{label(row.versionId)}</th><td>{row.sent}</td><td>{row.responses}</td><td>{row.interviews}</td></tr>)}</tbody></table></div><button onClick={exportCsv}>{t.export}</button></section></>}
 <section className="card"><h2>{t.definitions}</h2><p>{t.definitionText}</p><p>{t.limitation}</p></section></>;
}
