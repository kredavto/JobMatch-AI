'use client';
import type {Application} from '../lib/db';
import {monthlyResults,monthlyCsv} from '../lib/analytics-timeline';
import {analyticsRu as t} from '../lib/i18n/analytics';
export default function AnalyticsTimeline({applications}:{applications:Application[]}){
 const rows=monthlyResults(applications);
 function download(){const url=URL.createObjectURL(new Blob([monthlyCsv(rows,t.monthlyHeaders)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='jobmatch-monthly-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="card" aria-label={t.monthlyTitle}><h2>{t.monthlyTitle}</h2><p>{t.monthlyExplanation}</p>{!rows.length?<p role="status">{t.monthlyEmpty}</p>:<div className="table-wrap" role="region" tabIndex={0} aria-label={t.monthlyHeaders[0]}><table><caption className="sr-only">{t.monthlyTitle}</caption><thead><tr>{t.monthlyHeaders.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.month}><th scope="row">{r.month}</th><td>{r.sent}</td><td>{r.viewed}</td><td>{r.invited}</td><td>{r.interviews}</td><td>{r.offers}</td><td>{r.responses}</td><td>{r.responseRate===null?'—':Math.round(r.responseRate)+'%'} ({r.responses}/{r.sent})</td><td>{r.interviewRate===null?'—':Math.round(r.interviewRate)+'%'} ({r.interviews}/{r.sent})</td></tr>)}</tbody></table></div>}<p className="muted">{t.monthlyCaution}</p><button disabled={!rows.length} onClick={download}>{t.monthlyExport}</button></section>;
}
