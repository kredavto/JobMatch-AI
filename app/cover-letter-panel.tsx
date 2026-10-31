'use client';
import {useMemo,useState} from 'react';
import {composeLetter,letterEvidence,letterStyles,letterExport,LETTER_TEMPLATE_VERSIONS,wordCount,type LetterStyle} from '../lib/cover-letter';
import {reviewLetterEdit,validateReviewedLetterExport} from '../lib/letter-edit-review';
import LetterEditReviewPanel from './letter-edit-review-panel';
import type {Fact} from '../lib/engine';
import {letterCoachCopy,letterFailure,type LetterErrorKey} from '../lib/i18n/letter-coach';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
export default function CoverLetterPanel({facts,vacancy,locale:requestedLocale='ru',sourceDirty=false,disabled=false}:{facts:Fact[];vacancy:string;locale?:UiLocale;sourceDirty?:boolean;disabled?:boolean}){
 const locale=normalizeLocale(requestedLocale),t=letterCoachCopy[locale].letter,blocked=sourceDirty||disabled;
 const available=useMemo(()=>letterEvidence(facts,vacancy),[facts,vacancy]);
 const [outputLanguage,setOutputLanguage]=useState<UiLocale>(locale),[source,setSource]=useState<{facts:Fact[];vacancy:string;ids:string[];style:LetterStyle;language:UiLocale}|null>(null);
 const [ids,setIds]=useState<string[]>([]),[style,setStyle]=useState<LetterStyle>('professional'),[text,setText]=useState(''),[original,setOriginal]=useState(''),[error,setError]=useState<LetterErrorKey|null>(null),[accepted,setAccepted]=useState(false);
 const [reviewed,setReviewed]=useState<Set<string>>(()=>new Set());
 const editReview=useMemo(()=>original&&text.trim()?reviewLetterEdit(original,text):null,[original,text]);
 const reviewComplete=editReview!==null&&editReview.coverage!=='token-limit'&&editReview.issues.every(issue=>reviewed.has(issue.id));
 const count=wordCount(text),edited=text!==original;
 function reset(){setSource(null);setText('');setOriginal('');setAccepted(false);setReviewed(new Set());setError(null);}
 function generate(){if(blocked||!ids.length)return;try{const draft=composeLetter(facts,vacancy,ids,style,outputLanguage);setSource({facts:facts.filter(f=>draft.evidence_ids.includes(f.id)).map(f=>({id:f.id,text:f.text,source:f.source,verified:f.verified})),vacancy,ids:[...ids],style,language:outputLanguage});setText(draft.text);setOriginal(draft.text);setAccepted(false);setReviewed(new Set());setError(null);}catch(error){setError(letterFailure(error));}}
 function download(kind:'txt'|'json'){
  if(blocked||!accepted||!reviewComplete||!text.trim()||!source||!editReview)return;
  let packet:ReturnType<typeof letterExport>;
  try{
   const current=facts.filter(f=>source.facts.some(saved=>saved.id===f.id)).map(f=>({id:f.id,text:f.text,source:f.source,verified:f.verified}));
   if(vacancy!==source.vacancy||JSON.stringify(current)!==JSON.stringify(source.facts)||composeLetter(facts,vacancy,source.ids,source.style,source.language).text!==original)throw Error();
   packet=letterExport(source.facts,source.vacancy,source.ids,source.style,source.language,text);
  }catch{setError('evidence');return;}
  try{const reviewedPacket=validateReviewedLetterExport({format:'jobmatch-reviewed-cover-letter-v1',letter:packet,edit_review:editReview,reviewed_issue_ids:[...reviewed].sort()});
  const url=URL.createObjectURL(new Blob([kind==='txt'?packet.approved_text:JSON.stringify(reviewedPacket,null,2)],{type:kind==='txt'?'text/plain;charset=utf-8':'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=kind==='txt'?'jobmatch-cover-letter.txt':'jobmatch-cover-letter-provenance.json';try{anchor.click();setError(null);}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}catch{setError('download');}
 }

 return <section className="card localized-panel" lang={locale} aria-label={t.title}><h2>{t.title}</h2><p>{t.help}</p><p className="muted">{t.template}</p>{blocked&&<p className="notice">{sourceDirty?t.dirty:t.blocked}</p>}
 {!available.length&&<p>{t.empty}</p>}
 {available.map(edit=><label className="fact" key={edit.id}><input type="checkbox" checked={ids.includes(edit.id)} disabled={blocked||(ids.length>=5&&!ids.includes(edit.id))} onChange={event=>{if(blocked)return;setIds(event.target.checked?[...ids,edit.id]:ids.filter(id=>id!==edit.id));reset();}}/><span><span lang="">{edit.text}</span><small>Evidence: <span lang="">{edit.evidence_ids.join(', ')}</span></small></span></label>)}
 <label>{t.outputLanguage}<select aria-label={t.outputLanguage} disabled={blocked} value={outputLanguage} onChange={event=>{if(blocked)return;setOutputLanguage(normalizeLocale(event.target.value));reset();}}><option value="ru" lang="ru">Русский</option><option value="en" lang="en">English</option></select></label><p className="muted">{t.languageHelp}</p>
 <label>{t.style}<select aria-label={t.style} disabled={blocked} value={style} onChange={event=>{if(blocked)return;setStyle(event.target.value as LetterStyle);reset();}}>{(Object.keys(letterStyles) as LetterStyle[]).map(value=><option value={value} key={value}>{t.styles[value]}</option>)}</select></label><p className="muted">{t.styleHelp}</p>
 <button disabled={blocked||!ids.length} onClick={generate}>{t.generate}</button>{error&&<p role="alert">{t.errors[error]}</p>}
 {original&&<><label>{t.text}<textarea aria-label={t.text} lang="" rows={12} maxLength={15000} value={text} onChange={event=>{setText(event.target.value);setAccepted(false);setReviewed(new Set());}}/></label><p className="muted">{source&&LETTER_TEMPLATE_VERSIONS[source.language]}</p><p role="status">{t.words}: {count}. {t.guide}</p>{(count<100||count>170)&&<p>{t.lengthHelp}</p>}<p>{edited?t.edited:t.verbatim}</p><button disabled={blocked} onClick={()=>{if(blocked)return;setText(original);setAccepted(false);setReviewed(new Set());}}>{t.restore}</button><label className="check"><input type="checkbox" disabled={blocked} checked={accepted} onChange={event=>{if(!blocked)setAccepted(event.target.checked);}}/>{t.approve}</label>{editReview&&<LetterEditReviewPanel review={editReview} reviewed={reviewed} onReview={(id,checked)=>{if(blocked)return;setReviewed(previous=>{const next=new Set(previous);if(checked)next.add(id);else next.delete(id);return next;});}} disabled={blocked} locale={locale}/>}<p className="muted">{t.provenanceHelp}</p><button disabled={blocked||!accepted||!reviewComplete||!text.trim()} onClick={()=>download('txt')}>{t.download}</button><button disabled={blocked||!accepted||!reviewComplete||!text.trim()} onClick={()=>download('json')}>{t.json}</button></>}
 </section>;
}
