'use client';
import {useEffect,useRef,useState} from 'react';
import {PROFILE_FIELDS,PROFILE_KINDS,profileLabels,fieldLabels,sourceSelection,StructuredCommandSchema,validateStructuredProfile,type StructuredProfile,type ProfileFields,type StructuredCommand} from '../lib/structured-profile';
import StructuredVersionPanel from './structured-version-panel';
import {RequestError,errorFromResponse} from '../lib/client-api';
type Props={ownerId:string;workspaceRevision:number;disabled:boolean;onConflict:()=>void};
export default function StructuredProfilePanel({ownerId,workspaceRevision,disabled,onConflict}:Props){
 const [readGeneration,setReadGeneration]=useState(0);
 const [profile,setProfile]=useState<StructuredProfile|null>(null),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [kind,setKind]=useState<typeof PROFILE_KINDS[number]>('employment'),[field,setField]=useState<typeof PROFILE_FIELDS[number]>('title'),[fields,setFields]=useState<ProfileFields>({}),[resetAccepted,setResetAccepted]=useState(false);
 const source=useRef<HTMLTextAreaElement>(null),controller=useRef<AbortController|null>(null),active=useRef(true),pending=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;controller.current?.abort();};},[]);
 const mismatch=!!profile&&profile.workspace_revision!==workspaceRevision;
 async function execute(command?:StructuredCommand){
  if(pending.current||busy||disabled||(command&&(blocked||mismatch||!profile)))return;
  pending.current=true;
  setBusy(true);setError('');setNotice('');controller.current=new AbortController();
  try{
   const response=await fetch('/api/structured-profile',{method:command?'POST':'GET',cache:'no-store',headers:{'Content-Type':'application/json','x-jobmatch-owner':ownerId},signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(30000)]),...(command?{body:JSON.stringify({expectedOwnerId:ownerId,workspaceRevision,profileRevision:profile!.revision,command:StructuredCommandSchema.parse(command)})}:{})});
   const value=await response.json();if(!response.ok)throw errorFromResponse(value,response.status);
   const next=validateStructuredProfile(value,ownerId,workspaceRevision);
   if(command&&next.revision!==profile!.revision+1)throw Error('Ответ записи не соответствует ревизии');
   if(!active.current)return;setProfile(next);if(!command)setReadGeneration(previous=>previous+1);setBlocked(false);setResetAccepted(false);
   if(command){setFields({});setNotice('Сохранено в структурированном профиле');}
  }catch(cause){if(!active.current)return;setBlocked(true);if(cause instanceof RequestError&&[401,409].includes(cause.status))onConflict();setError(cause instanceof Error?cause.message:'Ошибка загрузки. Повторите чтение вручную.');}
  finally{pending.current=false;if(active.current)setBusy(false);}
 }
 function capture(){
  try{if(!source.current||!profile)throw Error();const selected=sourceSelection(profile.source_original,source.current.selectionStart,source.current.selectionEnd);setFields(previous=>({...previous,[field]:selected}));setError('');}catch{setError('Выделите в сохранённом источнике от 1 до 500 символов.');}
 }
 function exportProfile(){if(!profile)return;const url=URL.createObjectURL(new Blob([JSON.stringify(profile,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='jobmatch-structured-profile.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const canWrite=!!profile&&!busy&&!disabled&&!blocked&&!mismatch;
 return <section className="card" aria-labelledby="structured-profile-title"><h2 id="structured-profile-title">Структурированный профиль</h2><p>Работа, образование, сертификаты и достижения из точных фрагментов сохранённого резюме. Подтверждение означает вашу проверку всех полей, а не независимую проверку. Эти записи не меняют Match Score; из выбранных подтверждённых записей можно отдельно сохранить дословную версию.</p>
 <button disabled={busy||disabled} onClick={()=>void execute()}>{profile?'Обновить структурированный профиль':'Открыть структурированный профиль'}</button>
 {error&&<p role="alert" className="error">{error} Запись не повторяется автоматически. Загрузите актуальные данные.</p>}{notice&&<p role="status" className="notice">{notice}</p>}{mismatch&&<p role="alert">Рабочее пространство изменилось. Обновите структурированный профиль.</p>}
 {profile&&<><p>Редакция структуры: {profile.revision}. Исходная ревизия: {profile.source_workspace_revision}. Записей: {profile.entries.length}/50.</p>
 <button disabled={busy||disabled||blocked||mismatch} onClick={exportProfile}>Скачать структуру и источник</button>
 {!profile.source_matches&&<p role="alert" className="notice">Резюме переимпортировано или состав фактов изменился. Прежняя структура сохранена как устаревшая. Скачайте её перед явным сбросом; добавление и новые подтверждения остановлены.</p>}
 <label>Сохранённый источник структуры<textarea ref={source} readOnly rows={8} value={profile.source_original}/></label>
 {profile.source_matches&&<fieldset disabled={!canWrite}><legend>Добавить запись из выделенных фрагментов</legend>
 <label>Тип записи<select value={kind} onChange={event=>{setKind(event.target.value as typeof kind);setFields({});}}>{PROFILE_KINDS.map(item=><option key={item} value={item}>{profileLabels[item]}</option>)}</select></label>
 <label>Поле для выделения<select value={field} onChange={event=>setField(event.target.value as typeof field)}>{PROFILE_FIELDS.filter(item=>item!=='credential'||kind==='certification').map(item=><option key={item} value={item}>{fieldLabels[item]}</option>)}</select></label>
 <button type="button" onClick={capture}>Взять выделенный фрагмент</button>
 <dl>{PROFILE_FIELDS.map(name=>fields[name]&&<div key={name}><dt>{fieldLabels[name]}</dt><dd>{fields[name]!.quote} <small>Символы {fields[name]!.start}–{fields[name]!.end}</small><button type="button" onClick={()=>setFields(previous=>{const next={...previous};delete next[name];return next;})}>Убрать поле «{fieldLabels[name]}»</button></dd></div>)}</dl>
 <p>Для достижения обязательно описание; для остальных записей — название. Даты и числа сохраняются дословно, без вывода стажа или уровня. Черновик полей хранится только в этой вкладке и исчезает при уходе из раздела.</p>
 <button disabled={!StructuredCommandSchema.safeParse({action:'add',kind,fields}).success} onClick={()=>void execute({action:'add',kind,fields})}>Сохранить неподтверждённую запись</button></fieldset>}
 {profile.entries.map(entry=><article key={entry.id} className="structured-entry"><h3>{profileLabels[entry.kind]}</h3><dl>{PROFILE_FIELDS.map(name=>entry.fields[name]&&<div key={name}><dt>{fieldLabels[name]}</dt><dd>{entry.fields[name]!.quote}<small>Диапазон [{entry.fields[name]!.start}, {entry.fields[name]!.end}) исходного текста</small></dd></div>)}</dl><label className="check"><input type="checkbox" checked={entry.confirmed} disabled={!canWrite||(!profile.source_matches&&!entry.confirmed)} onChange={event=>void execute({action:'confirm',id:entry.id,confirmed:event.target.checked})}/>Подтверждаю точность и смысл всех полей этой записи</label><button disabled={!canWrite} onClick={()=>void execute({action:'delete',id:entry.id})}>Удалить запись</button></article>)}
 <StructuredVersionPanel key={`${ownerId}:${profile.revision}:${profile.workspace_revision}:${readGeneration}`} profile={profile} disabled={busy||disabled||blocked||mismatch} onConflict={onConflict}/>
 <details><summary>Явный сброс структуры</summary><p>Удалит все структурированные записи и привяжет пустую структуру к текущему сохранённому резюме. Прежний источник структуры будет заменён. Сначала скачайте структуру и источник, если они нужны. Мастер-профиль, факты, обычные и дословные версии резюме сохранятся. Сохранённые версии содержат свой прежний источник.</p><label className="check"><input type="checkbox" checked={resetAccepted} disabled={!canWrite} onChange={event=>setResetAccepted(event.target.checked)}/>Разрешаю удалить все записи структуры и заменить её источник</label><button disabled={!canWrite||!resetAccepted} onClick={()=>void execute({action:'reset',confirm:'RESET_STRUCTURED_PROFILE'})}>Сбросить структуру</button></details></>}
 </section>;
}
