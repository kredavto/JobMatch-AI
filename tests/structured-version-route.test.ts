import {it,expect,vi,beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),supabase:vi.fn()}));vi.mock('../lib/db',()=>db);
import {GET,POST} from '../app/api/structured-versions/route';
import {owner,entryId,versionId,previewFor,versionFor} from './fixtures/structured-version';
const body={action:'preview',expectedOwnerId:owner,workspaceRevision:1,profileRevision:2,entryIds:[entryId]};
const post=(value:unknown,origin='https://app.test')=>new NextRequest('https://app.test/api/structured-versions',{method:'POST',headers:{origin},body:JSON.stringify(value)});
const get=(query='')=>new NextRequest('https://app.test/api/structured-versions'+query);
beforeEach(()=>{db.identity.mockReset().mockResolvedValue({id:owner,token:'token'});db.consumeQuota.mockReset();db.supabase.mockReset();});
it('preview and save use fixed RPCs; server validates binding; no automatic retry',async()=>{
 const preview=await previewFor();db.supabase.mockResolvedValueOnce(preview);const r=await POST(post(body));expect(r.status).toBe(200);expect(db.supabase).toHaveBeenCalledWith('/rest/v1/rpc/preview_structured_version','POST',{p_workspace_revision:1,p_profile_revision:2,p_entry_ids:[entryId]},'token');
 db.supabase.mockResolvedValueOnce(await versionFor());expect((await POST(post({...body,action:'save',previewHash:preview.preview_hash,accept:'SAVE_LITERAL_VERSION'}))).status).toBe(200);expect(db.supabase).toHaveBeenCalledTimes(2);
});
it('origin, owner, acceptance, duplicate IDs and invented metadata rejected before RPC',async()=>{
 expect((await POST(post(body,'https://evil.test'))).status).toBe(403);expect((await POST(post({...body,expectedOwnerId:entryId}))).status).toBe(409);
 for(const bad of [{...body,text:'x'},{...body,entryIds:[entryId,entryId]},{...body,action:'save',previewHash:'a'.repeat(64)}])expect((await POST(post(bad))).status).toBe(400);
 expect(db.supabase).not.toHaveBeenCalled();
});
it('rejects forged or foreign successful replies without exposing them',async()=>{const p=await previewFor();db.supabase.mockResolvedValue({...p,text:'private forged'});const r=await POST(post(body));expect(r.status).toBe(502);expect(await r.text()).not.toContain('private forged');expect(db.supabase).toHaveBeenCalledTimes(1);});
it('auth/quota failures do not call version RPCs',async()=>{db.identity.mockRejectedValueOnce(Error('AUTH'));expect((await GET(get())).status).toBe(401);db.consumeQuota.mockRejectedValueOnce(Error('RATE'));expect((await POST(post(body))).status).toBe(429);expect(db.supabase).not.toHaveBeenCalled();});
it('owner hints, UUID and ambiguous export are rejected before reads',async()=>{expect((await GET(get('?expectedOwnerId='+entryId))).status).toBe(409);expect((await GET(get('?id=wrong'))).status).toBe(400);expect((await GET(get('?id='+versionId+'&export=1'))).status).toBe(400);expect(db.supabase).not.toHaveBeenCalled();});
it('reads immutable details and returns 404 for absent/foreign record',async()=>{db.supabase.mockResolvedValueOnce(await versionFor());const r=await GET(get('?id='+versionId));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');db.supabase.mockResolvedValueOnce(null);expect((await GET(get('?id='+versionId))).status).toBe(404);});
it('exports fixed list followed by validated record and complete marker',async()=>{const v=await versionFor();db.supabase.mockResolvedValueOnce({format:'jobmatch-structured-version-list-v1',ownerId:owner,versions:[{id:v.id,created:v.created,template_version:v.template_version,profile_revision:2,workspace_revision:1,text_length:Array.from(v.text).length,preview_hash:v.preview_hash}]}).mockResolvedValueOnce(v);const r=await GET(get('?export=1'));expect(r.headers.get('content-disposition')).toContain('jobmatch-structured-versions.ndjson');const rows=(await r.text()).trim().split('\n').map(line=>JSON.parse(line));expect(rows).toHaveLength(2);expect(rows[0]).toEqual(v);expect(rows[1].complete).toBe(true);expect(db.consumeQuota).toHaveBeenCalledTimes(2);});

it('explicit English uses distinct fixed RPCs with no caller template metadata in SQL params',async()=>{
 const en=await previewFor(undefined,'structured-literal-en-v1');
 db.supabase.mockResolvedValueOnce(en);
 expect((await POST(post({...body,templateVersion:'structured-literal-en-v1'}))).status).toBe(200);
 expect(db.supabase).toHaveBeenLastCalledWith('/rest/v1/rpc/preview_structured_english_version','POST',{p_workspace_revision:1,p_profile_revision:2,p_entry_ids:[entryId]},'token');
 db.supabase.mockResolvedValueOnce(await versionFor(undefined,'structured-literal-en-v1'));
 expect((await POST(post({...body,action:'save',templateVersion:'structured-literal-en-v1',previewHash:en.preview_hash,accept:'SAVE_LITERAL_VERSION'}))).status).toBe(200);
 expect(db.supabase).toHaveBeenLastCalledWith('/rest/v1/rpc/save_structured_english_version','POST',{p_workspace_revision:1,p_profile_revision:2,p_entry_ids:[entryId],p_preview_hash:en.preview_hash,p_accept:'SAVE_LITERAL_VERSION'},'token');
});
it('does not accept a valid foreign-language preview or save in place of the requested template',async()=>{
 db.supabase.mockResolvedValueOnce(await previewFor());expect((await POST(post({...body,templateVersion:'structured-literal-en-v1'}))).status).toBe(502);
 db.supabase.mockResolvedValueOnce(await previewFor(undefined,'structured-literal-en-v1'));expect((await POST(post(body))).status).toBe(502);
 const en=await versionFor(undefined,'structured-literal-en-v1');
 db.supabase.mockResolvedValueOnce(en);expect((await POST(post({...body,action:'save',previewHash:en.preview_hash,accept:'SAVE_LITERAL_VERSION'}))).status).toBe(502);
 expect(db.supabase).toHaveBeenCalledTimes(3);
});
it('invalid template/locale metadata is rejected before quota and RPC; mixed immutable details stay readable',async()=>{
 for(const value of [{...body,templateVersion:'en'},{...body,templateVersion:null},{...body,locale:'en'}])expect((await POST(post(value))).status).toBe(400);
 expect(db.supabase).not.toHaveBeenCalled();expect(db.consumeQuota).not.toHaveBeenCalled();
 const en=await versionFor(undefined,'structured-literal-en-v1');db.supabase.mockResolvedValueOnce(en);
 expect((await GET(get('?id='+versionId))).status).toBe(200);
});
