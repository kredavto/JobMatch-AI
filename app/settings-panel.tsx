'use client';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {settingsCopy} from '../lib/i18n/settings';
import {settingsExportHref,knownSettingsOwner,type SettingsExport} from '../lib/settings-export';
type Props={ownerId?:string;busy:boolean;paused:boolean;deleteWord:string;onDeleteWord:(value:string)=>void;onExport:()=>unknown;onDelete:(confirm:string)=>unknown;locale?:UiLocale};
export default function SettingsPanel({ownerId,busy,paused,deleteWord,onDeleteWord,onExport,onDelete,locale:requestedLocale='ru'}:Props){
 const locale=normalizeLocale(requestedLocale),t=settingsCopy[locale],known=knownSettingsOwner(ownerId),disabled=busy||paused||!known;
 function link(kind:SettingsExport,label:string){const href=disabled?null:settingsExportHref(kind,ownerId);return href?<a href={href} download={kind==='reminders'?'jobmatch-reminders.json':true}>{label}</a>:<span aria-disabled="true">{label}</span>;}
 return <div id="workspace-settings" role="region" lang={locale} aria-label={t.region}>
  <section className="card"><h2>{t.device}</h2><p>{t.install}</p><p>{t.offline}</p></section>
  <section className="card"><h2>{t.data}</h2><p>{t.hosting}</p><p>{t.capabilities}</p><p>{t.mail}</p>{!known&&<p role="alert">{t.ownerUnknown}</p>}{paused&&<p role="alert">{t.paused}</p>}
   <button id="settings-export" disabled={disabled} onClick={()=>void onExport()}>{t.export}</button><p>{link('facts',t.facts)}</p><p>{link('letters',t.letters)}</p><p>{link('sources',t.sources)}</p><p>{link('reminders',t.reminders)}</p><p className="muted">{t.archive}</p><p className="muted">{t.limits}</p>
  </section>
  <section className="card danger"><h2>{t.deleteTitle}</h2><p>{t.deleteHelp}</p><label htmlFor="settings-delete-confirm">{t.confirm}</label><input id="settings-delete-confirm" lang="" value={deleteWord} onChange={e=>onDeleteWord(e.target.value)}/><button id="settings-delete" disabled={disabled||deleteWord!=='УДАЛИТЬ'} onClick={()=>void onDelete(deleteWord)}>{t.remove}</button></section>
 </div>;
}
