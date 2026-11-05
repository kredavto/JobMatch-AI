import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const db=vi.hoisted(()=>({supabase:vi.fn()}));vi.mock('../lib/db',()=>db);
import {sourceVersionCommand,sourceVersionStream} from '../lib/source-version-db';
import {TEMPLATE_VERSION as RU,ENGLISH_TEMPLATE_VERSION as EN} from '../lib/source-version';
import {sourceOwner,sourceEntryId,sourcePreviewFor,sourceVersionFor,sourceVersionListFor} from './source-version-fixture';
const user={id:sourceOwner,token:'synthetic-jwt'},intent={action:'preview' as const,expectedOwnerId:sourceOwner,workspaceRevision:4,profileRevision:2,entryIds:[sourceEntryId],templateVersion:EN as typeof EN};
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('JOBMATCH_SOURCE_PROFILE_ENABLED','true');vi.stubEnv('JOBMATCH_SOURCE_VERSIONS_ENABLED','true');vi.stubEnv('JOBMATCH_SOURCE_ENGLISH_ENABLED','false');});afterEach(()=>vi.unstubAllEnvs());
it('default-off English preview performs no backend call and cannot fall back to Russian',async()=>{await expect(sourceVersionCommand(user,intent)).rejects.toMatchObject({status:503});expect(db.supabase).not.toHaveBeenCalled();});
it.each([false,'true',null,{}])('requires strict authenticated readiness before the English route: %s',async ready=>{vi.stubEnv('JOBMATCH_SOURCE_ENGLISH_ENABLED','true');db.supabase.mockResolvedValue(ready);await expect(sourceVersionCommand(user,intent)).rejects.toMatchObject({status:typeof ready==='boolean'?503:502});expect(db.supabase).toHaveBeenCalledExactlyOnceWith('/rest/v1/rpc/source_version_english_ready','POST',{},user.token);});
it('English preview sends only revisions and selected IDs, and checks the captured template',async()=>{
 vi.stubEnv('JOBMATCH_SOURCE_ENGLISH_ENABLED','true');const en=await sourcePreviewFor(undefined,EN);db.supabase.mockResolvedValueOnce(true).mockResolvedValueOnce(en);expect(await sourceVersionCommand(user,intent)).toEqual(en);
 expect(db.supabase).toHaveBeenLastCalledWith('/rest/v1/rpc/preview_source_version_english','POST',{p_workspace_revision:4,p_profile_revision:2,p_entry_ids:[sourceEntryId]},user.token);
 db.supabase.mockResolvedValueOnce(true).mockResolvedValueOnce(await sourcePreviewFor());await expect(sourceVersionCommand(user,intent)).rejects.toMatchObject({status:502});
});
it('explicit RU still uses the original wire without consulting English readiness',async()=>{const ru=await sourcePreviewFor();db.supabase.mockResolvedValue(ru);expect(await sourceVersionCommand(user,{...intent,templateVersion:RU})).toEqual(ru);expect(db.supabase).toHaveBeenCalledExactlyOnceWith('/rest/v1/rpc/preview_source_version','POST',{p_workspace_revision:4,p_profile_revision:2,p_entry_ids:[sourceEntryId]},user.token);});
it('save requires both storage and English permissions, validates the saved hash, and never retries a lost reply',async()=>{
 vi.stubEnv('JOBMATCH_SOURCE_ENGLISH_ENABLED','true');const en={...await sourceVersionFor(),...await sourcePreviewFor(undefined,EN)},save={...intent,action:'save' as const,previewHash:en.preview_hash,accept:'SAVE_LITERAL_SOURCE_VERSION' as const,consentToStore:true as const};
 db.supabase.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(en);expect(await sourceVersionCommand(user,save)).toEqual(en);expect(db.supabase).toHaveBeenLastCalledWith('/rest/v1/rpc/save_source_version_english','POST',{p_workspace_revision:4,p_profile_revision:2,p_entry_ids:[sourceEntryId],p_preview_hash:en.preview_hash,p_accept:save.accept},user.token);
 db.supabase.mockClear();db.supabase.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockRejectedValueOnce(Error('PRIVATE_LOST'));await expect(sourceVersionCommand(user,save)).rejects.toMatchObject({status:502,code:'SOURCE_VERSION_SAVE_UNKNOWN'});expect(db.supabase).toHaveBeenCalledTimes(3);
 db.supabase.mockClear();db.supabase.mockResolvedValueOnce(false);await expect(sourceVersionCommand(user,save)).rejects.toMatchObject({status:503});expect(db.supabase).toHaveBeenCalledTimes(1);
});
it('stored English export is independent of the construction gate and rejects a mismatched summary',async()=>{
 const en={...await sourceVersionFor(),...await sourcePreviewFor(undefined,EN)},list=await sourceVersionListFor(en);const rows=(await new Response(sourceVersionStream(list,async()=>en)).text()).trim().split('\n').map(x=>JSON.parse(x));expect(rows[1]).toEqual(en);expect(rows.at(-1)).toMatchObject({complete:true,count:1});
 list.versions[0].template_version=RU;const text=await new Response(sourceVersionStream(list,async()=>en)).text();expect(text).toContain('"complete":false');expect(text).not.toContain('"complete":true');expect(db.supabase).not.toHaveBeenCalled();
});
