'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {requestJson} from '../../lib/client-api';
import {z} from 'zod';
export default function RecoveryForm({initialCode,invalid}:{initialCode:string;invalid:boolean}){
 const [code,setCode]=useState(initialCode),[stage,setStage]=useState<'request'|'exchange'|'update'|'done'>(initialCode?'exchange':'request');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(invalid?'Ссылка недействительна или истекла. Запросите новую.':''),[notice,setNotice]=useState('');
 useEffect(()=>{window.history.replaceState(null,'','/recover');},[]);
 async function submit(){
  if(stage==='done'||busy)return;
  if(stage==='update'&&password!==repeat){setError('Пароли не совпадают.');return;}
  setBusy(true);setError('');setNotice('');
  try{
   const data=await requestJson('/api/recovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(stage==='request'?{action:'request',email}:stage==='exchange'?{action:'exchange',code}:{action:'update',password})});
   const ack=z.object({ok:z.literal(true),sessionsRevoked:z.boolean().optional()}).strict().parse(data);
   if(stage==='request')setNotice('Если для адреса доступно восстановление, придет письмо. Проверьте «Спам» и откройте последнюю ссылку в этом же браузере в течение 10 минут.');
   if(stage==='exchange'){setCode('');setStage('update');}
   if(stage==='update'){setStage('done');setNotice(ack.sessionsRevoked===true?'Пароль изменён. Войдите с новым паролем.':'Пароль изменён, но завершение остальных сессий не подтверждено. Войдите и выполните выход из приложения для повторной попытки завершить сессии.');}
  }catch{setError('Не удалось завершить действие. Возможно, ссылка истекла, превышен лимит запросов или сервис недоступен. После ошибки сохранения сначала попробуйте войти с новым паролем.');}
  finally{setPassword('');setRepeat('');setBusy(false);}
 }
 return <section className="card"><h1>Восстановление доступа</h1><p>Пароль меняется только после проверки ссылки из письма. Старый пароль не нужен.</p><form onSubmit={event=>{event.preventDefault();void submit();}}>
 {stage==='request'&&<label>Электронная почта<input type="email" required maxLength={200} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {stage==='exchange'&&<p>Нажмите «Проверить ссылку», чтобы перейти к новому паролю.</p>}
 {stage==='update'&&<><label>Новый пароль<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Повторите пароль<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)}/></label><p>От 12 до 128 символов.</p></>}
 {error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
 {stage!=='done'&&<button className="primary" disabled={busy}>{busy?'Обрабатываем…':stage==='request'?'Получить письмо':stage==='exchange'?'Проверить ссылку':'Сохранить новый пароль'}</button>}
 {stage!=='request'&&stage!=='done'&&<button type="button" disabled={busy} onClick={()=>{setCode('');setPassword('');setRepeat('');setError('');setStage('request');}}>Запросить новую ссылку</button>}
 </form><p><Link href="/">Вернуться ко входу</Link></p></section>;
}
