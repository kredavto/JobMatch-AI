'use client';
import {useRef} from 'react';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {settingsCopy} from '../lib/i18n/settings';
import {settingsExportHref,type SettingsExport} from '../lib/settings-export';
type Props={ownerId?:string;busy:boolean;deleteWord:string;onDeleteWord:(value:string)=>void;onExport:()=>unknown;onDelete:(confirm:string)=>unknown;locale?:UiLocale};
export default function SettingsPanel({ownerId,busy,deleteWord,onDeleteWord,onExport,onDelete,locale:requestedLocale='ru'}:Props){
 const t=settingsCopy[normalizeLocale(requestedLocale)],known=settingsExportHref('facts',ownerId)!==null,disabled=busy||!known,pending=useRef(false);
 async function run(action:'export'|'delete'){
  if(disabled||pending.current||(action==='delete'&&deleteWord!=='УДАЛИТЬ'))return;
  pending.current=true;try{if(action==='export')await onExport();else await onDelete(deleteWord);}finally{pending.current=false;}
 }
 function link(kind:SettingsExport,label:string){const href=disabled?null:settingsExportHref(kind,ownerId);return href?<a href={href} download>{label}</a>:<span aria-disabled="true">{label}</span>;}
 return <div role="region" aria-label={t.region}>
  <section className="card"><h2>{t.device}</h2><p>{t.install}</p><p>{t.offline}</p></section>
  <section className="card"><h2>{t.data}</h2><p>{t.hosting}</p><p>{t.capabilities}</p>{!known&&<p role="alert">{t.ownerUnknown}</p>}<button disabled={disabled} onClick={()=>void run('export')}>{t.export}</button><p>{link('facts',t.facts)}</p><p className="muted">{t.archive}</p></section>
  <section className="card"><h2>{t.tasks}</h2>{link('reminders',t.reminders)}<p>{t.taskLimits}</p></section>
  <section className="card"><h2>{t.structure}</h2>{link('profile',t.profile)}<p>{link('versions',t.versions)}</p><p>{t.versionLimits}</p></section>
  <section className="card danger"><h2>{t.deleteTitle}</h2><p>{t.deleteHelp}</p><label>{t.confirm}<input aria-label={t.confirm} value={deleteWord} onChange={e=>onDeleteWord(e.target.value)}/></label><button disabled={disabled||deleteWord!=='УДАЛИТЬ'} onClick={()=>void run('delete')}>{t.remove}</button></section>
 </div>;
}
