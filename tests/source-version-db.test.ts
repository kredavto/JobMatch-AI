import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const db=vi.hoisted(()=>({supabase:vi.fn()}));vi.mock('../lib/db',()=>db);
import {sourceVersionStorageAvailable,sourceVersionCommand,listSourceVersions,readSourceVersion,clearSourceVersions,sourceVersionStream} from '../lib/source-version-db';
import {sourceCollectionHash} from '../lib/source-version';
import {sourceOwner,sourceEntryId,sourcePreviewFor,sourceVersionFor,sourceVersionListFor} from './source-version-fixture';
const user={id:sourceOwner,token:'user-jwt'},previewIntent={action:'preview' as const,expectedOwnerId:sourceOwner,workspaceRevision:4,profileRevision:2,entryIds:[sourceEntryId]};
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('JOBMATCH_SOURCE_VERSIONS_ENABLED','true');vi.stubEnv('JOBMATCH_SOURCE_PROFILE_ENABLED','true');});afterEach(()=>vi.unstubAllEnvs());
it('requires exact environment flag and database capability; default-off save never sends content or save RPC',async()=>{
 const v=await sourceVersionFor(),save={...previewIntent,action:'save' as const,previewHash:v.preview_hash,accept:'SAVE_LITERAL_SOURCE_VERSION' as const,consentToStore:true as const};
 db.supabase.mockResolvedValue(true);vi.stubEnv('JOBMATCH_SOURCE_VERSIONS_ENABLED','false');await expect(sourceVersionCommand(user,save)).rejects.toMatchObject({status:503});expect(db.supabase).not.toHaveBeenCalled();
 vi.stubEnv('JOBMATCH_SOURCE_VERSIONS_ENABLED','true');db.supabase.mockResolvedValue(false);expect(await sourceVersionStorageAvailable(user)).toBe(false);db.supabase.mockResolvedValue('true');await expect(sourceVersionStorageAvailable(user)).rejects.toMatchObject({status:502});
});
it('preview sends only both revisions and selected IDs, validates current owner/context/hash, and cannot write',async()=>{
 const p=await sourcePreviewFor();db.supabase.mockResolvedValue(p);expect(await sourceVersionCommand(user,previewIntent)).toEqual(p);
 expect(db.supabase).toHaveBeenCalledExactlyOnceWith('/rest/v1/rpc/preview_source_version','POST',{p_workspace_revision:4,p_profile_revision:2,p_entry_ids:[sourceEntryId]},'user-jwt');
 db.supabase.mockResolvedValue({...p,text:p.text+' invented'});await expect(sourceVersionCommand(user,previewIntent)).rejects.toMatchObject({status:502});
});
it('save validates the immutable result against the exact preview hash/revisions/selection',async()=>{
 const v=await sourceVersionFor(),save={...previewIntent,action:'save' as const,previewHash:v.preview_hash,accept:'SAVE_LITERAL_SOURCE_VERSION' as const,consentToStore:true as const};db.supabase.mockResolvedValueOnce(true).mockResolvedValueOnce(v);
 expect(await sourceVersionCommand(user,save)).toEqual(v);expect(db.supabase).toHaveBeenLastCalledWith('/rest/v1/rpc/save_source_version','POST',{p_workspace_revision:4,p_profile_revision:2,p_entry_ids:[sourceEntryId],p_preview_hash:v.preview_hash,p_accept:'SAVE_LITERAL_SOURCE_VERSION'},'user-jwt');
 db.supabase.mockResolvedValueOnce(true).mockResolvedValueOnce({...v,source_status:'current'});await expect(sourceVersionCommand(user,save)).rejects.toMatchObject({status:502});
});
it('uncertain save and clear never retry or echo a private failure',async()=>{
 const v=await sourceVersionFor(),save={...previewIntent,action:'save' as const,previewHash:v.preview_hash,accept:'SAVE_LITERAL_SOURCE_VERSION' as const,consentToStore:true as const};db.supabase.mockResolvedValueOnce(true).mockRejectedValueOnce(Error('PRIVATE_TOKEN'));
 await expect(sourceVersionCommand(user,save)).rejects.toThrow('Результат сохранения неизвестен');expect(db.supabase).toHaveBeenCalledTimes(2);
 db.supabase.mockRejectedValueOnce(Error('PRIVATE_TOKEN'));await expect(clearSourceVersions(user,'a'.repeat(64))).rejects.toThrow('Результат удаления неизвестен');expect(db.supabase).toHaveBeenCalledTimes(3);
});
it('history validates both owner and collection hash; detail validates ID and payload',async()=>{
 const list=await sourceVersionListFor(),v=await sourceVersionFor();db.supabase.mockResolvedValueOnce(list).mockResolvedValueOnce(v);expect(await listSourceVersions(user)).toEqual(list);expect(await readSourceVersion(user,v.id)).toEqual(v);
 db.supabase.mockResolvedValueOnce({...list,collection_hash:'0'.repeat(64)});await expect(listSourceVersions(user)).rejects.toMatchObject({status:502});db.supabase.mockResolvedValueOnce(null);await expect(readSourceVersion(user,v.id)).rejects.toMatchObject({status:404});
 db.supabase.mockResolvedValueOnce(v);await expect(readSourceVersion(user,sourceEntryId)).rejects.toMatchObject({status:502});
});
it('explicit hash-bound cleanup remains available with creation disabled and must return valid empty history',async()=>{
 vi.stubEnv('JOBMATCH_SOURCE_VERSIONS_ENABLED','false');const list=await sourceVersionListFor(),data={...list,versions:[]},empty={...data,collection_hash:await sourceCollectionHash(data)};db.supabase.mockResolvedValue(empty);
 expect(await clearSourceVersions(user,list.collection_hash)).toEqual(empty);expect(db.supabase).toHaveBeenCalledExactlyOnceWith('/rest/v1/rpc/clear_source_versions','POST',{p_collection_hash:list.collection_hash,p_accept:'DELETE_LITERAL_SOURCE_VERSIONS'},'user-jwt');
 db.supabase.mockResolvedValue(list);await expect(clearSourceVersions(user,list.collection_hash)).rejects.toMatchObject({status:502});
});
it('initial-list export emits validated complete bytes and refuses substitution in every list summary',async()=>{
 const v=await sourceVersionFor(),list=await sourceVersionListFor(v),read=vi.fn().mockResolvedValue(v);const rows=(await new Response(sourceVersionStream(list,read)).text()).trim().split('\n').map(x=>JSON.parse(x));expect(rows[1]).toEqual(v);expect(rows[2]).toMatchObject({complete:true,count:1});expect(read).toHaveBeenCalledExactlyOnceWith(v.id);
 for(const patch of [{created:'2026-11-01T00:02:00Z'},{profile_revision:3},{workspace_revision:5},{text_length:1},{preview_hash:'a'.repeat(64)}]){const wrong=structuredClone(list);Object.assign(wrong.versions[0],patch);const text=await new Response(sourceVersionStream(wrong,async()=>v)).text();expect(text).toContain('"complete":false');expect(text).not.toContain('"complete":true');}
});
it('export byte limit and private errors never fabricate completion or reveal failure details',async()=>{
 const v=await sourceVersionFor(),list=await sourceVersionListFor(v);for(const stream of [sourceVersionStream(list,async()=>v,undefined,1),sourceVersionStream(list,async()=>{throw Error('PRIVATE_RPC');})]){const text=await new Response(stream).text();expect(text).toContain('"complete":false');expect(text).not.toContain('"complete":true');expect(text).not.toContain('PRIVATE');}
});
it.each([false,true])('cancelled held export discards late result/rejection without more reads: %s',async rejected=>{
 const v=await sourceVersionFor(),list=await sourceVersionListFor(v);let settle!:(value:unknown)=>void;const read=vi.fn(()=>new Promise((resolve,reject)=>{settle=rejected?reject:resolve;})),reader=sourceVersionStream(list,read).getReader();await reader.read();const pending=reader.read();await vi.waitFor(()=>expect(read).toHaveBeenCalledTimes(1));await reader.cancel(new Proxy({},{get(){throw Error('PRIVATE_REASON');}}));settle(rejected?Error('PRIVATE_LATE'):v);expect((await pending).done).toBe(true);expect((await reader.read()).done).toBe(true);expect(read).toHaveBeenCalledTimes(1);
});

it('export freezes its initial list against caller/callback mutations',async()=>{
 const v=await sourceVersionFor(),list=await sourceVersionListFor(v),stream=sourceVersionStream(list,async()=>v);list.versions.length=0;list.ownerId='22222222-2222-4222-8222-222222222222';
 const rows=(await new Response(stream).text()).trim().split('\n').map(x=>JSON.parse(x));expect(rows[0].ownerId).toBe(sourceOwner);expect(rows[1]).toEqual(v);expect(rows.at(-1)).toMatchObject({complete:true,count:1});
});
