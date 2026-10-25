'use client';
import {useMemo,useState} from 'react';
import {composeLetter,letterEvidence,letterStyles,wordCount,type LetterStyle} from '../lib/cover-letter';
import type {Fact} from '../lib/engine';
export default function CoverLetterPanel({facts,vacancy}:{facts:Fact[];vacancy:string}){
 const available=useMemo(()=>letterEvidence(facts,vacancy),[facts,vacancy]);
 const [ids,setIds]=useState<string[]>([]),[style,setStyle]=useState<LetterStyle>('professional'),[text,setText]=useState(''),[original,setOriginal]=useState(''),[error,setError]=useState(''),[accepted,setAccepted]=useState(false);
 const count=wordCount(text),edited=text!==original;
 function reset(){setText('');setOriginal('');setAccepted(false);setError('');}
 function generate(){try{const draft=composeLetter(facts,vacancy,ids,style);setText(draft.text);setOriginal(draft.text);setAccepted(false);setError('');}catch(e){setError(e instanceof Error?e.message:'Не удалось подготовить письмо');}}
 function download(){if(!accepted||!text.trim())return;const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='jobmatch-cover-letter.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="card" aria-label="Сопроводительное письмо"><h2>Сопроводительное письмо</h2><p>Локальный шаблон с дословными подтвержденными фактами. Выберите до пяти фактов, связанных с сохраненной вакансией. Письмо не отправляется и не сохраняется автоматически. Черновик исчезает при уходе из редактора, смене стиля или выбранных фактов; скачайте его заранее.</p>
 {!available.length&&<p>Для письма пока нет подтвержденных связанных фактов. Уточните профиль и выполните анализ заново.</p>}
 {available.map(e=><label className="fact" key={e.id}><input type="checkbox" checked={ids.includes(e.id)} disabled={ids.length>=5&&!ids.includes(e.id)} onChange={event=>{setIds(event.target.checked?[...ids,e.id]:ids.filter(id=>id!==e.id));reset();}}/><span>{e.text}<small>Evidence: {e.evidence_ids.join(', ')}</small></span></label>)}
 <label>Стиль письма<select value={style} onChange={e=>{setStyle(e.target.value as LetterStyle);reset();}}>{Object.entries(letterStyles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><p className="muted">Стиль «Для руководителей» не добавляет управленческий опыт. Вводные фразы о намерениях — шаблон: проверьте, что они вам подходят.</p>
 <button disabled={!ids.length} onClick={generate}>Подготовить черновик письма</button>{error&&<p role="alert">{error}</p>}
 {original&&<><label>Текст сопроводительного письма<textarea rows={12} maxLength={15000} value={text} onChange={e=>{setText(e.target.value);setAccepted(false);}}/></label><p role="status">Слов: {count}. Ориентир: 100–170; краткий стиль может быть короче.</p>{(count<100||count>170)&&<p>Длина вне ориентира. Сократите или дополните текст вручную, сохраняя точность фактов. Цифры и достижения автоматически не добавляются.</p>}<p>{edited?'Текст изменен вручную. Новые формулировки не проверены по evidence; проверьте каждое утверждение.':'Фактические фрагменты перенесены дословно из выбранных подтвержденных фактов. Проверьте уместность всего письма.'}</p><button onClick={()=>{setText(original);setAccepted(false);}}>Восстановить шаблон письма</button><label className="check"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>Я проверил письмо, факты и формулировки о своих намерениях</label><button disabled={!accepted||!text.trim()} onClick={download}>Скачать письмо (TXT)</button></>}
 </section>;
}
