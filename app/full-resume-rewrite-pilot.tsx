'use client';
import {useEffect,useRef,useState} from 'react';
import {FULL_CONSENT_KEY,FULL_NOTICE,readFullConsent,writeFullConsent} from '../mvp/full-resume-consent';
import {createFullResumeSession} from '../mvp/full-resume-session';
import RewritePreviewPanel from './rewrite-preview-panel';
type Props={resume:string;enabled?:boolean;send?:(body:unknown,signal:AbortSignal)=>Promise<unknown>};
/** Not imported by Home. Source changes remount and cancel the old session. */
export default function FullResumeRewritePilot(props:Props){return props.enabled&&props.send?<Pilot key={props.resume} {...props}/>:null;}
function Pilot({resume,send}:Props){
 const [ready,setReady]=useState(false),[raw,setRaw]=useState<string|null>(null),[accepted,setAccepted]=useState(false),[blocked,setBlocked]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<Awaited<ReturnType<ReturnType<typeof createFullResumeSession>['run']>>|null>(null);
 const session=useRef<ReturnType<typeof createFullResumeSession>|null>(null),generation=useRef(0);
 useEffect(()=>{
  const epoch=generation;let alive=true;let owned:ReturnType<typeof createFullResumeSession>|null=null;
  const refresh=()=>{generation.current++;owned?.cancel();setBusy(false);setResult(null);setAccepted(false);try{setRaw(localStorage.getItem(FULL_CONSENT_KEY));setBlocked(false);}catch{setBlocked(true);}};
  queueMicrotask(()=>{if(!alive)return;refresh();try{owned=createFullResumeSession(localStorage,(body,signal)=>send!(body,signal));session.current=owned;}catch{setBlocked(true);}setReady(true);});
  const changed=(event:StorageEvent)=>{if(alive&&(event.key===FULL_CONSENT_KEY||event.key===null))refresh();};window.addEventListener('storage',changed);
  return()=>{alive=false;epoch.current++;owned?.cancel();window.removeEventListener('storage',changed);};
 },[send]);
 function consent(granted:boolean){generation.current++;session.current?.cancel();setBusy(false);setResult(null);try{setRaw(writeFullConsent(localStorage,raw,granted));setBlocked(false);setAccepted(false);setMessage(granted?'Согласие сохранено только в этом браузере. Ничего не отправлено.':'Согласие отозвано. Будущие запросы остановлены; ранее переданные данные отозвать нельзя.');}catch{setBlocked(true);setMessage('Изменение согласия не сохранено. ИИ-запросы здесь заблокированы. Проверьте хранилище или перезагрузите страницу.');}}
 async function run(){if(busy||blocked||!readFullConsent(raw)||!session.current)return;const id=++generation.current;setBusy(true);setResult(null);setMessage('');try{const value=await session.current.run(resume);if(id===generation.current)setResult(value);}catch{if(id===generation.current)setMessage('ИИ-черновик не получен. Проверьте согласие и исключите чувствительные данные. Локальная адаптация не изменена.');}finally{if(id===generation.current)setBusy(false);}}
 return <section className="source-card local-version-review" aria-label="ИИ-черновик полного резюме"><h2>Необязательный ИИ-черновик</h2><p>{FULL_NOTICE}</p><details><summary>Полный текст для следующей адаптации</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{resume}</pre></details>
 {!readFullConsent(raw)?<><label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>Согласен на передачу полного текста Groq при последующих адаптациях по моей команде.</label><button className="button secondary" disabled={!ready||!accepted||blocked} onClick={()=>consent(true)}>Запомнить согласие в этом браузере</button></>:<button className="button secondary" onClick={()=>consent(false)}>Отозвать согласие на Groq</button>}
 <button className="button secondary" disabled={!ready||blocked||busy||!readFullConsent(raw)} onClick={()=>void run()}>Создать ИИ-черновик полного резюме</button>
 {busy&&<button className="button secondary" onClick={()=>{generation.current++;session.current?.cancel();setBusy(false);setMessage('Ожидание отменено. Уже отправленные данные нельзя отозвать.');}}>Отменить ожидание</button>}
 {message&&<p role="status">{message}</p>}{result&&<RewritePreviewPanel source={result.source} output={result.output}/>}
 </section>;
}
