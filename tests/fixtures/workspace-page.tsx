import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import WorkspacePage from '../../app/workspace-page';
import type {UiLocale} from '../../lib/i18n/locale';
function Fixture(){const [locale,setLocale]=useState<UiLocale>(document.documentElement.lang==='en'?'en':'ru');return <div id="fixture-main"><button onClick={()=>{const next=locale==='en'?'ru':'en';document.documentElement.lang=next;setLocale(next);}}>Switch test locale</button><WorkspacePage locale={locale}/></div>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
