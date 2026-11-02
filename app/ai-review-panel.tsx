'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {validateAiReview,type AiReview} from '../lib/ai-review';
import type {Fact} from '../lib/engine';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {aiReviewCopy,aiReviewStatusError,type AiReviewErrorKey} from '../lib/i18n/ai-panels';
import {readAiUiResponse,discardAiUiResponse,AI_UI_TIMEOUT_MS} from '../lib/ai-ui-response';
type Props={facts:Fact[];vacancy:string;revision:number;ownerId?:string;disabled:boolean;locale?:UiLocale;onBoundaryError?:(status:number)=>void};
/** Source/readiness changes revoke consent and results; language is presentation only. */
export default function AiReviewPanel(props:Props){return <BoundReview key={JSON.stringify([props.ownerId,props.revision,props.vacancy,props.facts.map(f=>[f.id,f.text,f.source,f.verified]),props.disabled])} {...props}/>;}
function BoundReview({facts,vacancy,revision,ownerId,disabled,locale='ru',onBoundaryError}:Props){
 const language=normalizeLocale(locale),t=aiReviewCopy[language];
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<AiReviewErrorKey|null>(null),[review,setReview]=useState<AiReview|null>(null);
 const active=useRef<AbortController|null>(null),timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=null;},[]);
 async function analyze(){
  if(active.current||busy||disabled||!consent||!ownerId)return;
  const controller=new AbortController();active.current=controller;setBusy(true);setError(null);setReview(null);
  const timer=setTimeout(()=>controller.abort(),AI_UI_TIMEOUT_MS);timerRef.current=timer;let stage:AiReviewErrorKey='network';
  const current=()=>active.current===controller&&!controller.signal.aborted;
  try{
   const response=await fetch('/api/ai-review',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,revision,expectedOwnerId:ownerId})});
   if(!current())return;
   if(!response.ok){discardAiUiResponse(response);setError(aiReviewStatusError(response.status));if([401,409].includes(response.status))onBoundaryError?.(response.status);return;}
   stage='invalid';const data=await readAiUiResponse(response,controller.signal);if(!current())return;
   const envelope=z.object({ownerId:z.literal(ownerId),revision:z.literal(revision),review:z.unknown()}).strict().parse(data);
   const validated=validateAiReview(envelope.review,facts,vacancy);if(current())setReview(validated);
  }catch{if(active.current===controller)setError(controller.signal.aborted?'timeout':stage);}
  finally{clearTimeout(timer);if(timerRef.current===timer)timerRef.current=null;if(active.current===controller){active.current=null;setBusy(false);if(controller.signal.aborted)setError('timeout');}}
 }
 return <section className="card localized-panel" lang={language} aria-labelledby="ai-review-title"><h2 id="ai-review-title">{t.title}</h2><p>{t.help}</p>
 <label><input type="checkbox" checked={consent} disabled={busy||disabled||!ownerId} onChange={event=>{if(!busy&&!disabled&&ownerId)setConsent(event.target.checked);}}/>{t.consent}</label>
 {disabled&&<p>{t.paused}</p>}{!ownerId&&<p>{t.owner}</p>}
 <button type="button" disabled={disabled||!ownerId||!consent||busy} onClick={()=>void analyze()}>{busy?t.busy:t.run}</button>
 {error&&<p role="alert" className="error">{t.errors[error]}</p>}
 {review&&<div role="status">{review.requirements.length===0?<p>{t.empty}</p>:<ul>{review.requirements.map(row=><li key={row.quote}><blockquote lang="">{row.quote}</blockquote>{row.evidence_ids.length?<ul>{row.evidence_ids.map(id=><li key={id} lang="">{facts.find(f=>f.id===id)?.text}</li>)}</ul>:<p>{t.noEvidence}</p>}</li>)}</ul>}</div>}
 </section>;
}
