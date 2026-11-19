import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import PrincipalRewritePanel from '../../../app/principal-rewrite-panel';
import {ACCOUNT_FULL_POLICY,resumeFacts} from '../../../mvp/full-resume-consent';
import '../../../app/globals.css';
const synthetic='Синтетический кандидат\nКоманда создала 12 отчётов в 2024 году.';
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];
type Consent={id:string;revision:number;granted:boolean;policy:typeof ACCOUNT_FULL_POLICY};
type Fake={subject:string|null;consents:Record<string,Consent>};
declare global{interface Window{__pilotRequests:Record<string,unknown>[];__pilotFail:boolean;__pilotDelay:boolean;__pilotRelease?:()=>void;__pilotSwitch:()=>void;}}
window.__pilotRequests=[];window.__pilotFail=false;window.__pilotDelay=false;
const read=():Fake=>JSON.parse(sessionStorage.getItem('synthetic-account-fixture')||'{"subject":null,"consents":{}}');
const save=(v:Fake)=>sessionStorage.setItem('synthetic-account-fixture',JSON.stringify(v));
window.__pilotSwitch=()=>{const v=read();v.subject=ids[1];save(v);};
// Test-only same-origin simulated handlers. Never forward any fetch to network.
window.fetch=async(input,init)=>{
 const path=String(input),v=read();const body=init?.body?JSON.parse(String(init.body)):null;
 const fail=()=>Response.json({error:'synthetic unavailable'},{status:403});
 if(path==='/api/pilot-auth'){
  if(body?.action==='login'){v.subject=body.email==='b@example.test'?ids[1]:ids[0];save(v);return Response.json({ok:true});}
  if(body?.action==='logout'){v.subject=null;save(v);return Response.json({ok:true});}return fail();
 }
 if(path!=='/api/rewrite-pilot'||!v.subject)return fail();
 const status=()=>({subject:v.subject,consent:v.consents[v.subject!]??null});
 if(!body)return Response.json(status());
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
 return Response.json({subject:v.subject,source:resumeFacts(body.resume),output:{suggestions:[{sourceId:'line-2',sourceQuote:'Команда создала 12 отчётов в 2024 году.',text:'В 2024 году команда создала 12 отчётов.'}]}});
};
function Harness(){const [text,setText]=useState(synthetic);return <main className="mvp-shell"><h1>Синтетический тест</h1><p>VACANCY_MARKER_NOT_FOR_PROVIDER</p><p>Локальный результат сохранён.</p><label>Тестовый исходник<textarea value={text} onChange={e=>setText(e.target.value)}/></label><PrincipalRewritePanel resume={text} enabled/></main>;}
createRoot(document.getElementById('root')!).render(<Harness/>);
