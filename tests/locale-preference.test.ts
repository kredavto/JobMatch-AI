import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {localeFromValues,localeFromCookie,localeCookie,localeManifest} from '../lib/i18n/preference';
it('accepts only one exact locale preference and never interprets unrelated values or duplicates',()=>{
 expect(localeFromCookie('unrelated=opaque; jobmatch-ui-locale=en')).toBe('en');
 for(const value of ['', 'jobmatch-ui-locale=en-US','jobmatch-ui-locale=%65n','jobmatch-ui-locale=en; jobmatch-ui-locale=ru','prefix-jobmatch-ui-locale=en'])expect(localeFromCookie(value)).toBe('ru');
 expect(localeFromValues(['en'])).toBe('en');expect(localeFromValues(['en','en'])).toBe('ru');expect(localeFromValues([null])).toBe('ru');
});
it('persists only a canonical language with bounded same-site cookie attributes',()=>{
 expect(localeCookie('en',true)).toBe('jobmatch-ui-locale=en; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
 expect(localeCookie('ru',false)).not.toContain('Secure');expect(localeCookie('en',true)).not.toContain('Domain=');
});
it('locale manifests preserve one installed application identity and public icons',()=>{
 const ru=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8')),en=JSON.parse(readFileSync(new URL('../public/manifest-en.webmanifest',import.meta.url),'utf8'));
 expect({...en,lang:ru.lang,description:ru.description}).toEqual(ru);expect(en.lang).toBe('en');expect(localeManifest('en')).toBe('/manifest-en.webmanifest');expect(localeManifest('ru')).toBe('/manifest.webmanifest');
});
