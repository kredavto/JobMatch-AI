'use client';
import {useEffect,useState} from 'react';
export default function AiStatus(){
 const [description,setDescription]=useState('Проверяем режим адаптации…');
 useEffect(()=>{
  const controller=new AbortController();
  void fetch('/api/mvp/capabilities',{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('unavailable');
   const data=await response.json();
   if(typeof data?.ai?.description!=='string')throw new Error('invalid');
   setDescription(data.ai.description);
  }).catch(()=>{if(!controller.signal.aborted)setDescription('Не удалось проверить подключение ИИ. Режим будет указан после адаптации.');});
  return ()=>controller.abort();
 },[]);
 return <p className="ai-status" role="status">{description}</p>;
}
