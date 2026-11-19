import {z} from 'zod';
export const VERSION_STORAGE_KEY='jobmatch.local-versions.v1';
export const VersionSchema=z.object({id:z.string().uuid(),createdAt:z.string().datetime(),name:z.string().min(1).max(100),source:z.string().min(20).max(100000),title:z.string().max(1000),text:z.string().min(1).max(200000),coverLetter:z.string().max(100000)}).strict();
export type LocalVersion=z.infer<typeof VersionSchema>;
export type VersionDraft=Omit<LocalVersion,'id'|'createdAt'>;
const StoreSchema=z.object({version:z.literal(1),versions:z.array(VersionSchema).max(3)}).strict();
export function readVersions(raw:string|null):LocalVersion[]{
 if(raw===null)return [];
 if(raw.length>1500000)throw new Error('Хранилище версий слишком велико.');
 const data=StoreSchema.parse(JSON.parse(raw));
 if(new Set(data.versions.map(v=>v.id)).size!==data.versions.length)throw new Error('Повторяющиеся версии.');
 return data.versions;
}
export function writeVersions(storage:Pick<Storage,'getItem'|'setItem'>,expected:string|null,versions:LocalVersion[]):string{
 if(storage.getItem(VERSION_STORAGE_KEY)!==expected)throw new Error('Версии изменились в другой вкладке. Перезагрузите страницу.');
 // Validate the old state too: corrupt records must never be silently replaced.
 readVersions(expected);
 const raw=JSON.stringify(StoreSchema.parse({version:1,versions}));
 readVersions(raw);
 storage.setItem(VERSION_STORAGE_KEY,raw);
 return raw;
}
