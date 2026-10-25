'use client';
import {useEffect,useRef,useState} from 'react';
const MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export default function ResumeDownload({id,ownerId}:{id:string;ownerId?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[id,ownerId]);
 async function download(){
  if(active.current)return;
  if(!ownerId){setError('Обновите страницу перед скачиванием.');return;}
  const controller=new AbortController();active.current=controller;setBusy(true);setError('');
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
   const response=await fetch(`/api/resume-export?id=${encodeURIComponent(id)}&expectedOwnerId=${encodeURIComponent(ownerId)}`,{cache:'no-store',signal:controller.signal});
   if(!response.ok){
    const messages:Record<number,string>={401:'Сессия истекла. Войдите повторно и скачайте версию.',409:'Аккаунт изменился. Обновите страницу перед скачиванием.',404:'Версия не найдена. Обновите список резюме.',429:'Слишком много запросов. Повторите через минуту.',413:'Версия слишком велика для DOCX. Используйте TXT.'};
    throw new Error(messages[response.status]||'Не удалось подготовить DOCX. Повторите позже или скачайте TXT.');
   }
   if(response.headers.get('content-type')?.split(';')[0]!==MIME)throw new Error('Сервер вернул некорректный файл. Скачивание отменено.');
   const blob=await response.blob();
   const signature=new Uint8Array(await blob.slice(0,4).arrayBuffer());
   if(blob.size>2*1024*1024||signature.join(',')!=='80,75,3,4')throw new Error('Сервер вернул некорректный файл. Скачивание отменено.');
   if(active.current!==controller||controller.signal.aborted)return;
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jobmatch-resume.docx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){if(active.current===controller)setError(controller.signal.aborted?'Скачивание прервано по таймауту. Повторите попытку.':e instanceof TypeError?'Нет соединения с сервером. Повторите попытку.':e instanceof Error?e.message:'Не удалось скачать DOCX.');}
  finally{clearTimeout(timer);if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <div><button disabled={busy} aria-busy={busy} onClick={()=>void download()}>{busy?'Подготовка DOCX…':'Скачать DOCX'}</button>{error&&<p role="alert">{error}</p>}</div>;
}
