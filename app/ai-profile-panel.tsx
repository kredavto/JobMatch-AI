'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {validateAiProfilePreview,type AiProfilePreview} from '../lib/ai-profile';
import {PROFILE_FIELDS,type StructuredProfile} from '../lib/structured-profile';
import {structuredProfileCopy} from '../lib/i18n/structured-profile';
import {structuredProposalCopy} from '../lib/i18n/structured-proposals';
import {aiProfileCopy,aiProfileStatusError,type AiProfileError} from '../lib/i18n/ai-profile';
import type {UiLocale} from '../lib/i18n/locale';
type Props={profile:StructuredProfile;disabled:boolean;locale:UiLocale;onConflict:()=>void};
/** Locale-only changes preserve preview/consent. Source/revision/disabled changes cancel owned work. */
export default function AiProfilePanel(props:Props){const p=props.profile;return <BoundProfilePreview key={JSON.stringify([p.ownerId,p.revision,p.workspace_revision,p.source_workspace_revision,p.source_original,p.source_fact_ids,p.source_matches,props.disabled])} {...props}/>;}
function BoundProfilePreview({profile,disabled,locale,onConflict}:Props){
 const t=aiProfileCopy(locale),p=structuredProfileCopy(locale),warnings=structuredProposalCopy(locale).warnings;
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<AiProfileError|null>(null),[preview,setPreview]=useState<AiProfilePreview|null>(null);
 const active=useRef<AbortController|null>(null),timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;if(timerRef.current)clearTimeout(timerRef.current);},[]);
 function cancel(){const controller=active.current;active.current=null;controller?.abort();if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=null;setBusy(false);setConsent(false);setPreview(null);setError('interrupted');}
 async function run(){
  if(active.current||disabled||!consent||!profile.source_matches)return;
  const controller=new AbortController();active.current=controller;setBusy(true);setConsent(false);setError(null);setPreview(null);
  const timer=setTimeout(()=>controller.abort(),25000);timerRef.current=timer;
  try{
   const response=await fetch('/api/ai-profile',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','x-jobmatch-owner':profile.ownerId},body:JSON.stringify({consent:true,expectedOwnerId:profile.ownerId,workspaceRevision:profile.workspace_revision,profileRevision:profile.revision})});
   if(active.current!==controller)return;if(controller.signal.aborted){setError('interrupted');return;}
   if(!response.ok){setError(aiProfileStatusError(response.status));if([401,409].includes(response.status))onConflict();return;}
   const value:unknown=await response.json();if(active.current!==controller)return;if(controller.signal.aborted){setError('interrupted');return;}
   let result:AiProfilePreview;
   try{const envelope=z.object({ownerId:z.literal(profile.ownerId),workspaceRevision:z.literal(profile.workspace_revision),profileRevision:z.literal(profile.revision),preview:z.unknown()}).strict().parse(value);result=validateAiProfilePreview(envelope.preview,profile.source_original);}catch{setError('invalid');return;}
   setPreview(result);
  }catch(cause){if(active.current===controller)setError(controller.signal.aborted?'interrupted':cause instanceof TypeError?'network':'invalid');}
  finally{clearTimeout(timer);if(timerRef.current===timer)timerRef.current=null;if(active.current===controller){active.current=null;setBusy(false);}}
 }
 function download(){
  if(disabled||busy||!preview)return;let url:string|undefined;
  try{url=URL.createObjectURL(new Blob([JSON.stringify({format:'jobmatch-ai-profile-preview-export-v1',ownerId:profile.ownerId,workspaceRevision:profile.workspace_revision,profileRevision:profile.revision,sourceOriginal:profile.source_original,sourceFactIds:profile.source_fact_ids,preview},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='jobmatch-ai-profile-preview.json';link.click();}
  catch{setError('download');}finally{if(url){const owned=url;setTimeout(()=>URL.revokeObjectURL(owned),1000);}}
 }
 return <section aria-labelledby="ai-profile-title"><h3 id="ai-profile-title">{t.title}</h3><p>{t.help}</p><p className="muted">{t.lifetime}</p>
 <label className="check"><input type="checkbox" disabled={disabled||busy} checked={consent} onChange={event=>setConsent(event.target.checked)}/>{t.consent}</label>
 <button type="button" disabled={disabled||busy||!consent} onClick={()=>void run()}>{busy?t.busy:t.run}</button>{busy&&<button type="button" onClick={cancel}>{t.cancel}</button>}
 {error&&<p role="alert" className="error">{t.errors[error]}</p>}
 {preview&&<><button type="button" onClick={()=>{setPreview(null);setConsent(false);setError(null);}}>{t.close}</button><button type="button" disabled={disabled||busy} onClick={download}>{t.download}</button>
 <p role="status">{t.summary(preview.candidates.length,preview.sourceBlocks.eligible,preview.sourceBlocks.excluded)}</p>{preview.candidates.length===0&&<p>{t.empty}</p>}
 <dl><dt>{t.model}</dt><dd lang="">{preview.origin.model}</dd><dt>{t.digest}</dt><dd lang="" className="ai-profile-source">{preview.origin.operatorDeclaredModelDigest}</dd></dl><p>{t.date}</p>
 {preview.candidates.map((candidate,index)=><article key={index} className="structured-entry"><h4>{p.kinds[candidate.kind]}</h4><details><summary>{t.context}</summary><blockquote lang="" className="ai-profile-source">{candidate.context.quote}</blockquote></details>
 <dl>{PROFILE_FIELDS.filter(name=>name!=='credential'||candidate.kind==='certification').map(name=><div key={name}><dt>{p.fields[name]}</dt><dd>{candidate.fields[name]?<><span lang="" className="ai-profile-source">{candidate.fields[name]!.quote}</span> <small>{p.range(candidate.fields[name]!.start,candidate.fields[name]!.end)}</small></>:t.unknown}</dd></div>)}</dl>
 {candidate.warnings.map(warning=><p key={warning} role="note">{warnings[warning]}</p>)}</article>)}</>}
 </section>;
}
