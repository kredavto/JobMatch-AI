'use client';
import React,{useEffect,useRef,useState} from 'react';
import {PROFILE_STORAGE_KEY,readProfiles,writeProfiles,saveProfile,type LocalProfile} from '../mvp/local-profiles';
type Resume={text:string;filename:string};
export default function LocalResumePicker({onSelect}:{onSelect:(resume:Resume|null)=>void}){
 const snapshot=useRef<string|null>(null);
 const [profiles,setProfiles]=useState<LocalProfile[]>([]),[id,setId]=useState(''),[name,setName]=useState(''),[text,setText]=useState(''),[ready,setReady]=useState(false),[storageError,setStorageError]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 // Read browser-only storage after hydration; never write or auto-select on mount.
 useEffect(()=>{try{snapshot.current=localStorage.getItem(PROFILE_STORAGE_KEY);setProfiles(readProfiles(snapshot.current));}catch{setStorageError(true);setError('Не удалось прочитать хранилище. Существующие данные не перезаписаны. Можно использовать текст без сохранения.');}setReady(true);},[]);
 function invalidate(){onSelect(null);setMessage('');setError('');}
 function select(value:string){invalidate();setId(value);const profile=profiles.find(p=>p.id===value);setName(profile?.name??'');setText(profile?.text??'');if(profile){onSelect({text:profile.text,filename:profile.name});setMessage('Профиль выбран.');}}
 function validate(){if(!name.trim()||name.trim().length>100)throw new Error('Введите название профиля до 100 символов.');if(text.trim().length<20||text.trim().length>100000)throw new Error('Текст резюме должен содержать от 20 до 100 000 символов.');return {name:name.trim(),text:text.trim()};}
 function useText(){try{const value=validate();onSelect({text:value.text,filename:value.name});setError('');setMessage('Текст выбран для этой вкладки. Несохранённые изменения исчезнут после перезагрузки.');}catch(e){setError((e as Error).message);}}
 function save(){try{const value=validate();const profile={...value,id:id||crypto.randomUUID()};const next=saveProfile(profiles,profile);snapshot.current=writeProfiles(localStorage,snapshot.current,next);setProfiles(next);setId(profile.id);onSelect({text:profile.text,filename:profile.name});setError('');setMessage('Профиль сохранён в этом браузере и выбран.');}catch(e){setError(e instanceof Error&&e.message.startsWith('Профили изменились')?e.message:'Не удалось сохранить. Проверьте длину текста, название, лимит 5 профилей и доступность хранилища. Текст остаётся в форме.');}}
 function remove(){if(!id||!window.confirm('Удалить выбранный профиль из этого браузера? Отдельно сохранённые версии содержат копию исходника и НЕ удалятся. Удалите их отдельно в разделе «Сравнение и отдельные версии». Это действие нельзя отменить.'))return;try{const next=profiles.filter(p=>p.id!==id);snapshot.current=writeProfiles(localStorage,snapshot.current,next);setProfiles(next);select('');setMessage('Профиль удалён из этого браузера.');}catch{setError('Удалить профиль не удалось. Сохранённые данные не изменены.');}}
 return <div className="local-resume-picker">
  <p>Один раз вставьте текст своего резюме. Файлы и вход в hh.ru не нужны.</p>
  <label htmlFor="profile-list">Сохранённые профили</label><select id="profile-list" value={id} disabled={!ready} onChange={e=>select(e.target.value)}><option value="">Новый профиль</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
  <label htmlFor="profile-name">Название профиля</label><input id="profile-name" maxLength={100} autoComplete="off" value={name} onChange={e=>{invalidate();setName(e.target.value);}} placeholder="Например, разработчик Python"/>
  <label htmlFor="profile-text">Текст вашего резюме</label><textarea id="profile-text" rows={12} maxLength={100000} autoComplete="off" spellCheck={false} value={text} onChange={e=>{invalidate();setText(e.target.value);}} aria-describedby="profile-privacy"/>
  <p id="profile-privacy">Не вставляйте паспортные данные, адрес, сведения о здоровье и другие лишние личные данные. Сохранение только по кнопке: до 5 профилей в этом браузере, без синхронизации. Данные не зашифрованы и доступны людям с доступом к браузеру. Не сохраняйте на общем устройстве. Очистка данных сайта удалит профили. Отдельные версии результата удаляются отдельно, даже после удаления профиля. Исходник храните отдельно.</p>
  <button type="button" className="button secondary" disabled={!ready||!text.trim()} onClick={useText}>Использовать без сохранения</button>{' '}
  <button type="button" className="button secondary" disabled={!ready||storageError||!text.trim()} onClick={save}>Сохранить и выбрать</button>{' '}
  <button type="button" className="button secondary" disabled={!id||storageError} onClick={remove}>Удалить профиль</button>
  <p>Редактирование снимает выбор и очищает предыдущий результат. После правок снова выберите «Использовать» или «Сохранить».</p>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}
 </div>;
}
