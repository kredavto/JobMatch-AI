import {z} from 'zod';
export const PROFILE_STORAGE_KEY='jobmatch.local-profiles.v1';
export const ProfileSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(100),text:z.string().trim().min(20).max(100000)}).strict();
export type LocalProfile=z.infer<typeof ProfileSchema>;
const StoreSchema=z.object({version:z.literal(1),profiles:z.array(ProfileSchema).max(5)}).strict();
export function readProfiles(raw:string|null):LocalProfile[]{
 if(raw===null)return [];
 if(raw.length>550000)throw new Error('Сохранённые профили слишком велики. Данные не изменены.');
 const data=StoreSchema.safeParse(JSON.parse(raw));
 if(!data.success||new Set(data.data.profiles.map(p=>p.id)).size!==data.data.profiles.length)throw new Error('Не удалось прочитать сохранённые профили. Данные не изменены.');
 return data.data.profiles;
}
export function serializeProfiles(profiles:LocalProfile[]):string{return JSON.stringify(StoreSchema.parse({version:1,profiles}));}
export function saveProfile(profiles:LocalProfile[],profile:LocalProfile):LocalProfile[]{
 const next=ProfileSchema.parse(profile),existing=profiles.some(p=>p.id===next.id);
 if(!existing&&profiles.length>=5)throw new Error('Можно сохранить до 5 профилей. Измените существующий профиль.');
 return existing?profiles.map(p=>p.id===next.id?next:p):[...profiles,next];
}
/** Refuse to overwrite changes made in another tab, including corrupt data. */
export function writeProfiles(storage:Pick<Storage,'getItem'|'setItem'>,expected:string|null,profiles:LocalProfile[]):string{
 if(storage.getItem(PROFILE_STORAGE_KEY)!==expected)throw new Error('Профили изменились в другой вкладке. Перезагрузите страницу перед сохранением.');
 const serialized=serializeProfiles(profiles);storage.setItem(PROFILE_STORAGE_KEY,serialized);return serialized;
}
