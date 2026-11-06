'use client';
import {useEffect,useRef,useState} from 'react';
import type {RewriteReceipt} from '../lib/ai-rewrite';
import type {ReviewedRewriteVersion} from '../lib/ai-rewrite-version';
import {rewriteStorageResponse,validateRewriteStorageRead,RewriteStorageFailure,type RewriteSaveResult} from '../lib/ai-rewrite-storage-ui';
import {AI_UI_TIMEOUT_MS} from '../lib/ai-ui-response';
import {rewriteStorageCopy} from '../lib/i18n/ai-rewrite-storage';
import type {UiLocale} from '../lib/i18n/locale';
export type StorageCandidate={ownerId:string;revision:number;receipt:RewriteReceipt;nonce:string;expiresAt:number};
type Attempt={candidate:StorageCandidate;status:'waiting'|'unknown'|'saved'|'found'|'unconfirmed';version?:ReviewedRewriteVersion};
type Props={active:boolean;busy:boolean;disabled:boolean;locale:UiLocale;candidate:StorageCandidate|null;onSave:(candidate:StorageCandidate,signal:AbortSignal)=>Promise<RewriteSaveResult>;onBoundaryError?:(status:number)=>void};
/** Unmount on navigation/source/decision changes to revoke consent while the
 * parent retains a possibly committed attempt for later manual reconciliation. */
function StorageConsent({locale,disabled,onSave}:{locale:UiLocale;disabled:boolean;onSave:()=>void}){
 const [checked,setChecked]=useState(false),t=rewriteStorageCopy[locale];
 return <><label><input type="checkbox" checked={checked} disabled={disabled} onChange={e=>setChecked(e.target.checked)}/>{t.consent}</label><button type="button" disabled={disabled||!checked} onClick={()=>{if(!disabled&&checked){setChecked(false);onSave();}}}>{t.save}</button></>;
}
/** Persists in the owner-keyed editor across navigation and draft changes.
 * Cancellation is outcome-unknown. Manual reads never replay/adopt a write.
 */
export default function RewriteVersionStorage({active,busy,disabled,locale,candidate,onSave,onBoundaryError}:Props){
 const t=rewriteStorageCopy[locale],key=candidate?candidate.ownerId+':'+candidate.nonce+':'+candidate.receipt.signature:'';
 const [attempt,setAttempt]=useState<Attempt|null>(null),[pending,setPending]=useState<'save'|'read'|null>(null);
 const controller=useRef<AbortController|null>(null),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{if(!active)controller.current?.abort();},[active]);
 async function run(kind:'save'|'read',consentKey?:string){
  if(controller.current||!active||busy||kind==='save'&&(disabled||!candidate||consentKey!==key||Date.now()>=candidate.expiresAt*1000)||kind==='read'&&!attempt)return;
  const captured=kind==='save'?candidate!:attempt!.candidate,c=new AbortController();controller.current=c;setPending(kind);
  const timer=setTimeout(()=>c.abort(),AI_UI_TIMEOUT_MS);
  if(kind==='save')setAttempt({candidate:captured,status:'waiting'});
  try{
   if(kind==='save'){
    const saved=await onSave(captured,c.signal);
    if(mounted.current)setAttempt({candidate:captured,status:'saved',version:saved.version});
   }else{
    const raw=await rewriteStorageResponse('/api/rewrite-versions?expectedOwnerId='+encodeURIComponent(captured.ownerId)+'&id='+encodeURIComponent(captured.nonce),{method:'GET'},c.signal);
    const found=await validateRewriteStorageRead(raw,captured.ownerId,captured.nonce,captured.receipt);
    if(mounted.current)setAttempt({candidate:captured,status:'found',version:found.version});
   }
  }catch(error){if(mounted.current){setAttempt({candidate:captured,status:kind==='save'?'unknown':'unconfirmed'});const status=error instanceof RewriteStorageFailure?error.status:0;if([401,409].includes(status))onBoundaryError?.(status);}}
  finally{clearTimeout(timer);if(controller.current===c)controller.current=null;if(mounted.current)setPending(null);}
 }
 if(!active||!candidate&&!attempt)return null;
 return <section className="card localized-panel" lang={locale} id="rewrite-version-storage"><h2>{t.title}</h2><p>{t.notAccepted}</p>
 {candidate&&!disabled&&attempt?.status!=='waiting'&&<StorageConsent key={key} locale={locale} disabled={disabled||busy||pending!==null||attempt?.candidate.nonce===candidate.nonce} onSave={()=>void run('save',key)}/>}
 {pending&&<><p role="status">{pending==='save'?t.busy:t.reading}</p><button type="button" onClick={()=>controller.current?.abort()}>{t.cancel}</button><p>{t.cancelHelp}</p></>}
 {attempt&&attempt.status!=='waiting'&&<><p role={attempt.status==='unknown'||attempt.status==='unconfirmed'?'alert':'status'}>{t[attempt.status==='unconfirmed'?'missing':attempt.status]}</p>
 {(attempt.status==='unknown'||attempt.status==='unconfirmed'||attempt.status==='found')&&<button type="button" disabled={busy||pending!==null} onClick={()=>void run('read')}>{t.read}</button>}
 {attempt.version&&<><h3>{t.readonly}</h3><pre lang="">{attempt.version.text}</pre></>}</>}
 </section>;
}
