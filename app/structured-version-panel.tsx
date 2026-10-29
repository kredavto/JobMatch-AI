'use client';
import {useEffect,useRef,useState} from 'react';
import {RequestError,errorFromResponse} from '../lib/client-api';
import type {StructuredProfile} from '../lib/structured-profile';
import {contextIssue,VersionListSchema,validateStructuredPreview,validateStructuredVersion,type StructuredPreview,type StructuredVersion,type VersionList} from '../lib/structured-version';
type Props={profile:StructuredProfile;disabled:boolean;onConflict:()=>void};
export default function StructuredVersionPanel({profile,disabled,onConflict}:Props){
 const [selected,setSelected]=useState<string[]>([]),[preview,setPreview]=useState<StructuredPreview|null>(null),[accepted,setAccepted]=useState(false),[saved,setSaved]=useState<StructuredVersion|null>(null),[list,setList]=useState<VersionList|null>(null),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false),[error,setError]=useState('');
 const pending=useRef(false),active=useRef(true),controller=useRef<AbortController|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;controller.current?.abort();};},[]);
 const eligible=profile.entries.filter(entry=>entry.confirmed&&!contextIssue(profile,entry));
 const canWrite=!disabled&&!busy&&!blocked&&profile.source_matches;
 async function request(action:'preview'|'save'|'list'|'detail',id?:string){
  const write=action==='preview'||action==='save';
  if(pending.current||disabled||(write&&(!canWrite||!selected.length))||(action==='save'&&(!preview||!accepted)))return;
  pending.current=true;setBusy(true);setError('');controller.current=new AbortController();
  try{
   const response=await fetch('/api/structured-versions'+(action==='detail'?'?id='+id:''),{method:write?'POST':'GET',cache:'no-store',headers:{'Content-Type':'application/json','x-jobmatch-owner':profile.ownerId},signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(30000)]),...(write?{body:JSON.stringify({action,expectedOwnerId:profile.ownerId,workspaceRevision:profile.workspace_revision,profileRevision:profile.revision,entryIds:selected,...(action==='save'?{previewHash:preview!.preview_hash,accept:'SAVE_LITERAL_VERSION'}:{})})}:{})});
   const value=await response.json();if(!response.ok)throw errorFromResponse(value,response.status);
   if(action==='preview'){
    const next=await validateStructuredPreview(value,profile.ownerId,profile.workspace_revision,profile.revision,selected);if(!active.current)return;setPreview(next);setAccepted(false);setSaved(null);
   }else if(action==='list'){
    const next=VersionListSchema.parse(value);if(next.ownerId!==profile.ownerId)throw Error('История другого аккаунта');if(!active.current)return;setList(next);
   }else{
    const next=await validateStructuredVersion(value,profile.ownerId);
    if((action==='save'&&(next.preview_hash!==preview!.preview_hash||next.snapshot.revision!==profile.revision||next.snapshot.workspace_revision!==profile.workspace_revision))||(action==='detail'&&next.id!==id))throw Error('Ответ версии не соответствует запросу');
    if(!active.current)return;setSaved(next);if(action==='save'){setPreview(null);setSelected([]);setAccepted(false);setList(null);}
   }
  }catch(cause){if(!active.current)return;if(write)setBlocked(true);if(cause instanceof RequestError&&[401,409].includes(cause.status))onConflict();setError(cause instanceof Error?cause.message:'Ответ не прошёл проверку');}
  finally{pending.current=false;if(active.current)setBusy(false);}
 }
 function download(value:StructuredVersion,format:'json'|'txt'){
  const url=URL.createObjectURL(new Blob([format==='json'?JSON.stringify(value,null,2):value.text],{type:format==='json'?'application/json':'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='jobmatch-structured-version.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section aria-labelledby="structured-versions-title"><h3 id="structured-versions-title">Дословные версии структуры</h3><p>Шаблон structured-literal-v1 переносит только выбранные подтверждённые поля. Прочие сведения исходного резюме будут пропущены. Это отдельный текст, который нужно проверить перед использованием. Подтверждение принадлежит пользователю; проверки квалификации и смысла моделью нет.</p>
 {error&&<p role="alert" className="error">{error}</p>}{blocked&&<p role="alert">Результат запроса неизвестен. Сначала прочитайте историю версий и обновите структурированный профиль. Запись автоматически не повторяется.</p>}
 <fieldset disabled={!canWrite}><legend>Записи для версии</legend>{eligible.length?eligible.map(entry=><label className="check" key={entry.id}><input type="checkbox" checked={selected.includes(entry.id)} onChange={event=>{setSelected(previous=>event.target.checked?[...previous,entry.id]:previous.filter(id=>id!==entry.id));setPreview(null);setAccepted(false);}}/>Включить: {entry.fields.title?.quote||entry.fields.description?.quote}</label>):<p>Нет доступных подтверждённых записей. Подтвердите поля и проверьте их контекст в источнике.</p>}
 <p>Консервативный фильтр line-risk-v1 блокирует строки с отрицанием, планом или инструкцией. Он может отклонить допустимую строку и не обнаруживает все смысловые противоречия.</p>
 {profile.entries.filter(entry=>entry.confirmed&&contextIssue(profile,entry)).map(entry=><p key={entry.id}>Недоступна запись «{entry.fields.title?.quote||entry.fields.description?.quote}»: {contextIssue(profile,entry)}</p>)}
 <button disabled={!canWrite||!selected.length} onClick={()=>void request('preview')}>Предпросмотр дословной версии</button></fieldset>
 {preview&&<article><h4>Предпросмотр — ещё не сохранён</h4><pre className="output">{preview.text}</pre><p>Шаблон: {preview.template_version}. Источник: {preview.snapshot.source_workspace_revision}; структура: {preview.snapshot.revision}. Записей: {preview.snapshot.entries.length}. Исходный текст и точные диапазоны будут сохранены вместе с версией.</p><label className="check"><input type="checkbox" checked={accepted} disabled={!canWrite} onChange={event=>setAccepted(event.target.checked)}/>Проверил текст, пропущенные сведения и контекст; сохранить эту дословную версию</label><button disabled={!canWrite||!accepted} onClick={()=>void request('save')}>Сохранить отдельную неизменяемую версию</button><button disabled={busy} onClick={()=>{setPreview(null);setAccepted(false);}}>Отменить предпросмотр</button></article>}
 <button disabled={busy||disabled} onClick={()=>void request('list')}>Прочитать историю дословных версий</button>
 {list&&<><p>Сохранено: {list.versions.length}/20. История содержит подтверждения на момент сохранения; текущая структура могла измениться.</p>{list.versions.map(row=><p key={row.id}>{row.created} · структура {row.profile_revision} · {row.text_length} символов <button disabled={busy||disabled} onClick={()=>void request('detail',row.id)}>Открыть версию {row.id}</button></p>)}</>}
 {saved&&<article><h4>Сохранённая дословная версия</h4><p>ID: {saved.id}. Создана: {saved.created}. Шаблон: {saved.template_version}; генератор: literal-template; модель не использовалась. Подтверждение и источник относятся к моменту сохранения.</p><pre className="output">{saved.text}</pre><details><summary>Снимок источника и диапазонов</summary><pre className="output">{JSON.stringify(saved.snapshot,null,2)}</pre></details><button disabled={busy||disabled} onClick={()=>download(saved,'txt')}>Скачать дословную версию TXT</button><button disabled={busy||disabled} onClick={()=>download(saved,'json')}>Скачать версию с происхождением JSON</button></article>}
 </section>;
}
