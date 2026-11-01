import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import WorkspacePage from '../../app/workspace-page';
import {normalizeLocale,type UiLocale} from '../../lib/i18n/locale';
import '../../app/globals.css';
/** Actual current Root/controller; all API traffic is intercepted by the owning tests. */
function Fixture(){
 const [locale,setLocale]=useState<UiLocale>(()=>normalizeLocale(new URLSearchParams(location.search).get('locale')));
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 return <><div><label htmlFor="workspace-fixture-language">Fixture language</label><select id="workspace-fixture-language" value={locale} onChange={event=>setLocale(event.target.value as UiLocale)}><option value="ru">Русский</option><option value="en">English</option></select></div><WorkspacePage locale={locale}/></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
