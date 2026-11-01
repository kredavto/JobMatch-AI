'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {PROFILE_KINDS,PROFILE_FIELDS,profileLabels,fieldLabels,SourceCommandSchema,sourceDisplayText,sourceSelectionFromDisplay,validateSourceProfile,validateSourceWriteAck,duplicateSourceEntry,storesSource,type SourceProfile,type ProfileFields,type SourceContext,type SourceCommand} from '../lib/source-profile';
import {letterRequest as request,LetterClientError} from '../lib/saved-letter-client';
type Props={ownerId?:string;revision:number;original:string;factIds:string[];disabled:boolean;onBoundaryError:(status:number)=>void};
const envelope=z.strictObject({profile:z.unknown(),storageAvailable:z.boolean()});
function download(profile:SourceProfile){const url=URL.createObjectURL(new Blob([JSON.stringify(profile,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='jobmatch-source-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export default function SourceProfilePanel(props:Props){return <BoundProfile key={props.ownerId??'no-owner'} {...props}/>;}
function BoundProfile({ownerId,revision,original,factIds,disabled,onBoundaryError}:Props){
 const [profile,setProfile]=useState<SourceProfile|null>(null),[available,setAvailable]=useState(false),[working,setWorking]=useState(false),[needsRead,setNeedsRead]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [kind,setKind]=useState<typeof PROFILE_KINDS[number]>('employment'),[field,setField]=useState<typeof PROFILE_FIELDS[number]>('title'),[fields,setFields]=useState<ProfileFields>({});
 const active=useRef<AbortController|null>(null),source=useRef<HTMLTextAreaElement|null>(null);
 const context:SourceContext={ownerId:ownerId??'',revision,original,factIds},contextKey=JSON.stringify(context);
 // Preserve field drafts across same-owner reloads; discard late replies on every source boundary.
 useEffect(()=>()=>{active.current?.abort();},[contextKey]);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 const loaded=!!profile&&profile.workspace_revision===revision,blocked=disabled||working||needsRead||!loaded;
 const canStore=!blocked&&available&&!!profile?.source_matches&&profile.entries.length<50;
 async function perform(task:(controller:AbortController)=>Promise<void>,write=false){
  if(!ownerId||active.current)return;const c=new AbortController();active.current=c;setWorking(true);setError('');setNotice('');
  try{await task(c);}catch(e){if(active.current===c&&!c.signal.aborted){const status=e instanceof LetterClientError?e.status:502;if(write)setNeedsRead(true);if(status===401||status===409)onBoundaryError(status);setError((write?'Результат записи неизвестен. Перечитайте профиль перед новым действием. ':'')+(status===401?'Восстановите вход в исходный аккаунт.':status===409?'Данные изменились. Загрузите актуальный мастер-профиль.':status===503?'Сохранение пока недоступно.':'Ответ не получен или не прошёл проверку. Автоматического повтора нет.'));}}
  finally{if(active.current===c){active.current=null;setWorking(false);}}
 }
 async function read(){await perform(async c=>{const reply=envelope.parse(await request('/api/source-profile',ownerId!,c.signal)),next=validateSourceProfile(reply.profile,ownerId!,context);if(profile&&next.revision<profile.revision)throw Error();if(c.signal.aborted)return;setProfile(next);setAvailable(reply.storageAvailable);setNeedsRead(false);setNotice('Профиль прочитан. Чтение не создаёт дополнительную копию исходника. Проверьте список перед новым действием; чтение не доказывает исход предыдущего запроса.');});}
 async function write(command:SourceCommand){
  if(blocked||!profile||!ownerId||active.current||storesSource(command)&&!available)return false;
  if(command.action==='add'&&(!canStore||duplicateSourceEntry(profile,command)))return false;
  if(command.action==='confirm'&&command.confirmed&&!profile.source_matches)return false;
  const before=profile;let success=false;setNeedsRead(true);
  await perform(async c=>{const raw=await request('/api/source-profile',ownerId,c.signal,{expectedOwnerId:ownerId,workspaceRevision:revision,profileRevision:before.revision,command,consentToStore:storesSource(command)}),next=validateSourceWriteAck(raw,before,command,context);if(c.signal.aborted)return;setProfile(next);setNeedsRead(false);setNotice(command.action==='clear'?'Дополнительная копия исходника и записи удалены. Сохранена только ревизия защиты от повторного запроса. Мастер-профиль и прежние архивы не удалены. История структурированных версий очищается отдельно.':'Изменение проверено и сохранено. Мастер-профиль, факты, анализ и письма не изменены.');success=true;},true);
  return success;
 }
 function capture(){if(blocked||!source.current)return;try{const captured=sourceSelectionFromDisplay(original,source.current.selectionStart,source.current.selectionEnd);setFields(previous=>({...previous,[field]:captured}));setError('');}catch{setError('Выделите непустой фрагмент исходника целиком, до 500 символов.');}}
 const draft=SourceCommandSchema.safeParse({action:'add',kind,fields}),duplicate=!!profile&&draft.success&&duplicateSourceEntry(profile,draft.data);
 return <section className="card" aria-label="Структурированный профиль"><h2>Структурированный профиль</h2><p>Работа, образование, сертификаты и достижения из точных выделений исходника. Совпадение диапазона не проверяет смысл, даты или истинность. Модель не используется; новые записи сначала неподтверждённые.</p><p>Сохранение создаёт дополнительную копию всего исходного резюме и идентификаторов фактов. По умолчанию отключено до решения оператора о хранении персональных данных. До 50 записей. Ничего не отправляется на hh.ru.</p>
 <button type="button" disabled={!ownerId||working} onClick={()=>void read()}>Прочитать структурированный профиль</button>
 {working&&<p role="status">Проверяем профиль…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{needsRead&&<p role="alert">Запись заблокирована до явного чтения. Не повторяйте запрос автоматически.</p>}
 {profile&&<><p>Ревизия: {profile.revision}. {profile.source_captured?'Дополнительная копия исходника сохранена.':'Дополнительная копия исходника не сохранена; показан текущий мастер-профиль.'}</p>{!available&&<p>Создание и подтверждение отключены. Отзыв подтверждения, удаление записей и очистка доступны.</p>}{(!loaded||!profile.source_matches)&&<p role="alert">Источник изменился. Перечитайте профиль. Для новых записей с новым источником нужен отдельный сброс; старые подтверждения не переносятся.</p>}
 <button type="button" disabled={working||!loaded} onClick={()=>{try{download(validateSourceProfile(profile,ownerId!,context));}catch{setError('Экспорт не прошёл проверку. Файл не создан.');}}}>Скачать структурированный профиль JSON</button>
 <label>Исходник для выделения<textarea ref={source} readOnly rows={8} value={sourceDisplayText(original)}/></label>
 <label>Тип записи<select disabled={blocked} value={kind} onChange={e=>setKind(e.target.value as typeof kind)}>{PROFILE_KINDS.map(k=><option key={k} value={k}>{profileLabels[k]}</option>)}</select></label>
 <label>Поле для выделения<select disabled={blocked} value={field} onChange={e=>setField(e.target.value as typeof field)}>{PROFILE_FIELDS.map(f=><option key={f} value={f}>{fieldLabels[f]}</option>)}</select></label><button type="button" disabled={blocked} onClick={capture}>Взять выделение в поле</button>
 <div role="group" aria-label="Черновик записи">{Object.entries(fields).map(([name,value])=><div key={name}><strong>{fieldLabels[name as keyof ProfileFields]}</strong><pre>{value.quote}</pre><small>Диапазон: {value.start}–{value.end}, символы Unicode.</small><button type="button" disabled={working} onClick={()=>setFields(previous=>{const next={...previous};delete next[name as keyof ProfileFields];return next;})}>Убрать поле {name}</button></div>)}</div>
 {duplicate&&<p role="alert">Такая запись уже есть. Повторное добавление заблокировано.</p>}
 <SourceApproval key={JSON.stringify([contextKey,profile.revision,blocked,available,kind,fields])} disabled={!canStore||!draft.success||duplicate} button="Добавить неподтверждённую запись" onAccept={async()=>{if(draft.success&&await write(draft.data))setFields({});}}/>
 <ul>{profile.entries.map(entry=><li key={entry.id}><article aria-label={'Запись '+profileLabels[entry.kind]}><h3>{profileLabels[entry.kind]} · {entry.confirmed?'подтверждено пользователем':'не подтверждено'}</h3>{Object.entries(entry.fields).map(([name,value])=><div key={name}><strong>{fieldLabels[name as keyof ProfileFields]}</strong><pre>{value.quote}</pre><small>Диапазон {value.start}–{value.end} в сохранённом источнике.</small></div>)}
 {entry.confirmed?<button type="button" disabled={blocked} onClick={()=>void write({action:'confirm',id:entry.id,confirmed:false})}>Отозвать подтверждение</button>:<SourceApproval key={JSON.stringify([contextKey,profile.revision,blocked,available])} disabled={blocked||!available||!profile.source_matches} button="Подтвердить поля записи" onAccept={()=>write({action:'confirm',id:entry.id,confirmed:true})}/>}
 <button type="button" disabled={blocked} onClick={()=>void write({action:'delete',id:entry.id})}>Удалить запись</button></article></li>)}</ul>
 {profile.source_captured&&<details><summary>Сохранённый источник записей</summary><pre>{profile.source_original}</pre></details>}
 <SourceDestruction key={JSON.stringify([contextKey,profile.revision,blocked,available])} disabled={blocked} canReset={available&&!!original.trim()&&factIds.length>0} canClear={profile.revision>0} onCommand={write}/>
 </>}
 </section>;
}
function SourceApproval({disabled,button,onAccept}:{disabled:boolean;button:string;onAccept:()=>Promise<unknown>}){
 const [checked,setChecked]=useState(false);
 return <div><label className="check"><input type="checkbox" disabled={disabled} checked={checked} onChange={e=>setChecked(e.target.checked)}/>Я проверил(а) все поля и разрешаю сохранить дополнительную копию исходного резюме и выбранные диапазоны</label><button type="button" disabled={disabled||!checked} onClick={()=>{if(!disabled&&checked)void onAccept();}}>{button}</button></div>;
}
function SourceDestruction({disabled,canReset,canClear,onCommand}:{disabled:boolean;canReset:boolean;canClear:boolean;onCommand:(command:SourceCommand)=>Promise<boolean>}){
 const [clear,setClear]=useState(false),[reset,setReset]=useState(false);
 return <details><summary>Очистка или новый источник</summary><p>Это действие относится к текущей структуре. Отдельно сохранённые структурированные версии, скачанные файлы и резервные копии здесь не удаляются.</p><label className="check"><input type="checkbox" disabled={disabled||!canClear} checked={clear} onChange={e=>setClear(e.target.checked)}/>Удалить все записи и дополнительную копию исходника; мастер-профиль останется</label><button type="button" disabled={disabled||!canClear||!clear} onClick={()=>void onCommand({action:'clear',confirm:'CLEAR_SOURCE_PROFILE_DATA'})}>Удалить данные структурированного профиля</button><label className="check"><input type="checkbox" disabled={disabled||!canReset} checked={reset} onChange={e=>setReset(e.target.checked)}/>Удалить все записи и разрешить новую копию текущего исходника без переноса подтверждений</label><button type="button" disabled={disabled||!canReset||!reset} onClick={()=>void onCommand({action:'reset',confirm:'RESET_SOURCE_PROFILE'})}>Сбросить на текущий источник</button></details>;
}
