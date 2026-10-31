'use client';
import {useState} from 'react';
import type {Application} from '../lib/db';
import {specialtyBreakdown,specialtiesCsv} from '../lib/analytics';
import {specialtyCopy} from '../lib/i18n/application-specialty';
import type {UiLocale} from '../lib/i18n/locale';

export default function SpecialtyAnalytics({applications,locale}:{applications:Application[];locale:UiLocale}){
 const t=specialtyCopy[locale],rows=specialtyBreakdown(applications),[exportFailed,setExportFailed]=useState(false);
 const percent=(n:number|null)=>n===null?'—':Math.round(n)+'%';
 function download(){try{const url=URL.createObjectURL(new Blob([specialtiesCsv(rows,[...t.headers],t.unset)],{type:'text/csv;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='jobmatch-specialties.csv';try{anchor.click();setExportFailed(false);}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}catch{setExportFailed(true);}}
 return <section className="card"><h2>{t.title}</h2><p>{t.explanation}</p><p>{t.caution}</p>
 {!rows.length?<p role="status">{t.empty}</p>:<><div className="table-wrap" tabIndex={0} role="region" aria-label={t.title}><table><caption className="sr-only">{t.title}</caption><thead><tr>{t.headers.map(header=><th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.key}><th scope="row">{row.label??t.unset}</th><td>{row.total}</td><td>{row.sent}</td><td>{row.invited}</td><td>{row.interviews}</td><td>{row.offers}</td><td>{row.responses}</td><td>{percent(row.responseRate)} ({row.responses}/{row.sent})</td><td>{percent(row.interviewRate)} ({row.interviews}/{row.sent})</td></tr>)}</tbody></table></div><button onClick={download}>{t.export}</button></>}
 {exportFailed&&<p role="alert">{t.exportError}</p>}
 </section>;
}
