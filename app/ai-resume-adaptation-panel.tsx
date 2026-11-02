'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import type {Fact} from '../lib/engine';
import {adaptationEdits,renderAdaptation,validateAdaptation,type AdaptationPreview} from '../lib/ai-resume-adaptation';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {adaptationCopy} from '../lib/i18n/ai-panels';
import {readAiUiResponse,discardAiUiResponse,AI_UI_TIMEOUT_MS} from '../lib/ai-ui-response';
type Props={facts:Fact[];original:string;vacancy:string;revision:number;ownerId?:string;disabled:boolean;locale?:UiLocale;onBoundaryError?:(status:number)=>void};
export default function AiResumeAdaptationPanel(props:Props){return <BoundAdaptation key={JSON.stringify([props.ownerId,props.revision,props.original,props.vacancy,props.facts,props.disabled])} {...props}/>;}
function BoundAdaptation({facts,original,vacancy,revision,ownerId,disabled,locale:requestedLocale='ru',onBoundaryError}:Props){
 const locale=normalizeLocale(requestedLocale),t=adaptationCopy[locale];
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<'error'|'unavailable'|null>(null),[preview,setPreview]=useState<AdaptationPreview|null>(null),[selected,setSelected]=useState<string[]>([]),[accepted,setAccepted]=useState(false),[draft,setDraft]=useState('');
 const active=useRef<AbortController|null>(null),timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=null;},[]);
 async function run(){
  if(active.current||disabled||!consent||!ownerId)return;
  const controller=new AbortController();active.current=controller;
  const timer=setTimeout(()=>controller.abort(),AI_UI_TIMEOUT_MS);timerRef.current=timer;
  setBusy(true);setError(null);setPreview(null);setSelected([]);setAccepted(false);setDraft('');
  try{
   const response=await fetch('/api/ai-resume-adaptation',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,revision,expectedOwnerId:ownerId})});
   if(active.current!==controller||controller.signal.aborted)return;
   if(!response.ok){discardAiUiResponse(response);setError(response.status===503?'unavailable':'error');if([401,409].includes(response.status))onBoundaryError?.(response.status);return;}
   const value=await readAiUiResponse(response,controller.signal);
   if(active.current!==controller||controller.signal.aborted)return;
   const data=z.object({ownerId:z.literal(ownerId),revision:z.literal(revision),preview:z.unknown()}).strict().parse(value);
   setPreview(validateAdaptation(data.preview,facts,original,vacancy));
  }catch{if(active.current===controller)setError('error');}
  finally{clearTimeout(timer);if(timerRef.current===timer)timerRef.current=null;if(active.current===controller){active.current=null;setBusy(false);if(controller.signal.aborted)setError('error');}}
 }
 const edits=preview?adaptationEdits(preview,facts,original,vacancy):[];
 return <section className="card localized-panel" lang={locale} aria-labelledby="ai-adaptation-title"><h2 id="ai-adaptation-title">{t.title}</h2><p>{t.help}</p><p className="muted">{t.lifetime}</p><p className="muted">{t.templateHint}</p>
 <label><input type="checkbox" checked={consent} disabled={busy||disabled||!ownerId} onChange={event=>{if(!busy&&!disabled&&ownerId)setConsent(event.target.checked);}}/>{t.consent}</label>
 {disabled&&<p>{t.dirty}</p>}<button type="button" disabled={busy||disabled||!ownerId||!consent} onClick={()=>void run()}>{busy?t.busy:t.run}</button>
 {error&&<p role="alert">{t[error]}</p>}
 {preview&&(edits.length?<div><p>{t.review}</p><ul>{edits.map(edit=><li key={edit.id}><label><input type="checkbox" checked={selected.includes(edit.id)} onChange={event=>{setSelected(current=>event.target.checked?[...current,edit.id]:current.filter(id=>id!==edit.id));setAccepted(false);setDraft('');}}/><span lang="">{edit.text}</span></label><ul>{preview.review.requirements.filter(row=>row.evidence_ids.includes(edit.evidence_ids[0])).map(row=><li key={row.quote}><blockquote lang="">{row.quote}</blockquote></li>)}</ul></li>)}</ul>
 <label><input type="checkbox" checked={accepted} disabled={!selected.length} onChange={event=>{setAccepted(event.target.checked);setDraft('');}}/>{t.accept}</label>
 <button type="button" disabled={!accepted||!selected.length} onClick={()=>setDraft(renderAdaptation(preview,selected,facts,original,vacancy))}>{t.preview}</button></div>:<p role="status">{t.empty}</p>)}
 {draft&&<label>{t.draft}<textarea readOnly value={draft} rows={16} lang=""/></label>}
 </section>;
}
