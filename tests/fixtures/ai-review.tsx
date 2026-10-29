import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import AiReviewPanel from '../../app/ai-review-panel';
import type {UiLocale} from '../../lib/i18n/locale';
const facts=[{id:'f1',text:'SYNTHETIC PROFILE SQL 😀 42%',source:'SYNTHETIC fixture',verified:true}];
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>(document.documentElement.lang==='en'?'en':'ru'),[owner,setOwner]=useState('11111111-1111-4111-8111-111111111111'),[revision,setRevision]=useState(1);
 return <main id="fixture-main"><button onClick={()=>{const next=locale==='en'?'ru':'en';document.documentElement.lang=next;setLocale(next);}}>Switch test locale</button><button onClick={()=>setOwner('22222222-2222-4222-8222-222222222222')}>Change test owner</button><button onClick={()=>setRevision(2)}>Change test revision</button><AiReviewPanel locale={locale} facts={facts} vacancy={'Must-have:\nSQL'} revision={revision} ownerId={owner} disabled={false}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
