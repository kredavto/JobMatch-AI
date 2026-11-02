import {z} from 'zod';
import {versionsCopy} from './versions';
import {normalizeLocale,type UiLocale} from './locale';
const instant=z.iso.datetime({offset:true}),date=z.iso.date();
/** Legacy date-only/offset-less values must not acquire a device time zone or an invented instant. */
export function formatVersionCreated(value:string,requestedLocale:UiLocale='ru'){
 const locale=normalizeLocale(requestedLocale),t=versionsCopy[locale].dates;
 if(instant.safeParse(value).success&&Number.isFinite(new Date(value).valueOf()))return {kind:'instant' as const,text:new Intl.DateTimeFormat(locale==='en'?'en-GB':'ru-RU',{timeZone:'UTC',calendar:'iso8601',numberingSystem:'latn',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(value))+' UTC'};
 if(date.safeParse(value).success){const text=new Intl.DateTimeFormat(locale==='en'?'en-US':'ru-RU',{timeZone:'UTC',calendar:'iso8601',numberingSystem:'latn',year:'numeric',month:'long',day:'numeric'}).format(new Date(value+'T00:00:00Z'));return {kind:'date' as const,text:text+' ('+t.only+')'};}
 return {kind:'unspecified' as const,text:value+' ('+t.unspecified+')'};
}
