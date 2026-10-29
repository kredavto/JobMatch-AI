'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {requestJson,RequestError,validatedAuthAck} from '../../lib/client-api';
import {mailFailure} from '../../lib/mail-feedback';
export default function ConfirmationForm(){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[cooldown,setCooldown]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),pending=useRef(false);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 async function submit(){
  if(pending.current||cooldown)return;
  pending.current=true;setBusy(true);setError('');setNotice('');
  try{
   validatedAuthAck(await requestJson('/api/auth-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})}));
   setNotice('Если аккаунт зарегистрирован и ожидает подтверждения, придёт письмо. Проверьте «Спам». Если вы ещё не создавали аккаунт, сначала зарегистрируйтесь.');
   setCooldown(true);timer.current=setTimeout(()=>setCooldown(false),60000);
  }catch(error){
   const status=error instanceof RequestError?error.status:502;
   setError(mailFailure(status,'request'));
   if(status===429){setCooldown(true);timer.current=setTimeout(()=>setCooldown(false),60000);}
  }finally{pending.current=false;setBusy(false);}
 }
 return <section className="card"><h1>Подтверждение почты</h1><p>Повторно запросите письмо для уже созданного аккаунта. Запрос не создаёт новый аккаунт и не меняет пароль.</p>
 <form onSubmit={event=>{event.preventDefault();void submit();}}><label>Электронная почта<input type="email" autoComplete="email" required maxLength={200} value={email} onChange={event=>setEmail(event.target.value)}/></label>
 {error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
 <button className="primary" disabled={busy||cooldown}>{busy?'Обрабатываем…':cooldown?'Повторить можно через минуту':'Запросить письмо подтверждения'}</button></form>
 <p><Link href="/">Войти или создать аккаунт</Link></p><p><Link href="/recover">Восстановить пароль</Link></p></section>;
}
