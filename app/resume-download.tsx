'use client';
import {useEffect,useRef,useState} from 'react';
import {docxStatusError,versionsCopy,type DocxErrorKey} from '../lib/i18n/versions';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
const MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
type Props={id:string;ownerId?:string;locale?:UiLocale};
/** A different owner/version remounts request state; locale changes never do. */
export default function ResumeDownload(props:Props){return <BoundDownload key={JSON.stringify([props.ownerId??null,props.id])} {...props}/>;}
function BoundDownload({id,ownerId,locale:requestedLocale='ru'}:Props){
 const locale=normalizeLocale(requestedLocale),t=versionsCopy[locale].docx;
 const [busy,setBusy]=useState(false),[error,setError]=useState<DocxErrorKey|null>(null);
 const active=useRef<AbortController|null>(null),timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=null;},[]);
 async function download(){
  if(active.current)return;
  if(!ownerId){setError('owner');return;}
  const controller=new AbortController();active.current=controller;setBusy(true);setError(null);
  const timer=setTimeout(()=>controller.abort(),30000);timerRef.current=timer;
  try{
   const response=await fetch('/api/resume-export?id='+encodeURIComponent(id)+'&expectedOwnerId='+encodeURIComponent(ownerId),{cache:'no-store',signal:controller.signal});
   if(active.current!==controller||controller.signal.aborted)return;
   if(!response.ok){setError(docxStatusError(response.status));return;}
   if(response.headers.get('content-type')?.split(';')[0]!==MIME){setError('invalid');return;}
   const blob=await response.blob(),signature=new Uint8Array(await blob.slice(0,4).arrayBuffer());
   if(active.current!==controller||controller.signal.aborted)return;
   if(blob.size>2*1024*1024||signature.join(',')!=='80,75,3,4'){setError('invalid');return;}
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jobmatch-resume.docx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){if(active.current===controller)setError(controller.signal.aborted?'timeout':error instanceof TypeError?'network':'failed');}
  finally{clearTimeout(timer);if(timerRef.current===timer)timerRef.current=null;if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <div lang={locale}><button disabled={busy} aria-busy={busy} onClick={()=>void download()}>{busy?t.busy:t.download}</button>{error&&<p role="alert">{t.errors[error]}</p>}</div>;
}
