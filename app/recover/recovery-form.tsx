'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {requestJson,RequestError} from '../../lib/client-api';
import {mailFailure,type MailStage} from '../../lib/mail-feedback';
import {mailCopy} from '../../lib/i18n/mail';
import {normalizeLocale,type UiLocale} from '../../lib/i18n/locale';
import {z} from 'zod';
type RecoveryError={key:'invalidLink'|'mismatch'}|{status:number;stage:MailStage};
export default function RecoveryForm({initialCode,invalid,locale:requestedLocale='ru'}:{initialCode:string;invalid:boolean;locale?:UiLocale}){
 const locale=normalizeLocale(requestedLocale),t=mailCopy[locale].recovery;
 const [code,setCode]=useState(initialCode),[stage,setStage]=useState<MailStage|'done'>(initialCode?'exchange':'request');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<RecoveryError|null>(invalid?{key:'invalidLink'}:null),[notice,setNotice]=useState<'requested'|'updated'|'sessionsUnknown'|null>(null);
 const pending=useRef(false),active=useRef(true);
 useEffect(()=>{active.current=true;window.history.replaceState(null,'','/recover');return()=>{active.current=false;};},[]);
 async function submit(){
  if(stage==='done'||pending.current)return;
  if(stage==='update'&&password!==repeat){setError({key:'mismatch'});return;}
  pending.current=true;setBusy(true);setError(null);setNotice(null);
  try{
   const data=await requestJson('/api/recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(stage==='request'?{action:'request',email}:stage==='exchange'?{action:'exchange',code}:{action:'update',password})});
   if(!active.current)return;
   const ack=z.object({ok:z.literal(true),sessionsRevoked:z.boolean().optional()}).strict().parse(data);
   if(stage==='request')setNotice('requested');
   if(stage==='exchange'){setCode('');setStage('update');}
   if(stage==='update'){setStage('done');setNotice(ack.sessionsRevoked===true?'updated':'sessionsUnknown');}
  }catch(error){if(active.current)setError({status:error instanceof RequestError?error.status:502,stage});}
  finally{pending.current=false;if(active.current){setPassword('');setRepeat('');setBusy(false);}}
 }
 return <section className="card" lang={locale}><h1>{t.title}</h1><p>{t.help}</p><form onSubmit={event=>{event.preventDefault();void submit();}}>
 {stage==='request'&&<label>{t.email}<input type="email" required maxLength={200} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {stage==='exchange'&&<p>{t.exchangeHelp}</p>}
 {stage==='update'&&<><label>{t.password}<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>{t.repeat}<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)}/></label><p>{t.length}</p></>}
 {error&&<p role="alert" className="error">{'key' in error?t[error.key]:mailFailure(error.status,error.stage,locale)}</p>}{notice&&<p role="status" className="notice">{t[notice]}</p>}
 {stage!=='done'&&<button className="primary" disabled={busy}>{busy?t.busy:t[stage]}</button>}
 {stage!=='request'&&stage!=='done'&&<button type="button" disabled={busy} onClick={()=>{setCode('');setPassword('');setRepeat('');setError(null);setStage('request');}}>{t.restart}</button>}
 </form><p><Link href="/">{t.login}</Link></p><p><Link href="/confirm-email">{t.confirm}</Link></p></section>;
}
