'use client';
import {useState,useCallback,useMemo,useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {ru,en} from '../lib/i18n';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {localeCookie,localeFromCookie,localeManifest} from '../lib/i18n/preference';
import {LocaleContext} from './locale-context';
export default function LocaleProvider({initialLocale,children}:{initialLocale:UiLocale;children:React.ReactNode}){
 const [locale,setLocale]=useState(initialLocale),[persistent,setPersistent]=useState<boolean|null>(null),path=usePathname();
 const changeLocale=useCallback((value:UiLocale)=>{const next=normalizeLocale(value);setLocale(next);try{document.cookie=localeCookie(next,location.protocol==='https:');setPersistent(localeFromCookie(document.cookie)===next);}catch{setPersistent(false);}},[]);
 useEffect(()=>{const copy=locale==='en'?en:ru;document.documentElement.lang=locale;document.title=copy.metadata.title;const description=document.querySelector('meta[name="description"]');if(description)description.setAttribute('content',copy.metadata.description);const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.setAttribute('href',localeManifest(locale));},[locale,path]);
 const value=useMemo(()=>({locale,changeLocale,persistent}),[locale,changeLocale,persistent]);
 return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
