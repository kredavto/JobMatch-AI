'use client';

import React,{useState} from 'react';
import {prepareRewritePreview} from '../mvp/rewrite-preview';
import type {RewriteFact} from '../mvp/rewrite-draft';

export type LocalReviewApply={
 choices:(output:unknown)=>ReadonlySet<string>;
 save:(output:unknown,ids:readonly string[])=>void;
};

export default function LocalReviewedDraft({source,output,review,busy,apply,dismiss}:{
 source:RewriteFact[];
 output:unknown;
 review:LocalReviewApply;
 busy:boolean;
 apply:(ids:string[])=>void;
 dismiss:()=>void;
}){
 const [checked,setChecked]=useState<string[]>([]);
 const preview=prepareRewritePreview(source,output);
 if(preview.state!=='review')return <p role="status">{preview.message}</p>;
 const choices=review.choices(output);
 const selected=checked.filter(id=>choices.has(id));
 return <section aria-label="Проверка предложений переписывания">
  <p role="status"><strong>Непроверенный черновик. Ничего не применено.</strong> Сравните исходник и вариант. Автопроверка не подтверждает смысл: модель может изменить авторство, единицы или степень уверенности.</p>
  <p>Отмечайте только варианты, которые верно передают исходные факты. Применение изменит результат в этой вкладке, но не исходный профиль, навыки или письмо.</p>
  {preview.draft.suggestions.map((row,index)=><article className="rewrite-comparison" key={row.sourceId} aria-label={`Предложение ${index+1}`}>
   <h2>{`Предложение ${index+1}`}</h2>
   <div className="rewrite-columns"><div><h3>Исходный пункт</h3><p>{row.sourceQuote}</p></div><div><h3>Предложение модели</h3><p>{row.text}</p></div></div>
   {choices.has(row.sourceId)?<label><input type="checkbox" disabled={busy} checked={selected.includes(row.sourceId)} onChange={event=>setChecked(event.target.checked?[...selected,row.sourceId]:selected.filter(id=>id!==row.sourceId))}/>Проверил(а), использовать предложение {index+1}</label>:<p>Можно просмотреть, но нельзя применить к текущему результату.</p>}
  </article>)}
  {preview.draft.unmodifiedIds.length>0&&<p>Пункты без предложений остаются без изменений.</p>}
  {choices.size>0?<button type="button" className="button primary" disabled={busy||selected.length===0} onClick={()=>apply(selected)}>Использовать выбранные формулировки</button>:<p>Нет однозначных пунктов без изменений известных навыков. Текущий результат не изменён.</p>}
  <button type="button" className="button secondary" onClick={dismiss}>Отклонить все предложения</button>
 </section>;
}
