'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {validateAiReview,type AiReview} from '../lib/ai-review';
import type {Fact} from '../lib/engine';
import {aiReviewCopy,aiReviewStatusError,type AiReviewErrorKey} from '../lib/i18n/ai-review';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
type Props={facts:Fact[];vacancy:string;revision:number;ownerId?:string;disabled:boolean;locale?:UiLocale};
/** Locale preserves request/consent state. Owner or canonical revision changes invalidate it. */
export default function AiReviewPanel(props:Props){return <BoundAiReview key={JSON.stringify([props.ownerId??null,props.revision])} {...props}/>;}
function BoundAiReview({facts,vacancy,revision,ownerId,disabled,locale:requestedLocale='ru'}:Props){
 const locale=normalizeLocale(requestedLocale),t=aiReviewCopy[locale];
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<AiReviewErrorKey|null>(null),[review,setReview]=useState<AiReview|null>(null);
 const active=useRef<AbortController|null>(null),timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=null;},[]);
 async function analyze(){
  if(active.current||disabled||!consent||!ownerId)return;
  const controller=new AbortController();active.current=controller;setBusy(true);setError(null);setReview(null);
  const timer=setTimeout(()=>controller.abort(),25000);timerRef.current=timer;
  try{
   const response=await fetch('/api/ai-review',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,revision,expectedOwnerId:ownerId})});
   if(active.current!==controller)return;
   if(controller.signal.aborted){setError('interrupted');return;}
   if(!response.ok){setError(aiReviewStatusError(response.status));return;}
   let data:unknown;
   try{data=await response.json();}catch{if(active.current===controller)setError(controller.signal.aborted?'interrupted':'invalid');return;}
   if(active.current!==controller)return;
   if(controller.signal.aborted){setError('interrupted');return;}
   let validated:AiReview;
   try{const envelope=z.object({ownerId:z.literal(ownerId),revision:z.literal(revision),review:z.unknown()}).strict().parse(data);validated=validateAiReview(envelope.review,facts,vacancy);}
   catch{setError('invalid');return;}
   setReview(validated);
  }catch(error){if(active.current===controller)setError(controller.signal.aborted?'interrupted':error instanceof TypeError?'network':'failed');}
  finally{clearTimeout(timer);if(timerRef.current===timer)timerRef.current=null;if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <section className="card localized-panel" lang={locale} aria-labelledby="ai-review-title"><h2 id="ai-review-title">{t.title}</h2>
 <p>{t.help}</p><p className="muted">{t.lifetime}</p>
 <label><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/> {t.consent}</label>
 {disabled&&<p>{t.dirty}</p>}
 <button type="button" disabled={disabled||!ownerId||!consent||busy} onClick={()=>void analyze()}>{busy?t.busy:t.run}</button>
 {error&&<p role="alert" className="error">{t.errors[error]}</p>}
 {review&&<div role="status">{review.requirements.length===0?<p>{t.empty}</p>:<ul>{review.requirements.map(row=><li key={row.quote}><blockquote lang="">{row.quote}</blockquote>{row.evidence_ids.length?<ul>{row.evidence_ids.map(id=><li key={id} lang="">{facts.find(fact=>fact.id===id)?.text}</li>)}</ul>:<p>{t.noEvidence}</p>}</li>)}</ul>}</div>}
 </section>;
}
