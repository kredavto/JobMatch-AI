'use client';
import {useMemo,useState} from 'react';
import type {Version} from '../lib/db';
import {compareText,scoresComparable} from '../lib/version-compare';
export default function VersionComparison({versions}:{versions:Version[]}){
 const [beforeId,setBefore]=useState(versions.at(-2)?.id||''),[afterId,setAfter]=useState(versions.at(-1)?.id||'');
 const before=versions.find(v=>v.id===beforeId),after=versions.find(v=>v.id===afterId);
 const diff=useMemo(()=>before&&after?compareText(before.text,after.text):null,[before,after]);
 if(versions.length<2)return <section className="card"><h2>Сравнение версий</h2><p>Сохраните минимум две версии резюме для сравнения.</p></section>;
 const options=versions.map((v,i)=><option key={v.id} value={v.id}>Версия {i+1} · {new Date(v.created).toLocaleString('ru-RU')}</option>);
 return <section className="card" aria-label="Сравнение версий"><h2>Сравнение версий</h2><label>Исходная версия<select aria-label="Исходная версия" value={beforeId} onChange={e=>setBefore(e.target.value)}>{options}</select></label><label>Сравниваемая версия<select aria-label="Сравниваемая версия" value={afterId} onChange={e=>setAfter(e.target.value)}>{options}</select></label>
 <p>Сравнение только для просмотра: факты, сохраненные версии и резюме на hh.ru не изменяются. Перемещение строки показано как удаление и добавление.</p>
 {!before||!after?<p>Выберите две доступные версии.</p>:beforeId===afterId?<p role="status">Выбрана одна и та же версия.</p>:diff&&<>
 <p>Сохраненные баллы: {before.score} → {after.score}. {scoresComparable(before,after)?`Разница: ${after.score-before.score>0?'+':''}${after.score-before.score}. Это внутренняя эвристика, а не ATS-score и не доказательство улучшения результата поиска.`:'Разницу баллов не интерпретируем: вакансия или настройки различаются либо метаданные отсутствуют.'}</p>
 {before.vacancy!==after.vacancy&&<p>Версии подготовлены для разных текстов вакансий.</p>}
 <details><summary>Вакансии выбранных версий</summary><h3>Исходная вакансия</h3><pre>{before.vacancy}</pre><h3>Сравниваемая вакансия</h3><pre>{after.vacancy}</pre></details>
 {diff.simplified?<p role="status">Большой документ: показаны полные тексты как удаление и добавление без построчного выравнивания.</p>:<p role="status">Добавлено строк: {diff.lines.filter(l=>l.kind==='added').length}; удалено: {diff.lines.filter(l=>l.kind==='removed').length}.</p>}
 {diff.lines.length>1000&&<p>Показаны первые 1000 строк сравнения. Полные тексты доступны для скачивания в истории ниже.</p>}
 {before.text===after.text?<p>Текст версий совпадает.</p>:<div className="version-diff" role="region" tabIndex={0} aria-label="Изменения текста">{diff.lines.slice(0,1000).map((line,i)=><div key={i} className={'diff-'+line.kind}><span className="diff-label">{line.kind==='added'?'Добавлено':line.kind==='removed'?'Удалено':'Без изменений'}</span><pre>{line.text||'\u00a0'}</pre></div>)}</div>}
 </>}
 </section>;
}
