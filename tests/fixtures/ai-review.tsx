import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import AiReviewPanel from '../../app/ai-review-panel';
import type {UiLocale} from '../../lib/i18n/locale';
const facts=[{id:'f1',text:'SYNTHETIC PROFILE SQL 😀 42%',source:'SYNTHETIC fixture',verified:true}];
const profiles={
 base:{facts,vacancy:'Must-have:\nSQL'},
 factText:{facts:[{...facts[0],text:'NEW SYNTHETIC SQL 10%'}],vacancy:'Must-have:\nSQL'},
 factEligibility:{facts:[{...facts[0],verified:false}],vacancy:'Must-have:\nSQL'},
 quantity:{facts:[{...facts[0],text:'SYNTHETIC Python 2 years of experience'}],vacancy:'At least 5 years of Python experience'},
 level:{facts:[{...facts[0],text:'SYNTHETIC English B1'}],vacancy:'English C1'},
 literal:{facts:[{...facts[0],text:'SYNTHETIC sales'}],vacancy:'Python'},
 unknown:{facts:[{...facts[0],text:'SYNTHETIC Python 6 months'}],vacancy:'Python experience of 8 quarters'}
};
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>(document.documentElement.lang==='en'?'en':'ru'),[owner,setOwner]=useState('11111111-1111-4111-8111-111111111111'),[revision,setRevision]=useState(1),[variant,setVariant]=useState<keyof typeof profiles>('base');
 const selected=profiles[variant];
 return <main id="fixture-main"><button onClick={()=>{const next=locale==='en'?'ru':'en';document.documentElement.lang=next;setLocale(next);}}>Switch test locale</button><button onClick={()=>setOwner('22222222-2222-4222-8222-222222222222')}>Change test owner</button><button onClick={()=>setRevision(2)}>Change test revision</button><button onClick={()=>setVariant(value=>value==='base'?'quantity':'base')}>Change test source</button>{(['quantity','level','literal','unknown'] as const).map(name=><button key={name} onClick={()=>setVariant(name)}>{'Test audit '+name}</button>)}{(['factText','factEligibility'] as const).map(name=><button key={name} onClick={()=>setVariant(name)}>{'Change only '+name}</button>)}<AiReviewPanel locale={locale} facts={selected.facts} vacancy={selected.vacancy} revision={revision} ownerId={owner} disabled={false}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
