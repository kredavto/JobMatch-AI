'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {validateAiReview,type AiReview} from '../lib/ai-review';
import type {Fact} from '../lib/engine';
export default function AiReviewPanel({facts,vacancy,revision,ownerId,disabled}:{facts:Fact[];vacancy:string;revision:number;ownerId?:string;disabled:boolean}){
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState<AiReview|null>(null);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 async function analyze(){
  if(busy||disabled||!consent||!ownerId)return;
  const controller=new AbortController();active.current=controller;setBusy(true);setError('');setReview(null);
  const timer=setTimeout(()=>controller.abort(),25000);
  try{
   const response=await fetch('/api/ai-review',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,revision,expectedOwnerId:ownerId})});
   const data:unknown=await response.json();
   if(!response.ok)throw new Error(response.status===503?'AI-разбор пока не подключён. Обычный анализ доступен.':response.status===409?'Данные изменились. Загрузите актуальный профиль.':'AI-разбор не завершён. Повторите по желанию.');
   let validated:AiReview;
   try{const envelope=z.object({ownerId:z.literal(ownerId),revision:z.literal(revision),review:z.unknown()}).strict().parse(data);validated=validateAiReview(envelope.review,facts,vacancy);}
   catch{throw new Error('Ответ AI не прошёл проверку цитат и фактов. Повторите разбор по желанию.');}
   if(!controller.signal.aborted)setReview(validated);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Не удалось проверить AI-разбор.');else if(active.current===controller)setError('AI-разбор прерван. Повторите по желанию.');}
  finally{clearTimeout(timer);if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <section className="card" aria-labelledby="ai-review-title"><h2 id="ai-review-title">AI-разбор требований</h2>
 <p>Модель предлагает связи между цитатами вакансии и подтверждёнными фактами. Проверьте смысл каждой связи: цитата не доказывает соответствие. Результат не меняет Match Score или резюме.</p>
 <label><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/> Разрешаю отправить сохранённый текст вакансии и подтверждённые допустимые факты на собственный AI-сервер оператора для этого запроса.</label>
 {disabled&&<p>Сначала сохраните изменения профиля и вакансии.</p>}
 <button type="button" disabled={disabled||!ownerId||!consent||busy} onClick={()=>void analyze()}>{busy?'Выполняем AI-разбор…':'Запустить AI-разбор'}</button>
 {error&&<p role="alert" className="error">{error}</p>}
 {review&&<div role="status">{review.requirements.length===0?<p>Проверяемые требования не выделены.</p>:<ul>{review.requirements.map(row=><li key={row.quote}><blockquote>{row.quote}</blockquote>{row.evidence_ids.length?<ul>{row.evidence_ids.map(id=><li key={id}>{facts.find(f=>f.id===id)?.text}</li>)}</ul>:<p>Связанные подтверждённые факты не предложены.</p>}</li>)}</ul>}</div>}
 </section>;
}
