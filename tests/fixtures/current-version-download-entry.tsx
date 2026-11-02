import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import ResumeDownload from '../../app/resume-download';
import type {UiLocale} from '../../lib/i18n/locale';
import '../../app/globals.css';
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>('ru'),[owner,setOwner]=useState<string|undefined>('11111111-1111-4111-8111-111111111111'),[id,setId]=useState('offset');
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 return <main id="fixture-main" style={{maxWidth:800,margin:'auto',padding:16}}><h1>Owned DOCX fixture</h1><label htmlFor="docx-fixture-language">Fixture language</label><select id="docx-fixture-language" value={locale} onChange={event=>setLocale(event.target.value as UiLocale)}><option value="ru">Русский</option><option value="en">English</option></select><button onClick={()=>setOwner('22222222-2222-4222-8222-222222222222')}>Change test owner</button><button onClick={()=>setOwner(undefined)}>Clear test owner</button><button onClick={()=>setId('date')}>Change test version</button><ResumeDownload id={id} ownerId={owner} locale={locale}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
