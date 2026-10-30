import {cookies} from 'next/headers';
import {LOCALE_COOKIE,localeFromValues} from './preference';
export async function requestLocale(){const jar=await cookies();return localeFromValues(jar.getAll(LOCALE_COOKIE).map(cookie=>cookie.value));}
