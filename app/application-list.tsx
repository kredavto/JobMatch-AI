'use client';
import {useState} from 'react';
import type {Application,Version} from '../lib/db';
import {APPLICATION_STATUSES,EMPTY_APPLICATION_FILTER,filterApplications} from '../lib/application-filter';
import {applicationFilterRu as t} from '../lib/i18n/application-filter';
import type {NoteDrafts} from '../lib/application-drafts';
export type {NoteDrafts} from '../lib/application-drafts';
type Update={id:string;status:string;note:string;resumeVersionId?:string|null};
export default function ApplicationList({applications,versions,busy,onUpdate,drafts,onDraft}:{applications:Application[];versions:Version[];busy:boolean;onUpdate:(update:Update)=>unknown;drafts:NoteDrafts;onDraft:(id:string,value:{base:string;text:string}|null)=>void}){
 const [filter,setFilter]=useState({...EMPTY_APPLICATION_FILTER});
 const visible=new Set(filterApplications(applications,filter).map(a=>a.id));
 return <section aria-label={t.title}><h3>{t.title}</h3><label>{t.search}<input type="search" maxLength={200} value={filter.query} onChange={e=>setFilter({...filter,query:e.target.value})}/></label>
 <label>{t.status}<select value={filter.status} onChange={e=>setFilter({...filter,status:e.target.value})}><option value="">{t.allStatuses}</option>{APPLICATION_STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
 <label>{t.version}<select value={filter.version} onChange={e=>setFilter({...filter,version:e.target.value})}><option value="">{t.allVersions}</option><option value="unlinked">{t.unlinked}</option>{versions.map((v,i)=><option key={v.id} value={v.id}>{t.versionName} {i+1}</option>)}</select></label>
 <button onClick={()=>setFilter({...EMPTY_APPLICATION_FILTER})}>{t.reset}</button><p className="muted">{t.hint}</p><p role="status">{t.shown} {visible.size} {t.of} {applications.length}</p>
 {!applications.length?<p>{t.empty}</p>:!visible.size&&<p>{t.noMatches}</p>}
 {applications.map(a=><article className="application" key={a.id} hidden={!visible.has(a.id)} style={visible.has(a.id)?undefined:{display:'none'}}><h3>{a.title}</h3><label>Связанная версия резюме<select value={a.resumeVersionId||''} disabled={busy||(drafts[a.id]!==undefined&&drafts[a.id].text!==a.note)} onChange={e=>onUpdate({id:a.id,status:a.status,note:a.note,resumeVersionId:e.target.value||null})}><option value="">Без привязки</option>{versions.map((v,i)=><option value={v.id} key={v.id}>Версия {i+1}</option>)}</select></label><label>Статус<select aria-label="Статус" disabled={busy||(drafts[a.id]!==undefined&&drafts[a.id].text!==a.note)} value={a.status} onChange={e=>onUpdate({id:a.id,status:e.target.value,note:a.note})}>{APPLICATION_STATUSES.map(s=><option key={s}>{s}</option>)}</select></label><label>Заметки<textarea aria-label="Заметки" maxLength={3000} value={drafts[a.id]?.text??a.note} onChange={e=>onDraft(a.id,{base:drafts[a.id]&&drafts[a.id].text!==a.note?drafts[a.id].base:a.note,text:e.target.value})}/></label>{drafts[a.id]&&drafts[a.id].text!==a.note&&<><p>Заметка не сохранена. Сначала сохраните её перед сменой статуса или версии резюме.</p>{drafts[a.id].base!==a.note&&<p role="alert">Сохраненная заметка изменилась. Сравните тексты перед записью.</p>}<details><summary>Сохраненная заметка</summary><pre>{a.note}</pre></details><button disabled={busy} onClick={()=>onUpdate({id:a.id,status:a.status,note:drafts[a.id].text})}>Сохранить заметку</button><button disabled={busy} onClick={()=>onDraft(a.id,null)}>Отменить правку заметки</button></>}<small>{a.events.map(e=>`${new Date(e.date).toLocaleDateString('ru-RU')}: ${e.status}`).join(' → ')}</small></article>)}
 </section>;
}
