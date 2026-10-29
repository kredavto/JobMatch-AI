import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import ResumeDownload from '../../app/resume-download';
import type {UiLocale} from '../../lib/i18n/locale';
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>(document.documentElement.lang==='en'?'en':'ru'),[owner,setOwner]=useState<string|undefined>('11111111-1111-4111-8111-111111111111'),[id,setId]=useState('one');
 return <main id="fixture-main"><button onClick={()=>{const next=locale==='en'?'ru':'en';document.documentElement.lang=next;setLocale(next);}}>Switch test locale</button><button onClick={()=>setOwner('22222222-2222-4222-8222-222222222222')}>Change test owner</button><button onClick={()=>setOwner(undefined)}>Clear test owner</button><button onClick={()=>setOwner('11111111-1111-4111-8111-111111111111')}>Set original owner</button><button onClick={()=>setId('two')}>Change test version</button><ResumeDownload id={id} ownerId={owner} locale={locale}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
