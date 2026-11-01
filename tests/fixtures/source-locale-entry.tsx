import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import SourceProfilePanel from '../../app/source-profile-panel';
import SourceVersionsPanel from '../../app/source-versions-panel';
import {sourceVersionProfile,sourceOwner} from '../source-version-fixture';
import type {UiLocale} from '../../lib/i18n/locale';
import '../../app/globals.css';
/** Synthetic browser fixture only; no Next route or production language switch. */
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>('ru'),[changed,setChanged]=useState(false),[boundaries,setBoundaries]=useState<number[]>([]);
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 const profile=sourceVersionProfile(),ownerId=changed?'22222222-2222-4222-8222-222222222222':sourceOwner;
 const context={locale,ownerId,revision:changed?0:4,original:changed?'Other synthetic owner':profile.source_original,factIds:changed?['other-fact']:profile.source_fact_ids,disabled:false,onBoundaryError:(status:number)=>setBoundaries(old=>[...old,status])};
 return <main id="main-content"><h1>Owned source locale fixture</h1><label htmlFor="fixture-language">Fixture language</label><select id="fixture-language" value={locale} onChange={event=>setLocale(event.target.value as UiLocale)}><option value="ru">Русский</option><option value="en">English</option></select><button type="button" onClick={()=>setChanged(true)}>Fixture other owner</button><output aria-label="Boundary statuses">{boundaries.join(',')}</output><SourceProfilePanel {...context}/><SourceVersionsPanel {...context} allowPrepare/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
