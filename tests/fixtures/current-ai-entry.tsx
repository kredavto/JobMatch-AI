import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import AiReviewPanel from '../../app/ai-review-panel';
import AiResumeAdaptationPanel from '../../app/ai-resume-adaptation-panel';
import type {UiLocale} from '../../lib/i18n/locale';
import '../../app/globals.css';
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>('ru'),[owner,setOwner]=useState<string|undefined>('11111111-1111-4111-8111-111111111111'),[revision,setRevision]=useState(7),[facts,setFacts]=useState([{id:'f1',text:'SQL',source:'Synthetic',verified:true}]),[vacancy,setVacancy]=useState('Требования:\nSQL'),[original,setOriginal]=useState('Name\nSQL'),[disabled,setDisabled]=useState(false);
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 return <main id="fixture-main" style={{maxWidth:900,margin:'auto',padding:16}}><h1>Owned AI context fixture</h1><label htmlFor="ai-fixture-language">Fixture language</label><select id="ai-fixture-language" value={locale} onChange={event=>setLocale(event.target.value as UiLocale)}><option value="ru">Русский</option><option value="en">English</option></select><div className="actions"><button onClick={()=>setOwner('22222222-2222-4222-8222-222222222222')}>Change test owner</button><button onClick={()=>setRevision(current=>current+1)}>Change test revision</button><button onClick={()=>setFacts(current=>current.map(f=>({...f,text:'SQL changed',verified:false})))}>Change test fact</button><button onClick={()=>setVacancy('Требования:\nPython')}>Change test vacancy</button><button onClick={()=>setOriginal('Name\nPython')}>Change test original</button><button onClick={()=>setDisabled(value=>!value)}>Pause test controls</button><button onClick={()=>setOwner(undefined)}>Clear test owner</button></div><AiReviewPanel locale={locale} facts={facts} vacancy={vacancy} revision={revision} ownerId={owner} disabled={disabled}/><AiResumeAdaptationPanel locale={locale} facts={facts} original={original} vacancy={vacancy} revision={revision} ownerId={owner} disabled={disabled}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
