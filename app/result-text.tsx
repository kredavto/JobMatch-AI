'use client';
import React,{useRef,useState} from 'react';
import {copyResultText} from '../mvp/copy-text';
export default function ResultText({id,label,text,rows=14}:{id:string;label:string;text:string;rows?:number}){
 const field=useRef<HTMLTextAreaElement>(null);
 const [status,setStatus]=useState<{text:string;message:string}|null>(null),[busy,setBusy]=useState(false);
 const active=useRef(0);
 function select(){field.current?.focus();field.current?.select();field.current?.setSelectionRange(0,text.length);setStatus({text,message:'Текст выделен. Используйте команду «Копировать» в меню устройства. Автоматическое копирование не выполнялось.'});}
 async function copy(){
  if(busy)return;const version=++active.current;setBusy(true);setStatus(null);
  const result=await copyResultText(text,navigator.clipboard?.writeText?value=>navigator.clipboard.writeText(value):undefined);
  if(active.current!==version)return;
  setBusy(false);
  if(result==='copied')setStatus({text,message:'Текст скопирован в буфер обмена.'});
  else if(result==='manual')select();
  else setStatus({text,message:'Не удалось подготовить текст для копирования.'});
 }
 return <div className="result-text">
  <label className="sr-only" htmlFor={id}>{label}</label><textarea ref={field} id={id} readOnly value={text} rows={rows} spellCheck={false}/>
  <div className="copy-actions"><button type="button" className="button secondary" disabled={busy||!text} onClick={()=>void copy()}>{busy?'Копируем…':`Копировать: ${label}`}</button><button type="button" className="button secondary" disabled={!text} onClick={select}>Выделить весь текст</button></div>
  {status?.text===text&&<p role="status">{status.message}</p>}
  <p className="clipboard-note">Копирование помещает текст в системный буфер, который может синхронизироваться между вашими устройствами. Перед вставкой проверьте содержание и адресата.</p>
 </div>;
}
