'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {requestJson,RequestError,validatedAuthAck} from '../../lib/client-api';
import {mailFailure} from '../../lib/mail-feedback';
import {mailCopy} from '../../lib/i18n/mail';
import {normalizeLocale,type UiLocale} from '../../lib/i18n/locale';
export default function ConfirmationForm({locale:requestedLocale='ru'}:{locale?:UiLocale}){
 const locale=normalizeLocale(requestedLocale),t=mailCopy[locale].confirmation;
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[cooldown,setCooldown]=useState(false),[error,setError]=useState<number|null>(null),[notice,setNotice]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),pending=useRef(false),active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
 async function submit(){
  if(pending.current||cooldown)return;
  pending.current=true;setBusy(true);setError(null);setNotice(false);
  try{
   const data=await requestJson('/api/auth-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
   if(!active.current)return;
   validatedAuthAck(data);setNotice(true);
   setCooldown(true);timer.current=setTimeout(()=>setCooldown(false),60000);
  }catch(error){
   if(!active.current)return;
   const status=error instanceof RequestError?error.status:502;
   setError(status);
   if(status===429){setCooldown(true);timer.current=setTimeout(()=>setCooldown(false),60000);}
  }finally{pending.current=false;if(active.current)setBusy(false);}
 }
 return <section className="card" lang={locale}><h1>{t.title}</h1><p>{t.help}</p>
 <form onSubmit={event=>{event.preventDefault();void submit();}}><label>{t.email}<input type="email" autoComplete="email" required maxLength={200} value={email} onChange={event=>setEmail(event.target.value)}/></label>
 {error!==null&&<p role="alert" className="error">{mailFailure(error,'request',locale)}</p>}{notice&&<p role="status" className="notice">{t.notice}</p>}
 <button className="primary" disabled={busy||cooldown}>{busy?t.busy:cooldown?t.cooldown:t.submit}</button></form>
 <p><Link href="/">{t.login}</Link></p><p><Link href="/recover">{t.recover}</Link></p></section>;
}
