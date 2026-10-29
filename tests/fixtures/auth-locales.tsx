import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import ConfirmationForm from '../../app/confirm-email/confirmation-form';
import RecoveryForm from '../../app/recover/recovery-form';
import type {UiLocale} from '../../lib/i18n/locale';
function Fixture(){const [query]=useState(()=>new URLSearchParams(location.search)),[locale,setLocale]=useState<UiLocale>(document.documentElement.lang==='en'?'en':'ru'),[visible,setVisible]=useState(true);return <main id="fixture-main"><button onClick={()=>{const next=locale==='en'?'ru':'en';document.documentElement.lang=next;setLocale(next);}}>Switch test locale</button><button onClick={()=>setVisible(false)}>Leave test form</button>{visible&&(query.get('view')==='confirm'?<ConfirmationForm locale={locale}/>:<RecoveryForm locale={locale} initialCode={query.get('code')||''} invalid={query.has('invalid')}/>)}</main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
