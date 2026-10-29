import {z} from 'zod';
import {formatInstant} from './dates';
import {versionsCopy} from './versions';
import {normalizeLocale,type UiLocale} from './locale';
const instant=z.iso.datetime({offset:true}),date=z.iso.date();
/** Legacy date-only/offset-less values must not acquire a device time zone or an invented instant. */
export function formatVersionCreated(value:string,requestedLocale:UiLocale='ru'){
 const locale=normalizeLocale(requestedLocale),t=versionsCopy[locale].dates;
 if(instant.safeParse(value).success)return {kind:'instant' as const,text:formatInstant(value,locale,'UTC')};
 if(date.safeParse(value).success){const text=new Intl.DateTimeFormat(locale==='en'?'en-US':'ru-RU',{timeZone:'UTC',calendar:'iso8601',numberingSystem:'latn',year:'numeric',month:'long',day:'numeric'}).format(new Date(value+'T00:00:00Z'));return {kind:'date' as const,text:text+' ('+t.only+')'};}
 return {kind:'unspecified' as const,text:value+' ('+t.unspecified+')'};
}
