'use client';
import type {Application} from '../lib/db';
import {monthlyResults,monthlyCsv} from '../lib/analytics-timeline';
import {analyticsRu,analyticsEn} from '../lib/i18n/analytics';
import {useState} from 'react';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
export default function AnalyticsTimeline({applications,locale:requestedLocale='ru'}:{applications:Application[];locale?:UiLocale}){
 const locale=normalizeLocale(requestedLocale),t=locale==='en'?analyticsEn:analyticsRu;
 const [downloadFailed,setDownloadFailed]=useState(false);
 const rows=monthlyResults(applications);
 function download(){if(!rows.length)return;try{const url=URL.createObjectURL(new Blob([monthlyCsv(rows,t.monthlyHeaders)],{type:'text/csv;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='jobmatch-monthly-results.csv';try{anchor.click();setDownloadFailed(false);}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}catch{setDownloadFailed(true);}}
 return <section className="card" lang={locale} aria-label={t.monthlyTitle}><h2>{t.monthlyTitle}</h2><p>{t.monthlyExplanation}</p>{!rows.length?<p role="status">{t.monthlyEmpty}</p>:<div className="table-wrap" role="region" tabIndex={0} aria-label={t.monthlyHeaders[0]}><table><caption className="sr-only">{t.monthlyTitle}</caption><thead><tr>{t.monthlyHeaders.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.month}><th scope="row">{r.month}</th><td>{r.sent}</td><td>{r.viewed}</td><td>{r.invited}</td><td>{r.interviews}</td><td>{r.offers}</td><td>{r.responses}</td><td>{r.responseRate===null?'—':Math.round(r.responseRate)+'%'} ({r.responses}/{r.sent})</td><td>{r.interviewRate===null?'—':Math.round(r.interviewRate)+'%'} ({r.interviews}/{r.sent})</td></tr>)}</tbody></table></div>}<p className="muted">{t.monthlyCaution}</p>{downloadFailed&&<p role="alert">{t.exportError}</p>}<button disabled={!rows.length} onClick={download}>{t.monthlyExport}</button></section>;
}
