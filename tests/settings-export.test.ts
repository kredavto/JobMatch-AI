import {it,expect} from 'vitest';
import {settingsExportHref,SETTINGS_EXPORT_PATHS,type SettingsExport} from '../lib/settings-export';
it('never builds unbound exports when owner identity is missing or malformed',()=>{
 for(const owner of [undefined,'','legacy','../other','x&expectedOwnerId=other'])for(const kind of Object.keys(SETTINGS_EXPORT_PATHS) as SettingsExport[])expect(settingsExportHref(kind,owner)).toBeNull();
});
it('keeps all four same-origin export paths and binds their canonical owner query',()=>{
 const owner='11111111-1111-4111-8111-111111111111';
 for(const [kind,path] of Object.entries(SETTINGS_EXPORT_PATHS)){const url=new URL(settingsExportHref(kind as SettingsExport,owner)!,'https://fixture.test');expect(url.origin).toBe('https://fixture.test');expect(url.pathname).toBe(path);expect([...url.searchParams]).toEqual([['export','1'],['expectedOwnerId',owner]]);}
});
