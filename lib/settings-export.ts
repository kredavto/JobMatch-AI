import {z} from 'zod';
import {ExportSchema} from './export-schema';
import {WorkspaceRequestError} from './workspace-feedback';
export const SETTINGS_EXPORT_PATHS={facts:'/api/fact-history',letters:'/api/letter-versions',sources:'/api/source-versions',reminders:'/api/reminders'} as const;
export type SettingsExport=keyof typeof SETTINGS_EXPORT_PATHS;
export function knownSettingsOwner(value:unknown):value is string{return z.uuid().safeParse(value).success;}
/** Unknown identity must never create an unbound download URL. */
export function settingsExportHref(kind:SettingsExport,ownerId?:string){
 if(!knownSettingsOwner(ownerId))return null;
 return SETTINGS_EXPORT_PATHS[kind]+'?export=1&expectedOwnerId='+encodeURIComponent(ownerId);
}
/** Read-response identity consistency only; not a provider backup or transactional archive. */
export function validatedPersonalExport(data:unknown,context:{ownerId?:string;currentOwnerId?:string}){
 if(!knownSettingsOwner(context.ownerId))throw new WorkspaceRequestError('ownerUnknown');
 if(context.currentOwnerId!==context.ownerId)throw new WorkspaceRequestError('ownerChanged',409);
 const parsed=ExportSchema.safeParse(data);
 if(!parsed.success)throw new WorkspaceRequestError('exportInvalid',502);
 if(parsed.data.user.id!==context.ownerId||(parsed.data.workspace.ownerId!==undefined&&parsed.data.workspace.ownerId!==context.ownerId))throw new WorkspaceRequestError('ownerChanged',409);
 return parsed.data;
}
