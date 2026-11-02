'use client';
import {useMemo,useState} from 'react';
import type {Version} from '../lib/db';
import {compareText,scoresComparable} from '../lib/version-compare';
import {versionsCopy} from '../lib/i18n/versions';
import {formatVersionCreated} from '../lib/i18n/version-dates';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
export default function VersionComparison({versions,locale:requestedLocale='ru'}:{versions:Version[];locale?:UiLocale}){
 const locale=normalizeLocale(requestedLocale),t=versionsCopy[locale];
 const [beforeId,setBefore]=useState(versions.at(-2)?.id||''),[afterId,setAfter]=useState(versions.at(-1)?.id||'');
 const before=versions.find(v=>v.id===beforeId),after=versions.find(v=>v.id===afterId);
 const diff=useMemo(()=>before&&after?compareText(before.text,after.text):null,[before,after]);
 if(versions.length<2)return <section className="card" lang={locale} aria-label={t.compareTitle}><h2>{t.compareTitle}</h2><p>{t.compareEmpty}</p></section>;
 const options=versions.map((version,index)=><option key={version.id} value={version.id}>{t.version} {index+1} · {formatVersionCreated(version.created,locale).text}</option>);
 return <section className="card" lang={locale} aria-label={t.compareTitle}><h2>{t.compareTitle}</h2><label>{t.before}<select aria-label={t.before} value={before?.id||''} onChange={event=>setBefore(event.target.value)}><option value="">{t.choose}</option>{options}</select></label><label>{t.after}<select aria-label={t.after} value={after?.id||''} onChange={event=>setAfter(event.target.value)}><option value="">{t.choose}</option>{options}</select></label>
 <p>{t.readOnly}</p>
 {!before||!after?<p>{t.chooseTwo}</p>:beforeId===afterId?<p role="status">{t.sameChoice}</p>:diff&&<>
 <p>{t.savedScores}: {before.score} → {after.score}. {scoresComparable(before,after)?<>{t.delta}: {after.score-before.score>0?'+':''}{after.score-before.score}. {t.deltaCaveat}</>:t.incomparable}</p>
 {before.vacancy!==after.vacancy&&<p>{t.differentVacancies}</p>}
 <details><summary>{t.vacancies}</summary><h3>{t.beforeVacancy}</h3><pre lang="">{before.vacancy}</pre><h3>{t.afterVacancy}</h3><pre lang="">{after.vacancy}</pre></details>
 {diff.simplified?<p role="status">{t.simplified}</p>:<p role="status">{t.addedCount}: {diff.lines.filter(line=>line.kind==='added').length}; {t.removedCount}: {diff.lines.filter(line=>line.kind==='removed').length}.</p>}
 {diff.lines.length>1000&&<p>{t.truncated}</p>}
 {diff.lines.every(line=>line.kind==='same')?<p>{t.sameText}</p>:<div className="version-diff" role="region" tabIndex={0} aria-label={t.diffRegion}>{diff.lines.slice(0,1000).map((line,index)=><div key={index} className={'diff-'+line.kind}><span className="diff-label">{t.diff[line.kind]}</span><pre lang="">{line.text||'\u00a0'}</pre></div>)}</div>}
 </>}
 </section>;
}
