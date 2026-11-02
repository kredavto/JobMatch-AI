import {headers} from 'next/headers';
import {localeFromCookie} from './preference';
/** Raw request header preserves duplicate preference names for strict fallback; no auth meaning. */
export async function requestLocale(){return localeFromCookie((await headers()).get('cookie')||'');}
