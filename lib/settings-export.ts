import {z} from 'zod';
const owner=z.uuid();
export const SETTINGS_EXPORT_PATHS={facts:'/api/fact-history',reminders:'/api/reminders',profile:'/api/structured-profile',versions:'/api/structured-versions'} as const;
export type SettingsExport=keyof typeof SETTINGS_EXPORT_PATHS;
/** Only same-origin, owner-bound exports. Unknown identity must not become an unbound download. */
export function settingsExportHref(kind:SettingsExport,ownerId?:string){
 if(!owner.safeParse(ownerId).success)return null;
 return SETTINGS_EXPORT_PATHS[kind]+'?export=1&expectedOwnerId='+encodeURIComponent(ownerId!);
}
