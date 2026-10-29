import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import CoverLetterPanel from '../../app/cover-letter-panel';
import CareerPanel from '../../app/career-panel';
import type {UiLocale} from '../../lib/i18n/locale';
const facts=[{id:'f1',text:'SYNTHETIC SQL 😀 42%',source:'SYNTHETIC fixture',verified:true}];
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>(document.documentElement.lang==='en'?'en':'ru'),[dirty,setDirty]=useState(false),[paused,setPaused]=useState(false);
 return <main id="fixture-main"><button onClick={()=>{const next=locale==='en'?'ru':'en';document.documentElement.lang=next;setLocale(next);}}>Switch test locale</button><button onClick={()=>setDirty(current=>!current)}>Toggle test dirty sources</button><button onClick={()=>setPaused(current=>!current)}>Toggle test paused actions</button><CoverLetterPanel facts={facts} vacancy={'Must-have:\nSQL\nPython'} locale={locale} sourceDirty={dirty} disabled={paused}/><CareerPanel facts={facts} vacancy={'Must-have:\nSQL\nPython'} locale={locale} onProfile={()=>{}}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
