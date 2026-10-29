import {z} from 'zod';
import {wallEpoch} from '../reminders';
import {normalizeLocale,type UiLocale} from './locale';
const isoDate=z.iso.datetime({offset:true});
const invalid={ru:'Некорректная дата',en:'Invalid date'};
const formatters=new Map<string,Intl.DateTimeFormat>();
function dateFormat(locale:UiLocale,zone:string){const key=locale+':'+zone;let value=formatters.get(key);if(!value){value=new Intl.DateTimeFormat(locale==='en'?'en-US':'ru-RU',{timeZone:zone,calendar:'iso8601',numberingSystem:'latn',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});if(formatters.size>=16)formatters.delete(formatters.keys().next().value!);formatters.set(key,value);}return value;}
/** Display only. Always name the chosen zone; never use the device zone implicitly. */
export function formatInstant(iso:string,requestedLocale:UiLocale='ru',zone='UTC'){
 const locale=normalizeLocale(requestedLocale);
 try{if(!isoDate.safeParse(iso).success)throw Error();const date=new Date(iso);if(!Number.isFinite(date.getTime()))throw Error();return dateFormat(locale,zone).format(date)+' '+zone;}catch{return invalid[locale];}
}
export function formatUtcOffset(minutes:number){if(!Number.isInteger(minutes)||Math.abs(minutes)>840)throw Error('Invalid UTC offset');const value=Math.abs(minutes);return 'UTC'+(minutes<0?'-':'+')+String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');}
/** Accepted wall time must not be recalculated using today's IANA rules. */
export function formatAcceptedWall(local:string,offsetMinutes:number,requestedLocale:UiLocale='ru'){
 const locale=normalizeLocale(requestedLocale);
 try{return dateFormat(locale,'UTC').format(new Date(wallEpoch(local)))+' ('+formatUtcOffset(offsetMinutes)+')';}catch{return invalid[locale];}
}
