'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {ImportedResumeSchema,responseJson} from '../mvp/responses';
const Session=z.object({configured:z.boolean(),authenticated:z.boolean()});
const List=z.object({items:z.array(z.object({id:z.string().min(1),title:z.string()}))});
type Resume={text:string;filename:string};
export default function HHResumePicker({onSelect}:{onSelect:(resume:Resume|null)=>void}){
 const [session,setSession]=useState<z.infer<typeof Session>|null>(null),[items,setItems]=useState<z.infer<typeof List>['items']|null>(null),[chosen,setChosen]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{
  const url=new URL(window.location.href),failed=url.searchParams.get('hh')==='failed';
  if(url.searchParams.has('hh')){url.searchParams.delete('hh');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}
  const c=new AbortController();controller.current=c;
  fetch('/api/mvp/hh/session',{cache:'no-store',signal:AbortSignal.any([c.signal,AbortSignal.timeout(20000)])}).then(response=>responseJson(response,Session)).then(value=>{if(!c.signal.aborted){setSession(value);if(failed)setError('Авторизация hh.ru не завершена. Попробуйте снова.');}}).catch(e=>{if(!c.signal.aborted)setError(e.message);});
  return()=>controller.current?.abort();
 },[]);
 async function fetchResponse(path:string,signal:AbortSignal,body?:unknown){const response=await fetch('/api/mvp/hh'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.any([signal,AbortSignal.timeout(20000)]),cache:'no-store'});if(response.status===401||response.status===403){setSession({configured:true,authenticated:false});setItems(null);setChosen('');onSelect(null);}return response;}
 async function run(work:(signal:AbortSignal)=>Promise<void>){
  if(busy)return;controller.current?.abort();const c=new AbortController();controller.current=c;setBusy(true);setError('');
  try{await work(c.signal);}catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'Не удалось выполнить действие.');}finally{if(!c.signal.aborted)setBusy(false);}
 }
 return <div>
  <div className="upload-area">
   <strong>Сначала авторизация в hh.ru</strong>
   <p>Источником опыта будет выбранное резюме из вашего аккаунта. Пароль вводится только на сайте hh.ru.</p>
   {!session?.authenticated?<button type="button" className="button secondary" disabled={!session?.configured||busy} onClick={()=>void run(async signal=>{
    const data=await responseJson(await fetchResponse('/start',signal,{}),z.object({url:z.string().url()}));const url=new URL(data.url);
    if(url.origin!=='https://hh.ru'||url.pathname!=='/oauth/authorize')throw new Error('Неверный адрес авторизации.');window.location.assign(url.href);
   })}>Войти в hh.ru</button>:<button type="button" className="button secondary" disabled={busy} onClick={()=>void run(async signal=>{
    await responseJson(await fetchResponse('/logout',signal,{}),z.object({ok:z.literal(true)}));onSelect(null);setItems(null);setChosen('');setSession({configured:true,authenticated:false});
   })}>Отключить hh.ru в JobMatch</button>}
   <button type="button" className="button resume-picker" disabled={!session?.authenticated||busy} onClick={()=>void run(async signal=>{
    const data=await responseJson(await fetchResponse('/resumes',signal),List);setItems(data.items);
   })}>{busy?'Подождите…':'Выбрать резюме из списка'}</button>
  </div>
  <p id="hh-resume-unavailable" className="hh-picker-notice" role="status">{!session?(error?'Не удалось проверить подключение hh.ru. Повторите проверку.':'Проверяем подключение hh.ru…'):!session.configured?'Подключение hh.ru ещё не настроено владельцем приложения. Вход и выбор резюме пока недоступны.':session.authenticated?'Авторизация соискателя подтверждена hh.ru. Выберите своё резюме. Сессия JobMatch действует до одного часа.':'Войдите через официальную авторизацию hh.ru и разрешите доступ. Простое наличие открытой вкладки hh.ru не заменяет авторизацию JobMatch.'}</p>
  {error&&<div><p className="error" role="alert">{error}</p><button type="button" className="button secondary" disabled={busy} onClick={()=>void run(async signal=>{const value=await responseJson(await fetchResponse('/session',signal),Session);setSession(value);if(!value.authenticated){onSelect(null);setItems(null);setChosen('');}})}>Проверить подключение снова</button></div>}
  {items&&<div aria-label="Ваши резюме hh.ru">{items.length===0?<p>В аккаунте пока нет резюме.</p>:items.map(item=><button key={item.id} type="button" className="button secondary" disabled={busy} aria-pressed={chosen===item.id} onClick={()=>void run(async signal=>{
   onSelect(null);setChosen('');const data=await responseJson(await fetchResponse('/select',signal,{id:item.id}),ImportedResumeSchema);onSelect(data);setChosen(item.id);
  })}>{item.title}</button>)}</div>}
  {chosen&&<p role="status">Резюме выбрано. Для адаптации используются опыт, навыки и образование; отдельные поля контактов и фотографии исключены. Проверьте, нет ли личных данных внутри описания опыта. Запись в hh.ru и отправка отклика не выполняются.</p>}
 </div>;
}
