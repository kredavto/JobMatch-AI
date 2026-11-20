'use client';
import React,{useEffect,useRef,useState} from 'react';
import {PROFILE_STORAGE_KEY,readProfiles,writeProfiles,saveProfile,prepareResumeSelection,type LocalProfile} from '../mvp/local-profiles';
type Resume={text:string;filename:string};
const formats='.doc,.docx,.txt,.rtf,.pdf,.png';
function cancelPendingRead(generation:React.RefObject<number>,active:React.RefObject<AbortController|null>){
 generation.current++;
 active.current?.abort();
 active.current=null;
}

export default function LocalResumePicker({onSelect}:{onSelect:(resume:Resume|null)=>void}){
 const snapshot=useRef<string|null>(null),fileInput=useRef<HTMLInputElement>(null),generation=useRef(0),active=useRef<AbortController|null>(null);
 const [profiles,setProfiles]=useState<LocalProfile[]>([]),[id,setId]=useState(''),[name,setName]=useState('');
 const [file,setFile]=useState<File|null>(null),[parsed,setParsed]=useState<Resume|null>(null),[busy,setBusy]=useState(false),[previewOpen,setPreviewOpen]=useState(false);
 const [ready,setReady]=useState(false),[storageError,setStorageError]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
  try{snapshot.current=localStorage.getItem(PROFILE_STORAGE_KEY);setProfiles(readProfiles(snapshot.current));}
  catch{setStorageError(true);setError('Не удалось прочитать хранилище. Существующие данные не перезаписаны. Можно использовать файл без сохранения.');}
  setReady(true);
  return()=>cancelPendingRead(generation,active);
 },[]);
 function invalidate(){cancelPendingRead(generation,active);setBusy(false);setPreviewOpen(false);setParsed(null);onSelect(null);setMessage('');setError('');}
 function pickFile(value:File|null){invalidate();setFile(value);}
 function clearFile(){if(fileInput.current)fileInput.current.value='';pickFile(null);}
 function chooseProfile(value:string){
  clearFile();setId(value);
  const profile=profiles.find(item=>item.id===value);
  setName(profile?.name??'');
  if(profile?.sourceFilename){
   setParsed({text:profile.text,filename:profile.sourceFilename});
   onSelect({text:profile.text,filename:profile.name});setMessage('Профиль из файла выбран.');
  }else if(profile)setMessage('Этот профиль был создан из текста. Выберите файл, чтобы заменить его, или удалите профиль.');
 }
 async function extract(){
  if(!file||busy||active.current)return;
  const request=++generation.current,controller=new AbortController();active.current=controller;
  setParsed(null);setPreviewOpen(false);setBusy(true);setError('');setMessage('');
  try{
   const {parseResumeFile}=await import('../mvp/browser-resume-import');
   if(request!==generation.current)return;
   const value=await parseResumeFile(file,controller.signal);
   if(request!==generation.current)return;
   setParsed(value);
   setMessage('Файл прочитан. Выберите, как использовать резюме.');
  }catch(failure){
   if(request===generation.current)setError(failure instanceof Error?failure.message:'Не удалось прочитать файл. Попробуйте другой.');
  }finally{if(request===generation.current){active.current=null;setBusy(false);}}
 }
 function useFile(){
  if(!parsed||busy)return;
  try{
   const value=prepareResumeSelection(parsed.text,name,'temporary');
   onSelect({text:value.text,filename:name.trim()?value.name:parsed.filename.slice(0,100)});
   setError('');setMessage('Резюме из файла выбрано для этой вкладки. Без сохранения оно исчезнет после перезагрузки.');
  }catch(failure){setError((failure as Error).message);}
 }
 function save(){
  if(!parsed||busy)return;
  let value;try{value=prepareResumeSelection(parsed.text,name,'save');}catch(failure){setError((failure as Error).message);return;}
  try{
   const profile={...value,id:id||crypto.randomUUID(),sourceFilename:parsed.filename};
   const next=saveProfile(profiles,profile);
   snapshot.current=writeProfiles(localStorage,snapshot.current,next);
   setProfiles(next);setId(profile.id);onSelect({text:profile.text,filename:profile.name});
   setError('');setMessage('Профиль сохранён в этом браузере и выбран.');
  }catch(failure){setError(failure instanceof Error&&failure.message.startsWith('Профили изменились')?failure.message:'Не удалось сохранить профиль. Проверьте лимит 5 профилей и доступность хранилища. Резюме доступно без сохранения.');}
 }
 function remove(){
  if(!id||!window.confirm('Удалить выбранный профиль из этого браузера? Отдельно сохранённые версии содержат копию исходника и НЕ удалятся. Удалите их отдельно в разделе «Сравнение и отдельные версии». Это действие нельзя отменить.'))return;
  try{
   const next=profiles.filter(item=>item.id!==id);snapshot.current=writeProfiles(localStorage,snapshot.current,next);
   setProfiles(next);chooseProfile('');setMessage('Профиль удалён из этого браузера.');
  }catch{setError('Удалить профиль не удалось. Сохранённые данные не изменены.');}
 }
 return <div className="local-resume-picker">
  <label htmlFor="profile-file">Файл резюме</label>
  <input ref={fileInput} id="profile-file" type="file" accept={formats} aria-describedby="profile-file-hint profile-privacy" onChange={event=>pickFile(event.currentTarget.files?.[0]??null)}/>
  <p id="profile-file-hint">Word (.doc, .docx), TXT, RTF, PDF или PNG, до 10 МБ. До 100 000 символов извлечённого текста. Скан может распознаваться дольше. Проверьте извлечённые данные в результате перед откликом.</p>
  <button type="button" className="button secondary" disabled={!ready||!file||busy} onClick={()=>void extract()}>Прочитать файл</button>{' '}
  {file&&<button type="button" className="button secondary" onClick={clearFile}>{busy?'Отменить чтение':'Убрать файл'}</button>}
  {busy&&<p role="status">Читаем файл в браузере…</p>}
  {parsed&&<>
   <p>Источник: <span className="resume-file-name">{parsed.filename}</span></p>
   <details onToggle={event=>setPreviewOpen(event.currentTarget.open)}>
    <summary>Проверить извлечённый текст</summary>
    {previewOpen&&<pre className="resume-file-preview" tabIndex={0} aria-label="Извлечённый текст для проверки">{parsed.text}</pre>}
   </details>
  </>}
  <label htmlFor="profile-list">Сохранённые профили</label>
  <select id="profile-list" value={id} disabled={!ready} onChange={event=>chooseProfile(event.target.value)}><option value="">Новый профиль</option>{profiles.map(profile=><option key={profile.id} value={profile.id}>{profile.name}{profile.sourceFilename?'':' (нужен файл)'}</option>)}</select>
  <label htmlFor="profile-name">Название профиля</label>
  <input id="profile-name" maxLength={100} autoComplete="off" value={name} aria-describedby="profile-name-hint" onChange={event=>{setName(event.target.value);onSelect(null);setError('');setMessage('');}} placeholder="Например, разработчик Python"/>
  <p id="profile-name-hint">Название нужно только для сохранения профиля.</p>
  <p id="profile-privacy">Файл читается в браузере и не загружается на сервер. Не используйте документы с лишними личными данными. Сохранение только по кнопке: до 5 профилей в этом браузере, без синхронизации и шифрования. Не сохраняйте на общем устройстве. Очистка данных сайта удалит профили. Отдельные версии удаляются отдельно.</p>
  <button type="button" className="button secondary" disabled={!ready||!parsed||busy} onClick={useFile}>Использовать без сохранения</button>{' '}
  <button type="button" className="button secondary" disabled={!ready||storageError||!parsed||busy} onClick={save}>Сохранить и выбрать</button>{' '}
  <button type="button" className="button secondary" disabled={!id||storageError} onClick={remove}>Удалить профиль</button>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}
 </div>;
}
