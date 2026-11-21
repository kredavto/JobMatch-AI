import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import PrincipalRewritePanel from '../../../app/principal-rewrite-panel';
import {adaptResume} from '../../../mvp/adapt';
import {applyLocalReviewedRewrite,localReviewCandidateIds} from '../../../mvp/local-reviewed-rewrite';
import {ACCOUNT_FULL_POLICY,resumeFacts} from '../../../mvp/full-resume-consent';
import '../../../app/globals.css';
const synthetic='Синтетический кандидат\n• Команда создала 12 отчётов в 2024 году.';
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
type Consent={id:string;revision:number;granted:boolean;policy:typeof ACCOUNT_FULL_POLICY};
type Fake={subject:string|null;consents:Record<string,Consent>};
declare global{interface Window{__pilotRequests:Record<string,unknown>[];__pilotFail:boolean;__pilotDelay:boolean;__pilotRelease?:()=>void;__pilotSwitch:()=>void;__pilotRevoke:()=>void;__pilotFailStatus?:boolean;__pilotHoldStatus?:boolean;__pilotStatusReleases:Array<()=>void>;}}
window.__pilotStatusReleases=[];window.__pilotRequests=[];window.__pilotFail=false;window.__pilotDelay=false;
const read=():Fake=>JSON.parse(sessionStorage.getItem('synthetic-account-fixture')||'{"subject":null,"consents":{}}');
const save=(v:Fake)=>sessionStorage.setItem('synthetic-account-fixture',JSON.stringify(v));
window.__pilotSwitch=()=>{const v=read();v.subject=ids[1];save(v);};
window.__pilotRevoke=()=>{const v=read();if(v.subject&&v.consents[v.subject]){v.consents[v.subject]={...v.consents[v.subject],granted:false,revision:v.consents[v.subject].revision+1};save(v);}};
// Test-only same-origin simulated handlers. Never forward any fetch to network.
window.fetch=async(input,init)=>{
 const path=String(input),v=read();const body=init?.body?JSON.parse(String(init.body)):null;
 const fail=()=>Response.json({error:'synthetic unavailable'},{status:403});
 if(path==='/api/pilot-auth'){
  if(body?.action==='login'){v.subject=body.email==='b@example.test'?ids[1]:ids[0];save(v);return Response.json({ok:true});}
  if(body?.action==='logout'){v.subject=null;save(v);return Response.json({ok:true,localSignedOut:true,serverRevoked:true});}return fail();
 }
 if(path!=='/api/rewrite-pilot'||!v.subject)return fail();
 const status=()=>({subject:v.subject,consent:v.consents[v.subject!]??null});
 if(!body){if(window.__pilotHoldStatus)await new Promise<void>(resolve=>window.__pilotStatusReleases.push(resolve));return window.__pilotFailStatus?fail():Response.json(status());}
 if(body.expectedSubject!==v.subject)return fail();
 if(body.action==='grant'||body.action==='revoke'){
  const old=v.consents[v.subject];if(body.expectedRevision!==(old?.revision??0))return fail();
  v.consents[v.subject]={id:crypto.randomUUID(),policy:ACCOUNT_FULL_POLICY,revision:(old?.revision??0)+1,granted:body.action==='grant'};save(v);return Response.json(status());
 }
 const consent=v.consents[v.subject];
 if(body.action!=='rewrite'||!consent?.granted||consent.id!==body.consentId||consent.revision!==body.consentRevision)return fail();
 window.__pilotRequests.push(body);
 if(window.__pilotDelay)await new Promise<void>(resolve=>{window.__pilotRelease=resolve;});
 if(window.__pilotFail)return fail();
 return Response.json({subject:v.subject,source:resumeFacts(body.resume),output:{suggestions:[{sourceId:'line-2',sourceQuote:'• Команда создала 12 отчётов в 2024 году.',text:'В 2024 году команда создала 12 отчётов.'}]}});
};
function Harness(){
 const [text,setText]=useState(synthetic),[selected,setSelected]=useState('Тестовая должность'),[preferred,setPreferred]=useState<ReturnType<typeof adaptResume>|null>(null),[context,setContext]=useState(0);
 const latest=useRef(0);
 const vacancy={title:selected,company:'Тест',url:'https://example.test',text:'VACANCY_MARKER_NOT_FOR_PROVIDER',skills:[]};
 const current=preferred??adaptResume(text,vacancy);
 return <main className="mvp-shell"><h1>Синтетический тест</h1><p>{vacancy.text}</p><p>Локальный результат сохранён.</p>
 <label>Тестовый исходник<textarea value={text} onChange={e=>{setPreferred(null);setText(e.target.value);}}/></label>
 <button onClick={()=>{setContext(++latest.current);setPreferred(null);setSelected('Другая должность');}}>Сменить тестовую вакансию</button>
 <p aria-label="Тестовый результат">{current.text}</p><p aria-label="Тестовое письмо">{current.coverLetter}</p>
 <PrincipalRewritePanel context={context} resume={text} enabled review={{
  choices:output=>localReviewCandidateIds(text,vacancy,current,output),
  save:(output,ids)=>{if(latest.current!==context)throw Error('STALE_LOCAL_REVIEW');setPreferred({...current,...applyLocalReviewedRewrite(text,vacancy,current,output,ids)});},
 }}/></main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
