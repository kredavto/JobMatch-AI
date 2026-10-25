'use client';
import {useMemo,useState} from 'react';
import {careerPlan,careerPlanText} from '../lib/career-coach';
import type {Fact} from '../lib/engine';
export default function CareerPanel({facts,vacancy,onProfile}:{facts:Fact[];vacancy:string;onProfile:()=>void}){
 const items=useMemo(()=>careerPlan(facts,vacancy),[facts,vacancy]);
 const [filter,setFilter]=useState('all');
 const visible=items.filter(i=>filter==='all'||i.status===filter);
 function download(){const url=URL.createObjectURL(new Blob([careerPlanText(visible)],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='jobmatch-interview-plan.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="card" aria-label="Карьерный помощник"><h2>План развития и подготовка к интервью</h2><p>Локальные рекомендации по правилам, без передачи данных AI-провайдеру. Сначала — неподтвержденные обязательные требования. План строится по сохраненному профилю.</p><p>«Не подтверждено» не означает «Не соответствует». Отсутствие навыка автоматически не устанавливается; сложные требования требуют ручной проверки.</p><label>Показать требования<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Все требования</option><option value="unconfirmed">Не подтверждено</option><option value="supported">Соответствует по правилам</option></select></label><p role="status">Показано: {visible.length} из {items.length}</p>
 {!visible.length&&<p>В этой группе требований нет.</p>}
 {visible.map(item=><details key={item.id}><summary>{item.must?'Обязательное · ':''}{item.quote} — {item.status==='supported'?'Соответствует по правилам':'Не подтверждено'}</summary>{item.partial&&<p>Есть частичное совпадение терминов; срок, уровень и всё требование не доказаны.</p>}{item.evidence.length>0&&<><h3>Подтвержденные факты</h3><ul>{item.evidence.map(f=><li key={f.id}>{f.text}<small>Evidence: {f.id} · Источник: {f.source}</small></li>)}</ul></>}<h3>Что сделать</h3><ol>{item.steps.map(s=><li key={s}>{s}</li>)}</ol><h3>Вопросы для репетиции</h3><ul>{item.questions.map(q=><li key={q}>{q}</li>)}</ul></details>)}
 <div className="actions"><button disabled={!visible.length} onClick={download}>Скачать план подготовки (TXT)</button><button onClick={onProfile}>Добавить уточнение в профиль</button></div><p className="muted">Скачивается выбранная группа. План не меняет факты, резюме или Match Score. Учебные задания — предложения, а не выполненные достижения.</p></section>;
}
