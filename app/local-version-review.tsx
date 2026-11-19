'use client';
import {useEffect,useRef,useState} from 'react';
import ResultText from './result-text';
import {VERSION_STORAGE_KEY,readVersions,writeVersions,type LocalVersion,type VersionDraft} from '../mvp/local-versions';
function Comparison({value,prefix}:{value:VersionDraft;prefix:string}){
 return <div className="result-grid"><div><h3>Исходный текст</h3><ResultText id={`${prefix}-source`} label="Исходный текст версии" text={value.source} rows={12}/></div><div><h3>{value.title}</h3><ResultText id={`${prefix}-adapted`} label="Адаптированный текст версии" text={value.text} rows={12}/><ResultText id={`${prefix}-letter`} label="Сопроводительное письмо версии" text={value.coverLetter}/></div></div>;
}
export default function LocalVersionReview({draft}:{draft:VersionDraft|null}){
 const snapshot=useRef<string|null>(null);
 const [versions,setVersions]=useState<LocalVersion[]>([]),[selected,setSelected]=useState(''),[ready,setReady]=useState(false),[blocked,setBlocked]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{try{snapshot.current=localStorage.getItem(VERSION_STORAGE_KEY);setVersions(readVersions(snapshot.current));}catch{setBlocked(true);setError('Не удалось прочитать версии. Существующие данные не перезаписаны. Текущий результат можно скопировать без сохранения.');}setReady(true);},[]);
 function save(){if(!draft)return;setMessage('');setError('');try{const version={...draft,id:crypto.randomUUID(),createdAt:new Date().toISOString()};const next=[...versions,version];snapshot.current=writeVersions(localStorage,snapshot.current,next);setVersions(next);setSelected(version.id);setMessage('Отдельная версия сохранена. Исходный профиль не изменён.');}catch{setError('Не удалось сохранить версию: лимит 3 версии, недостаточно места или данные изменились в другой вкладке. Текущий результат не потерян; скопируйте его.');}}
 function remove(){if(!selected||!window.confirm('Удалить эту отдельную версию вместе с её копией исходника и письмом? Профиль останется без изменений.'))return;setMessage('');setError('');try{const next=versions.filter(v=>v.id!==selected);snapshot.current=writeVersions(localStorage,snapshot.current,next);setVersions(next);setSelected('');setMessage('Версия удалена. Исходный профиль не изменён.');}catch{setError('Удаление не выполнено. Данные могли измениться в другой вкладке. Перезагрузите страницу.');}}
 const saved=versions.find(v=>v.id===selected);
 return <section className="source-card local-version-review" aria-labelledby="versions-heading"><h2 id="versions-heading">Сравнение и отдельные версии</h2>
 <p id="versions-privacy">Необязательно: сохраните копию исходника, результат и письмо только в этом браузере. До 3 версий, без синхронизации и шифрования. Не сохраняйте на общем устройстве. Очистка данных сайта удалит версии. Удаление профиля не удаляет версии: удалите их отдельно здесь. Без этой кнопки результат исчезнет при перезагрузке.</p>
 {draft&&<><details><summary>Сравнить исходник и текущий результат</summary><Comparison value={draft} prefix="current-review"/></details><button className="button secondary" type="button" disabled={!ready||blocked||versions.length>=3} aria-describedby="versions-privacy" onClick={save}>Сохранить как отдельную версию</button></>}
 <label htmlFor="version-list">Сохранённые версии</label><select id="version-list" value={selected} disabled={!ready||blocked} onChange={e=>{setSelected(e.target.value);setMessage('');setError('');}}><option value="">Выберите версию</option>{versions.map((v,i)=><option key={v.id} value={v.id}>{i+1}. {v.name} · {v.title}</option>)}</select>
 {versions.length>=3&&<p>Лимит 3 версии достигнут. Для новой версии удалите одну из сохранённых.</p>}
 {saved&&<><p>Снимок от {new Date(saved.createdAt).toLocaleString('ru-RU')}. Не заменяет текущий профиль или результат.</p><Comparison key={saved.id} value={saved} prefix="saved-review"/><button className="button secondary" type="button" disabled={blocked} onClick={remove}>Удалить отдельную версию</button></>}
 {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}
 </section>;
}
