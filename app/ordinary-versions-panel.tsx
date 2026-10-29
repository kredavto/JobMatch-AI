'use client';
import {useRef,useState} from 'react';
import type {Version} from '../lib/db';
import VersionComparison from './version-comparison';
import MatchMetadataPanel from './match-metadata-panel';
import ResumeDownload from './resume-download';
import {versionsCopy} from '../lib/i18n/versions';
import {formatVersionCreated} from '../lib/i18n/version-dates';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
type Props={versions:Version[];ownerId?:string;locale?:UiLocale;busy:boolean;onRestore:(id:string)=>Promise<unknown>;onCopy:(text:string)=>Promise<void>;onDownload:(name:string,text:string,type?:string)=>void};
export default function OrdinaryVersionsPanel({versions,ownerId,locale:requestedLocale='ru',busy,onRestore,onCopy,onDownload}:Props){
 const locale=normalizeLocale(requestedLocale),t=versionsCopy[locale];
 const pending=useRef(false),[restoring,setRestoring]=useState<string|null>(null);
 async function restore(id:string){if(busy||pending.current)return;pending.current=true;setRestoring(id);try{await onRestore(id);}finally{pending.current=false;setRestoring(null);}}
 return <div className="localized-panel" lang={locale} role="region" aria-label={t.historyRegion}><VersionComparison versions={versions} locale={locale}/><section className="card"><h2>{t.historyTitle}</h2>{!versions.length&&<p>{t.empty}</p>}{versions.slice().reverse().map((version,index)=><details key={version.id} open={index===0}><summary>{t.version} {versions.length-index} · {formatVersionCreated(version.created,locale).text} · {version.score}/100</summary><pre lang="">{version.text}</pre><small>{t.profileRevision}: {version.profile_revision??t.legacyRevision} · {t.engine}: <span lang="">{version.engine_version??t.legacyEngine}</span></small>{version.restored_from&&<p>{t.restoredFrom}: <span lang="">{version.restored_from}</span></p>}<MatchMetadataPanel locale={locale} metadata={version.match_metadata}/>{version.evidence_snapshot&&<details><summary>{version.evidence_snapshot.every(fact=>fact.verified)?t.confirmedSnapshot:t.snapshot}</summary>{version.evidence_snapshot.map(fact=><p key={fact.id}><span lang="">{fact.text}</span><small><span lang="">{fact.id} · {fact.source}</span> · {fact.verified?t.confirmed:t.unconfirmed}</small></p>)}</details>}<small>Evidence: <span lang="">{version.evidence_ids.join(', ')||t.original}</span></small><div className="actions"><button onClick={()=>onDownload('jobmatch-resume.txt',version.text)}>{t.txt}</button><ResumeDownload locale={locale} id={version.id} ownerId={ownerId}/><button onClick={()=>onDownload('jobmatch-version.json',JSON.stringify(version,null,2),'application/json')}>{t.json}</button><button onClick={()=>void onCopy(version.text)}>{t.copy}</button><button disabled={busy||restoring!==null} onClick={()=>void restore(version.id)}>{restoring===version.id?t.restoring:t.restore}</button></div></details>)}<h3>{t.transferTitle}</h3><ol><li>{t.transfer1} <a href="https://hh.ru/applicant/resumes" target="_blank" rel="noreferrer">{t.resumesLink}</a>.</li><li>{t.transfer2}</li><li>{t.transfer3}</li><li>{t.transfer4}</li></ol></section></div>;
}
