'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import type {Fact} from '../lib/engine';
import {adaptationEdits,renderAdaptation,validateAdaptation,type AdaptationPreview} from '../lib/ai-resume-adaptation';
import type {UiLocale} from '../lib/i18n/locale';
const copy={ru:{title:'AI-адаптация резюме · эксперимент',help:'AI предлагает, какие подтверждённые строки исходного резюме вынести в начало под эту вакансию. Формулировки не переписываются, новые навыки не добавляются. Модель не прошла acceptance-проверку. Соответствие требованиям и результат ATS не гарантируются.',consent:'Разрешаю отправить сохранённую вакансию и допустимые подтверждённые строки резюме на собственный AI-сервер оператора для этого запроса.',run:'Адаптировать резюме',busy:'Подбираем строки…',dirty:'Сначала сохраните профиль и вакансию.',error:'Адаптация недоступна или ответ не прошёл проверку. Резюме не изменено. Можно повторить вручную.',unavailable:'Экспериментальная AI-адаптация пока не подключена. Рабочий результат модели не заявлен.',review:'Проверьте смысл каждой связи с вакансией. Отметьте только строки, которые хотите вынести в начало.',empty:'AI не предложил подтверждённых строк. Резюме не изменено.',accept:'Я проверил(а) выбранные строки и их уместность для вакансии',preview:'Показать проверенный мной черновик',draft:'Черновик для ручного копирования',lifetime:'Ничего не сохраняется и не отправляется работодателю автоматически. Черновик исчезнет при смене исходника, аккаунта или уходе из редактора.'},en:{title:'AI resume adaptation · experimental',help:'AI suggests which confirmed original resume lines to promote for this vacancy. Wording is not rewritten and skills are not added. The model has not passed acceptance testing. Requirement fit and ATS outcomes are not guaranteed.',consent:'Allow sending the saved vacancy and eligible confirmed resume lines to the operator’s self-hosted AI server for this request.',run:'Adapt resume',busy:'Selecting lines…',dirty:'Save the profile and vacancy first.',error:'Adaptation is unavailable or the response failed validation. Your resume is unchanged. You can retry manually.',unavailable:'Experimental AI adaptation is not connected. No working model result is claimed.',review:'Check the meaning of every vacancy link. Select only lines you want to promote.',empty:'AI suggested no confirmed lines. Your resume is unchanged.',accept:'I have reviewed the selected lines and their relevance to the vacancy',preview:'Show my reviewed draft',draft:'Draft for manual copying',lifetime:'Nothing is saved or sent to employers automatically. The draft disappears when the source or account changes or you leave the editor.'}};
type Props={facts:Fact[];original:string;vacancy:string;revision:number;ownerId?:string;disabled:boolean;locale?:UiLocale};
export default function AiResumeAdaptationPanel(props:Props){return <BoundAdaptation key={JSON.stringify([props.ownerId,props.revision,props.original,props.vacancy,props.facts,props.disabled])} {...props}/>;}
function BoundAdaptation({facts,original,vacancy,revision,ownerId,disabled,locale='ru'}:Props){
 const t=copy[locale==='en'?'en':'ru'];
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<'error'|'unavailable'|null>(null),[preview,setPreview]=useState<AdaptationPreview|null>(null),[selected,setSelected]=useState<string[]>([]),[accepted,setAccepted]=useState(false),[draft,setDraft]=useState('');
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
 async function run(){
  if(active.current||disabled||!consent||!ownerId)return;
  const controller=new AbortController();active.current=controller;
  const timer=setTimeout(()=>controller.abort(),25000);
  setBusy(true);setError(null);setPreview(null);setSelected([]);setAccepted(false);setDraft('');
  try{
   const response=await fetch('/api/ai-resume-adaptation',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,revision,expectedOwnerId:ownerId})});
   if(active.current!==controller||controller.signal.aborted)return;
   if(!response.ok){setError(response.status===503?'unavailable':'error');return;}
   const value=await response.json();
   if(active.current!==controller||controller.signal.aborted)return;
   const data=z.object({ownerId:z.literal(ownerId),revision:z.literal(revision),preview:z.unknown()}).strict().parse(value);
   setPreview(validateAdaptation(data.preview,facts,original,vacancy));
  }catch{if(active.current===controller)setError('error');}
  finally{clearTimeout(timer);if(active.current===controller){active.current=null;setBusy(false);if(controller.signal.aborted)setError('error');}}
 }
 const edits=preview?adaptationEdits(preview,facts,original,vacancy):[];
 return <section className="card localized-panel" lang={locale} aria-labelledby="ai-adaptation-title"><h2 id="ai-adaptation-title">{t.title}</h2><p>{t.help}</p><p className="muted">{t.lifetime}</p>
 <label><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/>{t.consent}</label>
 {disabled&&<p>{t.dirty}</p>}<button type="button" disabled={busy||disabled||!ownerId||!consent} onClick={()=>void run()}>{busy?t.busy:t.run}</button>
 {error&&<p role="alert">{t[error]}</p>}
 {preview&&(edits.length?<div><p>{t.review}</p><ul>{edits.map(edit=><li key={edit.id}><label><input type="checkbox" checked={selected.includes(edit.id)} onChange={event=>{setSelected(current=>event.target.checked?[...current,edit.id]:current.filter(id=>id!==edit.id));setAccepted(false);setDraft('');}}/><span lang="">{edit.text}</span></label><ul>{preview.review.requirements.filter(row=>row.evidence_ids.includes(edit.evidence_ids[0])).map(row=><li key={row.quote}><blockquote lang="">{row.quote}</blockquote></li>)}</ul></li>)}</ul>
 <label><input type="checkbox" checked={accepted} disabled={!selected.length} onChange={event=>{setAccepted(event.target.checked);setDraft('');}}/>{t.accept}</label>
 <button type="button" disabled={!accepted||!selected.length} onClick={()=>setDraft(renderAdaptation(preview,selected,facts,original,vacancy))}>{t.preview}</button></div>:<p role="status">{t.empty}</p>)}
 {draft&&<label>{t.draft}<textarea readOnly value={draft} rows={16} lang=""/></label>}
 </section>;
}
