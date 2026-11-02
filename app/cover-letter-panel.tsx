'use client';
import {useMemo,useState} from 'react';
import {composeLetter,letterEvidence,letterStyles,wordCount,type LetterStyle} from '../lib/cover-letter';
import {createLetterSnapshotJson} from '../lib/letter-snapshot';
import {reviewLetterEdit} from '../lib/letter-edit-review';
import LetterEditReviewPanel from './letter-edit-review-panel';
import SavedLettersPanel from './saved-letters-panel';
import type {Fact} from '../lib/engine';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {localLetterCopy,localLetterErrorText,type LocalLetterError} from '../lib/i18n/local-letter';
export default function CoverLetterPanel({facts,vacancy,ownerId,revision=0,profileOriginal='',locale:requestedLocale='ru',onBoundaryError,sourceDirty=false,disabled=false}:{facts:Fact[];vacancy:string;ownerId?:string;revision?:number;profileOriginal?:string;locale?:UiLocale;onBoundaryError?:(status:number)=>void;sourceDirty?:boolean;disabled?:boolean}){
 const language=normalizeLocale(requestedLocale),t=localLetterCopy[language];
 const available=useMemo(()=>letterEvidence(facts,vacancy),[facts,vacancy]);
 const [ids,setIds]=useState<string[]>([]),[style,setStyle]=useState<LetterStyle>('professional'),[text,setText]=useState(''),[original,setOriginal]=useState(''),[error,setError]=useState<LocalLetterError|null>(null),[accepted,setAccepted]=useState(false);
 const [source,setSource]=useState<{facts:string;vacancy:string}|null>(null),[reviewed,setReviewed]=useState<Set<string>>(()=>new Set());
 const [includeSource,setIncludeSource]=useState(false);
 const blocked=sourceDirty||disabled,stale=source!==null&&(source.facts!==JSON.stringify(facts)||source.vacancy!==vacancy);
 const editReview=useMemo(()=>{try{return original&&text.trim()?reviewLetterEdit(original,text):null;}catch{return null;}},[original,text]);
 const reviewComplete=!!editReview&&editReview.coverage==='bounded-lexical-only'&&editReview.issues.every(issue=>reviewed.has(issue.id));
 const count=wordCount(text),edited=text!==original;
 const serverSnapshot=useMemo(()=>{if(!original||!accepted||!reviewComplete||stale)return null;try{return createLetterSnapshotJson({facts,vacancy,selection:ids,style,generated:original,text,reviewedIssueIds:[...reviewed],wholeLetter:accepted});}catch{return null;}},[facts,vacancy,ids,style,original,text,reviewed,accepted,reviewComplete,stale]);
 function reset(){setIncludeSource(false);setSource(null);setReviewed(new Set());setText('');setOriginal('');setAccepted(false);setError(null);}
 function generate(){if(blocked)return;try{const draft=composeLetter(facts,vacancy,ids,style);setIncludeSource(false);setSource({facts:JSON.stringify(facts),vacancy});setReviewed(new Set());setText(draft.text);setOriginal(draft.text);setAccepted(false);setError(null);}catch{setError('generate');}}
 function download(format:'txt'|'json'='txt'){
  if((format==='json'&&!includeSource)||blocked||stale||!accepted||!reviewComplete||!text.trim()||!source)return;
  try{if(source.facts!==JSON.stringify(facts)||source.vacancy!==vacancy||composeLetter(facts,vacancy,ids,style).text!==original){setError('source');return;}
   const content=format==='json'?createLetterSnapshotJson({facts,vacancy,selection:ids,style,generated:original,text,reviewedIssueIds:[...reviewed],wholeLetter:accepted}):text;
   const url=URL.createObjectURL(new Blob([content],{type:format==='json'?'application/json;charset=utf-8':'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=format==='json'?'jobmatch-letter-snapshot.json':'jobmatch-cover-letter.txt';try{a.click();setError(null);}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch{setError('download');}
 }
 return <section id="cover-letter" className="card" lang={language} aria-label={t.region}><h2>{t.region}</h2><p className="muted">{t.documentHint}</p><p>{t.help}</p>
 {blocked&&<p className="notice">{t.blocked}</p>}{stale&&<p role="alert">{t.sourceChanged}</p>}
 {!available.length&&<p>{t.empty}</p>}
 {available.map(e=><label className="fact" key={e.id}><input type="checkbox" checked={ids.includes(e.id)} disabled={blocked||(ids.length>=5&&!ids.includes(e.id))} onChange={event=>{if(blocked)return;setIds(event.target.checked?[...ids,e.id]:ids.filter(id=>id!==e.id));reset();}}/><span><span lang="">{e.text}</span><small>{t.evidence}: <span lang="">{e.evidence_ids.join(', ')}</span></small></span></label>)}
 <label htmlFor="cover-letter-style">{t.style}</label><select id="cover-letter-style" disabled={blocked} value={style} onChange={e=>{if(blocked)return;setStyle(e.target.value as LetterStyle);reset();}}>{Object.keys(letterStyles).map(value=><option value={value} key={value}>{t.styles[value as LetterStyle]}</option>)}</select><p className="muted">{t.styleHelp}</p>
 <button disabled={blocked||!ids.length} onClick={generate}>{t.generate}</button>{error&&<p role="alert">{localLetterErrorText(error,language)}</p>}
 {original&&<><label htmlFor="cover-letter-text">{t.text}</label><textarea id="cover-letter-text" lang="" rows={12} maxLength={15000} value={text} onChange={e=>{setText(e.target.value);setIncludeSource(false);setAccepted(false);setReviewed(new Set());}}/><p role="status">{t.count(count)}</p>{(count<100||count>170)&&<p>{t.length}</p>}<p>{edited?t.edited:t.literal}</p><button disabled={blocked} onClick={()=>{if(blocked)return;setText(original);setIncludeSource(false);setAccepted(false);setReviewed(new Set());}}>{t.restore}</button><label className="check"><input type="checkbox" disabled={blocked||stale} checked={accepted} onChange={e=>{if(!blocked&&!stale)setAccepted(e.target.checked);}}/>{t.whole}</label>{!editReview&&text.trim()&&<p role="alert">{t.unavailable}</p>}{editReview&&<LetterEditReviewPanel locale={language} review={editReview} reviewed={reviewed} disabled={blocked||stale} onReview={(id,checked)=>{if(blocked||stale)return;setReviewed(current=>{const next=new Set(current);if(checked)next.add(id);else next.delete(id);return next;});}}/>}<button disabled={blocked||stale||!accepted||!reviewComplete||!text.trim()} onClick={()=>download()}>{t.downloadTxt}</button><p>{t.jsonHelp}</p><label className="check"><input type="checkbox" disabled={blocked||stale} checked={includeSource} onChange={e=>setIncludeSource(e.target.checked)}/>{t.sourceConsent}</label><button disabled={blocked||stale||!accepted||!reviewComplete||!text.trim()||!includeSource} onClick={()=>download('json')}>{t.downloadJson}</button></>}
 {ownerId&&<SavedLettersPanel locale={language} allowSave ownerId={ownerId} workspaceRevision={revision} original={profileOriginal} snapshotJson={serverSnapshot} disabled={blocked||stale} onBoundaryError={onBoundaryError}/>}
 </section>;
}
