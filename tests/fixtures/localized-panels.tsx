import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import StructuredProfilePanel from '../../app/structured-profile-panel';
import SavedRemindersPanel from '../../app/saved-reminders-panel';
import {owner,snapshot} from './structured-version';
import type {UiLocale} from '../../lib/i18n/locale';
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>(document.documentElement.lang==='en'?'en':'ru');
 return <main id="fixture-main"><h1>{locale==='en'?'Profile and tasks fixture':'Профиль и задачи — проверка'}</h1><button onClick={()=>{const next=locale==='en'?'ru':'en';document.documentElement.lang=next;setLocale(next);}}>Switch test locale</button><StructuredProfilePanel locale={locale} ownerId={owner} workspaceRevision={1} disabled={false} onConflict={()=>{}}/><SavedRemindersPanel locale={locale} ownerId={owner} workspaceRevision={1} applications={[{id:'a1',title:'Орбита',status:'Планируется',note:'',created:'2026-10-28',events:[]}]} disabled={false} onConflict={()=>{}}/><small data-source-length>{Array.from(snapshot.source_original).length}</small></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
