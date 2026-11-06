'use client';
import RewriteVersionStorage,{type StorageCandidate} from './rewrite-version-storage';
import type {RewriteSaveResult} from '../lib/ai-rewrite-storage-ui';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import type {UiLocale} from '../lib/i18n/locale';
import {normalizeLocale} from '../lib/i18n/locale';
import {rewriteEditorCopy} from '../lib/i18n/ai-rewrite-editor';
import {eligibleRewriteFacts,validateRewriteUiPreview,validateRewriteUiConfirmation,type RewriteUiSource} from '../lib/ai-rewrite-review-ui';
import {prepareRewriteReview} from '../lib/ai-rewrite-review';
import {readAiUiResponse,discardAiUiResponse,AI_UI_TIMEOUT_MS} from '../lib/ai-ui-response';
type Preview=Awaited<ReturnType<typeof validateRewriteUiPreview>>;
type Prepared=Awaited<ReturnType<typeof prepareRewriteReview>>;
type Confirmation=Awaited<ReturnType<typeof validateRewriteUiConfirmation>>;
type Choice={action:''|'keep-source'|'accept-proposal'|'edit';text:string;reviewed:boolean};
type Draft={localId:number;context:string;source:RewriteUiSource;preview:Preview;choices:Record<string,Choice>;epoch:number};
type Local={draft:Draft|null;backup:Draft|null;nextId:number;acks:{key:string;ids:string[]};confirmed:{key:string;value:Confirmation}|null};
type ErrorKind='error'|'unavailable'|'rate'|'timeout'|'limit';
type Gate={current:AbortController|null};
type Props={onSave?:(candidate:StorageCandidate,signal:AbortSignal)=>Promise<RewriteSaveResult>;storageBusy?:boolean;source:RewriteUiSource;active:boolean;disabled:boolean;locale?:UiLocale;onBoundaryError?:(status:number)=>void};
class UiFailure extends Error{constructor(readonly status:number){super('REWRITE_REQUEST_FAILED');}}
async function post(path:string,body:unknown,signal:AbortSignal){
 const response=await fetch(path,{method:'POST',cache:'no-store',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(response.status!==200){discardAiUiResponse(response);throw new UiFailure(response.status);}
 if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){discardAiUiResponse(response);throw new UiFailure(0);}
 return readAiUiResponse(response,signal);
}
/** Mounted only for the current active source; unmount revokes consent and cancels the request. */
function RequestAction<T>({locale,gateRef,pending,onPending,consentLabel,label,operation,onAccepted,onError,disabled=false}:{locale:UiLocale;gateRef:Gate;pending:boolean;onPending:(busy:boolean)=>void;consentLabel:string;label:string;operation:(signal:AbortSignal)=>Promise<T>;onAccepted:(value:T)=>void;onError:(kind:ErrorKind,status:number)=>void;disabled?:boolean}){
 const t=rewriteEditorCopy[locale],[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),active=useRef<AbortController|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{const c=active.current;active.current=null;c?.abort();if(timer.current)clearTimeout(timer.current);if(c&&gateRef.current===c){gateRef.current=null;onPending(false);}},[gateRef,onPending]);
 function cancel(){const c=active.current;active.current=null;c?.abort();if(timer.current)clearTimeout(timer.current);timer.current=null;if(c&&gateRef.current===c){gateRef.current=null;onPending(false);}setBusy(false);setConsent(false);if(c)onError('timeout',0);}
 async function run(){
  if(disabled||!consent||active.current||gateRef.current)return;
  const c=new AbortController();active.current=c;gateRef.current=c;timer.current=setTimeout(()=>c.abort(),AI_UI_TIMEOUT_MS);setBusy(true);onPending(true);
  try{const value=await operation(c.signal);if(active.current===c&&!c.signal.aborted){onAccepted(value);setConsent(false);}}
  catch(e){if(active.current===c){const status=e instanceof UiFailure?e.status:0;onError(c.signal.aborted?'timeout':status===503?'unavailable':status===429?'rate':status===413?'limit':[408,504].includes(status)?'timeout':'error',status);}}
  finally{if(timer.current&&active.current===c){clearTimeout(timer.current);timer.current=null;}if(active.current===c){active.current=null;if(gateRef.current===c){gateRef.current=null;onPending(false);}setBusy(false);}}
 }
 return <div><label><input type="checkbox" checked={consent} disabled={disabled||pending&&!busy} onChange={e=>{if(disabled||pending&&!busy)return;if(!e.target.checked)cancel();setConsent(e.target.checked);}}/>{consentLabel}</label><div className="actions"><button type="button" disabled={disabled||pending||!consent} onClick={()=>void run()}>{busy?t.busy:label}</button>{busy&&<button type="button" onClick={cancel}>{t.cancel}</button>}</div></div>;
}
/** Owner-keyed in Root. Local drafts survive navigation/pauses, never a reload or account change. */
export default function AiRewriteEditor({source,active,disabled,locale:requested='ru',onBoundaryError,onSave,storageBusy=false}:Props){
 const locale=normalizeLocale(requested),t=rewriteEditorCopy[locale],baseId=useId();
 const context=useMemo(()=>JSON.stringify([source.ownerId,source.revision,source.original,source.vacancy,source.facts]),[source.ownerId,source.revision,source.original,source.vacancy,source.facts]);
 const eligible=useMemo(()=>eligibleRewriteFacts(source),[source]);
 const [selection,setSelection]=useState<{context:string;ids:string[]}>({context:'',ids:[]}),[chosenLanguage,setLanguage]=useState<'ru'|'en'|null>(null);
 const language=chosenLanguage??locale;
 const [local,setLocal]=useState<Local>({draft:null,backup:null,nextId:1,acks:{key:'',ids:[]},confirmed:null});
 const [prepared,setPrepared]=useState<{key:string;value:Prepared|null}|null>(null),[pending,setPending]=useState(false),[error,setError]=useState<ErrorKind|null>(null),[generation,setGeneration]=useState(0),[now,setNow]=useState(0);
 const gateRef=useRef<AbortController|null>(null),draft=local.draft;
 const selected=selection.context===context?selection.ids.filter(id=>eligible.some(f=>f.id===id)):[];
 const key=draft?draft.localId+':'+draft.epoch:'',current=!!draft&&draft.context===context;
 const expired=!!draft&&now>=draft.preview.payload.expiresAt*1000;
 const decisions=useMemo(()=>{
  if(!draft)return null;
  const rows=draft.preview.payload.preview.source.facts.map(f=>({fact_id:f.id,...draft.choices[f.id]}));
  if(rows.some(r=>!r.action||!r.reviewed||r.action==='edit'&&!r.text.trim()))return null;
  return rows.map(r=>({fact_id:r.fact_id,reviewed:true,action:r.action,...(r.action==='edit'?{text:r.text}:{})}));
 },[draft]);
 useEffect(()=>{if(!active||!draft)return;const tick=()=>setNow(Date.now()),start=setTimeout(tick,0),clock=setInterval(tick,1000);return()=>{clearTimeout(start);clearInterval(clock);};},[active,draft]);
 useEffect(()=>{
  if(!active||disabled||!current||expired||!draft||!decisions)return;
  let live=true;void prepareRewriteReview(draft.preview.payload.preview,draft.source.original,decisions).then(value=>{if(live)setPrepared({key,value});}).catch(()=>{if(live)setPrepared({key,value:null});});return()=>{live=false;};
 },[active,disabled,current,expired,draft,decisions,key]);
 const review=prepared?.key===key?prepared.value:null,acks=local.acks.key===key?local.acks.ids:[];
 const allAcked=!!review&&acks.length===review.issues.length&&review.issues.every(i=>acks.includes(i.id));
 const confirmed=local.confirmed?.key===key&&current&&!expired;
 function fail(kind:ErrorKind,status:number){setError(kind);if([401,409].includes(status))onBoundaryError?.(status);}
 function handleChoiceChange(id:string,patch:Partial<Choice>,at:number){
  if(!active||disabled||gateRef.current||!draft||!current||at>=draft.preview.payload.expiresAt*1000)return;
  const proposal=draft.preview.payload.preview.claims.find(c=>c.fact_id===id);
  if(!proposal||patch.action==='accept-proposal'&&proposal.status!=='proposed'||patch.text!==undefined&&patch.text.length>2000)return;
  setLocal(old=>{if(!old.draft||old.draft.localId!==draft.localId)return old;const choices={...old.draft.choices,[id]:{...old.draft.choices[id],...patch,...(patch.action!==undefined||patch.text!==undefined?{reviewed:false}:{})}};return{...old,draft:{...old.draft,choices,epoch:old.draft.epoch+1},acks:{key:'',ids:[]},confirmed:null};});setError(null);
 }
 const locked=disabled||pending||!current||expired;
 const issueName=(kind:string)=>kind==='number-added'?t.numberAdded:kind==='number-removed'?t.numberRemoved:kind==='negation-added'?t.negationAdded:kind==='negation-removed'?t.negationRemoved:t.manualIssue;
 const storageCandidate:StorageCandidate|null=confirmed&&local.confirmed&&draft?{ownerId:draft.source.ownerId!,revision:draft.source.revision,receipt:local.confirmed.value.receipt,nonce:local.confirmed.value.payload.id,expiresAt:local.confirmed.value.payload.expiresAt}:null;
 return <>{active&&<section className="card localized-panel" lang={locale} id="ai-rewrite-editor" aria-labelledby={baseId+'title'}><h2 id={baseId+'title'}>{t.title}</h2><p>{t.help}</p><p>{t.notSaved}</p><p className="muted">{t.lifetime}</p>
 {disabled&&<p role="status">{t.paused}</p>}
 <fieldset style={{minWidth:0}} disabled={disabled||pending||!source.ownerId}><legend>{t.choose}</legend>{eligible.map(f=><label className="fact" key={f.id}><input type="checkbox" checked={selected.includes(f.id)} disabled={disabled||pending||selected.length>=12&&!selected.includes(f.id)} onChange={e=>{if(disabled||gateRef.current||!source.ownerId)return;const next=e.target.checked?[...selected,f.id]:selected.filter(id=>id!==f.id);if(next.length<=12)setSelection({context,ids:next});}}/><span lang="">{f.text}</span></label>)}{!eligible.length&&<p>{t.empty}</p>}<label htmlFor={baseId+'language'}>{t.language}</label><select id={baseId+'language'} value={language} onChange={e=>{if(disabled||gateRef.current)return;if(e.target.value==='ru'||e.target.value==='en')setLanguage(e.target.value);}}><option value="ru">{t.russian}</option><option value="en">{t.english}</option></select><p>{t.languageHelp}</p></fieldset>
 {active&&!disabled&&source.ownerId&&source.vacancy.trim()&&selected.length>0&&<RequestAction key={context+JSON.stringify([selected,language,generation])} locale={locale} gateRef={gateRef} pending={pending} onPending={setPending} consentLabel={t.previewConsent} label={t.run} onError={fail} operation={async signal=>{setLanguage(language);const captured={ownerId:source.ownerId,revision:source.revision,original:source.original,vacancy:source.vacancy,facts:source.facts.map(f=>({...f}))};const data=await post('/api/ai-rewrites',{consent:true,expectedOwnerId:captured.ownerId,revision:captured.revision,factIds:selected,requestedLanguage:language},signal);const value=await validateRewriteUiPreview(data,captured,selected,language);if(Date.now()>=value.payload.expiresAt*1000)throw new UiFailure(408);return{value,source:captured};}} onAccepted={({value,source:captured})=>{setLocal(old=>({draft:{localId:old.nextId,context,source:captured,preview:value,choices:Object.fromEntries(value.payload.preview.source.facts.map(f=>[f.id,{action:'',text:'',reviewed:false}])),epoch:0},backup:old.draft&&Object.values(old.draft.choices).some(c=>c.text.trim())?old.draft:old.backup,nextId:old.nextId+1,acks:{key:'',ids:[]},confirmed:null}));setError(null);}}/>}
 {draft&&<><p>{t.replace}</p>{!current&&<p role="status">{t.stale}</p>}{expired&&<p role="status">{t.expired}</p>}{draft.preview.payload.preview.source.facts.map((f,i)=>{const proposal=draft.preview.payload.preview.claims[i],choice=draft.choices[f.id];return <fieldset key={f.id} style={{minWidth:0}} disabled={locked} data-testid={'rewrite-fact-'+i}><legend>{i+1}. <span lang="">{f.text}</span></legend><h3>{t.original}</h3><pre lang="">{f.text}</pre><h3>{t.proposal}</h3>{proposal.status==='proposed'?<pre lang="">{proposal.text}</pre>:<p>{t.refused}</p>}<label htmlFor={baseId+'choice'+i}>{t.action}</label><select id={baseId+'choice'+i} value={choice.action} onChange={e=>{const value=e.target.value;if(value==='keep-source'||value==='accept-proposal'||value==='edit')handleChoiceChange(f.id,{action:value},Date.now());}}><option value="">{t.unset}</option><option value="keep-source">{t.keep}</option><option value="accept-proposal" disabled={proposal.status!=='proposed'}>{t.accept}</option><option value="edit">{t.edit}</option></select>{choice.action==='edit'&&<><label htmlFor={baseId+'manual'+i}>{t.manual}</label><textarea id={baseId+'manual'+i} value={choice.text} maxLength={2000} lang="" onChange={e=>handleChoiceChange(f.id,{text:e.target.value},Date.now())}/></>}<label><input type="checkbox" checked={choice.reviewed} disabled={locked||!choice.action} onChange={e=>handleChoiceChange(f.id,{reviewed:e.target.checked},Date.now())}/>{t.reviewed}</label></fieldset>;})}
 {!decisions&&<p>{t.complete}</p>}{prepared?.key===key&&!prepared.value&&<p role="alert">{t.limit}</p>}
 {review&&<><h3>{t.riskTitle}</h3>{!review.issues.length&&<p>{t.noIssues}</p>}{review.issues.map((row,i)=><div key={row.id}><p>{i+1}. {issueName(row.issue.kind)} · {row.basis==='source'?t.sourceBasis:t.proposalBasis}</p>{row.issue.before&&<p>{t.before}: <span lang="">{row.issue.before.quote}</span></p>}{row.issue.after&&<p>{t.after}: <span lang="">{row.issue.after.quote}</span></p>}<label><input type="checkbox" checked={acks.includes(row.id)} disabled={locked} onChange={e=>{if(locked||gateRef.current)return;const checked=e.target.checked;setLocal(old=>{if(!old.draft||old.draft.localId+':'+old.draft.epoch!==key)return old;const ids=old.acks.key===key?old.acks.ids:[];return{...old,acks:{key,ids:checked?[...new Set([...ids,row.id])]:ids.filter(id=>id!==row.id)},confirmed:null};});}}/>{t.ack}</label></div>)}<h3>{t.final}</h3><textarea readOnly value={review.text} rows={12} lang="" aria-label={t.final}/><ul>{review.rows.map(r=><li key={r.fact_id}>{r.origin==='source'?t.sourceOrigin:r.origin==='manual'?t.manualOrigin:t.modelOrigin}</li>)}</ul>
 {current&&!disabled&&!expired&&!confirmed&&<RequestAction key={context+key+review.reviewSha256+JSON.stringify(acks)} locale={locale} gateRef={gateRef} pending={pending} onPending={setPending} disabled={!allAcked} consentLabel={t.confirmConsent} label={t.confirm} onError={fail} operation={async signal=>{if(Date.now()>=draft.preview.payload.expiresAt*1000)throw new UiFailure(408);const confirmation={consent:true,reviewed:true,decisions,acknowledgedReviewSha256:review.reviewSha256,acknowledgedIssueIds:acks};const data=await post('/api/ai-rewrite-reviews',{...confirmation,receipt:draft.preview.receipt,expectedOwnerId:draft.source.ownerId,revision:draft.source.revision},signal);const value=await validateRewriteUiConfirmation(data,draft.source,draft.preview.receipt,confirmation);if(Date.now()>=value.payload.expiresAt*1000)throw new UiFailure(408);return value;}} onAccepted={value=>{setLocal(old=>({...old,confirmed:{key,value}}));setError(null);}}/>}
 {confirmed&&<p role="status">{t.confirmed}</p>}</>}
 </>}
 {local.backup&&<details><summary>{t.previous}</summary>{Object.entries(local.backup.choices).filter(([,c])=>c.text.trim()).map(([id,c],i)=><label key={id}>{t.manual} {i+1}<textarea readOnly value={c.text} lang=""/></label>)}</details>}
 {error&&<p role="alert">{t[error]}</p>}{(draft||local.backup)&&<button type="button" onClick={()=>{setGeneration(v=>v+1);setLocal(old=>({draft:null,backup:null,nextId:old.nextId+1,acks:{key:'',ids:[]},confirmed:null}));setSelection({context,ids:[]});setError(null);}}>{t.clear}</button>}
 </section>}{onSave&&<RewriteVersionStorage key={generation} active={active} busy={storageBusy} disabled={disabled||!current||expired} locale={locale} candidate={storageCandidate} onSave={onSave} onBoundaryError={onBoundaryError}/>}</>;
}
