'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {FULL_NOTICE,ACCOUNT_FULL_POLICY,validateFullResume} from '../mvp/full-resume-consent';
import RewritePreviewPanel from './rewrite-preview-panel';
import {validateAuthAck} from '../lib/auth-contract';
import type {RewriteFact} from '../mvp/rewrite-draft';
const Status=z.object({subject:z.string().uuid(),consent:z.object({id:z.string().uuid(),policy:z.literal(ACCOUNT_FULL_POLICY),granted:z.boolean(),revision:z.number().int().min(0)}).nullable()}).strict();
type Account=z.infer<typeof Status>;
function sameAccount(a:Account,b:Account){
 return a.subject===b.subject&&a.consent?.id===b.consent?.id&&a.consent?.revision===b.consent?.revision&&a.consent?.granted===b.consent?.granted;
}
async function api(body?:unknown,signal?:AbortSignal){const response=await fetch('/api/rewrite-pilot',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store',signal});if(!response.ok)throw Error('PILOT_UNAVAILABLE');return response.json();}
/** AI-only entry. Existing local adaptation never depends on authentication. */
export default function PrincipalRewritePanel({resume,enabled=false}:{resume:string;enabled?:boolean}){return enabled?<Panel key={resume} resume={resume}/>:null;}
function Panel({resume}:{resume:string}){
 const [account,setAccount]=useState<Account|null>(null),[accepted,setAccepted]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState('Проверяем доступ к ИИ…'),[busy,setBusy]=useState(false),[result,setResult]=useState<{source:RewriteFact[];output:unknown}|null>(null);
 const active=useRef<AbortController|null>(null),statusCheck=useRef<AbortController|null>(null);
 const epoch=useRef(0),currentAccount=useRef<Account|null>(null),mutation=useRef(false),locallySignedOut=useRef(false);
 const [checking,setChecking]=useState(true),[mutating,setMutating]=useState(false);
 const remember=useCallback((value:Account|null)=>{currentAccount.current=value;setAccount(value);},[]);
 const invalidate=useCallback(()=>{
  epoch.current++;active.current?.abort();active.current=null;statusCheck.current?.abort();statusCheck.current=null;
  setChecking(false);setBusy(false);setResult(null);setAccepted(false);
 },[]);
 useEffect(()=>{
  const generation=epoch,owned=active,checks=statusCheck;
  let alive=true;
  function refresh(){
   if(mutation.current||locallySignedOut.current)return;
   const expected=currentAccount.current,version=generation.current,initial=expected===null;
   checks.current?.abort();
   const controller=new AbortController();checks.current=controller;setChecking(true);
   const applicable=()=>alive&&checks.current===controller&&version===generation.current;
   void api(undefined,AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]))
    .then(value=>{
     if(!applicable())return;
     const next=Status.parse(value);
     if(expected&&!sameAccount(expected,next)){
      invalidate();
      // Do not reveal any prior draft to a different authenticated account.
      remember(expected.subject===next.subject?next:null);
      setMessage('Аккаунт или согласие изменились. Черновик не показан.');
      return;
     }
     remember(next);if(initial)setMessage('');
    }).catch(()=>{
     if(!applicable())return;
     invalidate();remember(null);
     setMessage('Не удалось подтвердить доступ к ИИ. Локальная адаптация остаётся доступна.');
    }).finally(()=>{
     if(applicable()){checks.current=null;setChecking(false);}
    });
  }
  refresh();window.addEventListener('focus',refresh);
  return()=>{alive=false;generation.current++;checks.current?.abort();owned.current?.abort();mutation.current=false;window.removeEventListener('focus',refresh);};
 },[invalidate,remember]);
 function beginMutation(){
  if(mutation.current)return null;
  invalidate();mutation.current=true;setMutating(true);return epoch.current;
 }
 function endMutation(version:number){
  if(epoch.current===version){mutation.current=false;setMutating(false);}
 }
 async function login(){
  const version=beginMutation();if(version===null)return;
  try{
   const r=await fetch('/api/pilot-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',email,password})});
   if(epoch.current!==version)return;setPassword('');if(!r.ok)throw Error();
   validateAuthAck(await r.json());const status=Status.parse(await api());if(epoch.current!==version)return;
   locallySignedOut.current=false;remember(status);setMessage('Вход выполнен. Согласие проверено для текущего аккаунта.');
  }catch{if(epoch.current===version){remember(null);setMessage('Вход или доступ к пилоту не подтверждён. Локальная адаптация не требует входа.');}}
  finally{endMutation(version);}
 }
 async function logout(){
  const version=beginMutation();if(version===null)return;
  locallySignedOut.current=true;remember(null);setMessage('ИИ заблокирован до нового входа.');
  try{
   const r=await fetch('/api/pilot-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});
   if(!r.ok)throw Error();
   const outcome=z.object({ok:z.literal(true),localSignedOut:z.literal(true),serverRevoked:z.boolean()}).strict().parse(await r.json());
   if(epoch.current===version)setMessage(outcome.serverRevoked?'Выход выполнен.':'Вы вышли в этом браузере. Отзыв серверной сессии не подтверждён; ранее выданная сессия может оставаться действительной.');
  }catch{if(epoch.current===version)setMessage('Серверный выход не подтверждён. ИИ здесь отключён; закройте вкладку на общем устройстве.');}
  finally{endMutation(version);}
 }
 async function consent(grant:boolean){
  if(!account)return;const version=beginMutation();if(version===null)return;
  try{
   const status=Status.parse(await api({action:grant?'grant':'revoke',expectedSubject:account.subject,expectedRevision:account.consent?.revision??0,policy:ACCOUNT_FULL_POLICY}));
   if(epoch.current!==version)return;
   if(status.subject!==account.subject||status.consent?.granted!==grant)throw Error();
   remember(status);setMessage(grant?'Согласие сохранено для текущего аккаунта. Ничего не отправлено.':'Согласие отозвано. Ранее переданные данные нельзя отозвать.');
  }catch{if(epoch.current===version){remember(null);setMessage('Изменение согласия не подтверждено. ИИ заблокирован до проверки доступа.');}}
  finally{endMutation(version);}
 }
 async function run(){
  if(!account?.consent?.granted||busy||checking||statusCheck.current||mutation.current||active.current)return;
  invalidate();
  const version=epoch.current,controller=new AbortController();active.current=controller;setBusy(true);
  try{
   validateFullResume(resume);
   const value=await api({action:'rewrite',expectedSubject:account.subject,requestId:crypto.randomUUID(),consentId:account.consent.id,consentRevision:account.consent.revision,policy:ACCOUNT_FULL_POLICY,resume},controller.signal);
   const current=Status.parse(await api(undefined,controller.signal));
   if(epoch.current!==version||controller.signal.aborted)return;
   if(value.subject===account.subject&&sameAccount(account,current)){setResult({source:value.source,output:value.output});}
   else{invalidate();remember(null);setMessage('Аккаунт или согласие изменились. Черновик не показан.');}
  }catch{if(epoch.current===version&&!controller.signal.aborted){setResult(null);setMessage('Черновик недоступен. Локальная адаптация и исходник не изменены.');}}
  finally{if(epoch.current===version){setBusy(false);active.current=null;}}
 }
 return <section className="source-card local-version-review" aria-label="ИИ только для авторизованного пользователя"><h2>ИИ-черновик: необязательный вход</h2><p>Локальная адаптация остаётся доступной без аккаунта.</p>{!account?<><label>Email JobMatch<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Пароль JobMatch<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={checking||mutating||!email||!password} onClick={()=>void login()}>Войти только для ИИ</button></>:<><p>Согласие относится к текущему подтверждённому аккаунту, не к любому пользователю браузера.</p><p>{FULL_NOTICE.replace('Согласие запоминается только в этом браузере','Согласие сохраняется для текущего аккаунта').replace('Не разрешайте на общем устройстве.','Выходите из аккаунта на общем устройстве.')}</p><p><a href="https://console.groq.com/docs/your-data" target="_blank" rel="noreferrer">Обработка данных Groq</a></p>{!checking&&<details><summary>Полный текст перед отправкой</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{resume}</pre></details>}{!account.consent?.granted?<><label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>Разрешаю Groq обрабатывать полный текст при последующих адаптациях по моей команде.</label><button disabled={!accepted||checking||mutating} onClick={()=>void consent(true)}>Сохранить согласие для аккаунта</button></>:<button disabled={mutating} onClick={()=>void consent(false)}>Отозвать согласие аккаунта</button>}<button disabled={!account.consent?.granted||busy||checking||mutating} onClick={()=>void run()}>Создать ИИ-черновик</button><button disabled={mutating} onClick={()=>void logout()}>Выйти из ИИ-аккаунта</button></>}{busy&&!checking&&<button onClick={()=>{invalidate();setMessage('Ожидание отменено; уже переданные данные нельзя отозвать.');}}>Отменить ожидание</button>}<p role="status">{checking?'Проверяем доступ к ИИ…':message}</p>{!checking&&result&&<RewritePreviewPanel source={result.source} output={result.output} onDismiss={()=>{setResult(null);setMessage('Предложения скрыты. Исходный текст не изменён.');}}/>}</section>;
}
