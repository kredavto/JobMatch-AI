'use client';
import React,{useState} from 'react';
import {prepareRewritePreview} from '../mvp/rewrite-preview';
import type {RewriteFact} from '../mvp/rewrite-draft';
/** Synthetic read-only preview. No accept/apply/export controls or model requests. */
export default function RewritePreviewPanel({source,output}:{source:RewriteFact[];output:unknown}){
 const [dismissed,setDismissed]=useState(false);
 const preview=prepareRewritePreview(source,output);
 if(dismissed)return <p role="status">Предложения скрыты. Исходный текст не изменён.</p>;
 if(preview.state!=='review')return <p role="status">{preview.message}</p>;
 return <section aria-label="Проверка предложений переписывания">
  <p role="status"><strong>Непроверенный черновик. Ничего не применено.</strong> Проверка чисел и цитат не доказывает сохранение смысла. Даже без предупреждения модель может изменить роль, авторство, единицы, период или степень уверенности.</p>
  <p>Сравните каждую строку с исходником. В этой демонстрации нет принятия, сохранения или переноса предложений в ваше резюме.</p>
  {preview.draft.suggestions.map((row,index)=><article className="rewrite-comparison" key={row.sourceId} aria-label={`Предложение ${index+1}`}>
   <h2>Предложение {index+1}{row.text===row.sourceQuote?' · без изменений':''}</h2>
   <div className="rewrite-columns"><div><h3>Исходный факт</h3><p>{row.sourceQuote}</p></div><div><h3>Предложение модели</h3><p>{row.text}</p></div></div>
   <p>Статус: требуется проверка человеком. Семантическая проверка не выполнена.</p>
  </article>)}
  {preview.draft.unmodifiedIds.length>0&&<div><h2>Без предложения: исходные факты сохранены</h2><ul>{preview.draft.source.filter(f=>preview.draft.unmodifiedIds.includes(f.id)).map(f=><li key={f.id}>{f.text}</li>)}</ul></div>}
  <button type="button" className="button secondary" onClick={()=>setDismissed(true)}>Отклонить все предложения</button>
 </section>;
}
