import {normalizeLocale,type UiLocale} from './locale';
export const LOCALE_COOKIE='jobmatch-ui-locale';
export function localeFromValues(values:unknown[]){return values.length===1?normalizeLocale(values[0]):'ru';}
export function localeFromCookie(header:string){return localeFromValues(header.split(';').map(part=>part.trim()).filter(part=>part.startsWith(LOCALE_COOKIE+'=')).map(part=>part.slice(LOCALE_COOKIE.length+1)));}
export function localeCookie(value:UiLocale,secure:boolean){return LOCALE_COOKIE+'='+normalizeLocale(value)+'; Path=/; Max-Age=31536000; SameSite=Lax'+(secure?'; Secure':'');}
export function localeManifest(value:UiLocale){return value==='en'?'/manifest-en.webmanifest':'/manifest.webmanifest';}
export const languageCopy={ru:{label:'Язык интерфейса',sessionOnly:'Язык изменён только в этой вкладке: браузер не разрешил сохранить выбор.'},en:{label:'Interface language',sessionOnly:'The language changed only in this tab: the browser did not allow saving your choice.'}};
