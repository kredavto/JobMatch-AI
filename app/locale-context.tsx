'use client';
import {createContext,useContext} from 'react';
import {ru,en} from '../lib/i18n';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {languageCopy} from '../lib/i18n/preference';
export type LocaleState={locale:UiLocale;changeLocale:(locale:UiLocale)=>void;persistent:boolean|null};
export const LocaleContext=createContext<LocaleState|null>(null);
export function useGlobalLocale(){return useContext(LocaleContext);}
export function LanguageSelector(){
 const state=useGlobalLocale();if(!state)return null;const t=languageCopy[state.locale];
 return <div className="locale-control"><label className="locale-choice">{t.label}<select aria-label={t.label} value={state.locale} onChange={event=>state.changeLocale(normalizeLocale(event.target.value))}><option value="ru" lang="ru">Русский</option><option value="en" lang="en">English</option></select></label>{state.persistent===false&&<p role="status" className="muted">{t.sessionOnly}</p>}</div>;
}
export function SkipLink(){const state=useGlobalLocale(),t=state?.locale==='en'?en:ru;return <a className="skip-link" href="#main-content">{t.common.skip}</a>;}
