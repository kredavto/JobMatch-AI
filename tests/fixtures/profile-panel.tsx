import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import ProfilePanel,{type ProfileCommand} from '../../app/profile-panel';
import type {UiLocale} from '../../lib/i18n/locale';
import type {Fact} from '../../lib/engine';
import type {FactHistory} from '../../lib/history-schema';
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>(document.documentElement.lang==='en'?'en':'ru');
 const [goal,setGoal]=useState('Москва · 150 000 ₽'),[resume,setResume]=useState('😀 Python — 2020–2024'),[fact,setFact]=useState('');
 const [facts,setFacts]=useState<Fact[]>([{id:'f-исходный',text:'😀 Python — 2020–2024',source:'Импорт пользователя',verified:false}]);
 const [history,setHistory]=useState<FactHistory[]>([]),[historyLoaded,setHistoryLoaded]=useState(false),[cursor,setCursor]=useState<number|null>(null);
 async function command(command:ProfileCommand){const response=await fetch('/fixture-command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});if(!response.ok)return false;if(command.action==='verify')setFacts(rows=>rows.map(row=>command.ids.includes(row.id)?{...row,verified:command.verified}:row));return true;}
 async function load(more=false){const response=await fetch('/fixture-history'+(more?'?before='+cursor:''));const data=await response.json();setHistory(rows=>more?[...rows,...data.rows]:data.rows);setCursor(data.next);setHistoryLoaded(true);}
 return <main id="fixture-main"><h1>{locale==='en'?'Profile fixture':'Проверка профиля'}</h1><button onClick={()=>{const next=locale==='en'?'ru':'en';document.documentElement.lang=next;setLocale(next);}}>Switch test locale</button><ProfilePanel locale={locale} busy={false} goal={goal} resume={resume} fact={fact} facts={facts} setGoal={setGoal} setResume={setResume} setFact={setFact} onCommand={command} onUpload={async file=>setResume(await file.text())} history={history} historyLoaded={historyLoaded} historyCursor={cursor} onHistory={load}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
