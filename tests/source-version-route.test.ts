import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),supabase:vi.fn()}));vi.mock('../lib/db',()=>db);
import {GET,POST} from '../app/api/source-versions/route';
import {sourceCollectionHash} from '../lib/source-version';
import {sourceOwner,sourceEntryId,sourcePreviewFor,sourceVersionFor,sourceVersionListFor} from './source-version-fixture';
const other='22222222-2222-4222-8222-222222222222';
const intent={action:'preview',expectedOwnerId:sourceOwner,workspaceRevision:4,profileRevision:2,entryIds:[sourceEntryId]};
const post=(data:unknown=intent,headers:Record<string,string>={origin:'https://app.test'})=>new NextRequest('https://app.test/api/source-versions',{method:'POST',headers,body:JSON.stringify(data)});
const get=(query='')=>new NextRequest('https://app.test/api/source-versions'+query);
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('JOBMATCH_SOURCE_PROFILE_ENABLED','true');vi.stubEnv('JOBMATCH_SOURCE_VERSIONS_ENABLED','true');db.identity.mockResolvedValue({id:sourceOwner,token:'synthetic-user'});
 db.supabase.mockImplementation(async path=>{
  if(path.endsWith('/source_version_storage_ready'))return true;
  if(path.endsWith('/preview_source_version'))return sourcePreviewFor();
  if(path.endsWith('/save_source_version')||path.endsWith('/read_source_version'))return sourceVersionFor();
  if(path.endsWith('/list_source_versions'))return sourceVersionListFor();
  if(path.endsWith('/clear_source_versions')){const data={format:'jobmatch-source-version-list-v1',ownerId:sourceOwner,versions:[]};return {...data,collection_hash:await sourceCollectionHash(data)};}
  throw Error('Unexpected RPC');
 });
});afterEach(()=>vi.unstubAllEnvs());
it('origin before auth; auth before body/preview, without provider write',async()=>{
 expect((await POST(post(intent,{}))).status).toBe(403);expect((await POST(post(intent,{origin:'https://evil.test'}))).status).toBe(403);expect(db.identity).not.toHaveBeenCalled();db.identity.mockRejectedValue(Error('AUTH'));expect((await POST(post())).status).toBe(401);expect(db.supabase).not.toHaveBeenCalled();
});
it.each([{expectedOwnerId:other},{text:'PRIVATE'},{workspaceRevision:-1},{profileRevision:2147483648},{entryIds:[sourceEntryId,sourceEntryId]},{entryIds:[]}])('strict context/selection refuses before quota/RPC: %j',async patch=>{
 expect((await POST(post({...intent,...patch}))).status).toBe(patch.expectedOwnerId?409:400);expect(db.consumeQuota).not.toHaveBeenCalled();expect(db.supabase).not.toHaveBeenCalled();
});
it('foreign header/query ownership wins before malformed/oversized body',async()=>{
 const r=new NextRequest('https://app.test/api/source-versions?expectedOwnerId='+other,{method:'POST',headers:{origin:'https://app.test','content-length':'8000'},body:'malformed'});expect((await POST(r)).status).toBe(409);expect(db.supabase).not.toHaveBeenCalled();
});
it('strict UTF8/JSON and byte limit keep invalid request content private',async()=>{
 for(const bytes of [new Uint8Array([255]),new TextEncoder().encode('{'),new TextEncoder().encode('x'.repeat(4097))]){const response=await POST(new NextRequest('https://app.test/api/source-versions',{method:'POST',headers:{origin:'https://app.test'},body:bytes}));expect(response.status).toBe(bytes.length>4096?413:400);}expect(db.supabase).not.toHaveBeenCalled();
});
it('preview calls only compact ID/revision RPC once and returns no-store exact validated preview',async()=>{
 const r=await POST(post());expect(r.status).toBe(200);expect(await r.json()).toEqual(await sourcePreviewFor());expect(r.headers.get('cache-control')).toBe('no-store');expect(db.supabase).toHaveBeenCalledExactlyOnceWith('/rest/v1/rpc/preview_source_version','POST',{p_workspace_revision:4,p_profile_revision:2,p_entry_ids:[sourceEntryId]},'synthetic-user');
});
it('separate explicit save consent/acceptance is required, environment/capability OFF refuses write',async()=>{
 const v=await sourceVersionFor(),save={...intent,action:'save',previewHash:v.preview_hash,accept:'SAVE_LITERAL_SOURCE_VERSION',consentToStore:true};expect((await POST(post({...save,consentToStore:false}))).status).toBe(400);expect(db.supabase).not.toHaveBeenCalled();
 vi.stubEnv('JOBMATCH_SOURCE_PROFILE_ENABLED','false');expect((await POST(post(save))).status).toBe(503);expect(db.supabase).not.toHaveBeenCalled();
});
it('save binds server-validated result; caller cannot supply a rewritten text/snapshot',async()=>{
 const v=await sourceVersionFor(),save={...intent,action:'save',previewHash:v.preview_hash,accept:'SAVE_LITERAL_SOURCE_VERSION',consentToStore:true};expect((await POST(post({...save,snapshot:{}}))).status).toBe(400);const r=await POST(post(save));expect(r.status).toBe(200);expect(await r.json()).toEqual(v);expect(db.supabase).toHaveBeenLastCalledWith('/rest/v1/rpc/save_source_version','POST',expect.objectContaining({p_preview_hash:v.preview_hash,p_accept:'SAVE_LITERAL_SOURCE_VERSION'}),'synthetic-user');
});
it('cleanup works with creation disabled and sends only reviewed collection hash/explicit marker',async()=>{
 vi.stubEnv('JOBMATCH_SOURCE_VERSIONS_ENABLED','false');const list=await sourceVersionListFor(),r=await POST(post({action:'clear',expectedOwnerId:sourceOwner,collectionHash:list.collection_hash,accept:'DELETE_LITERAL_SOURCE_VERSIONS'}));expect(r.status).toBe(200);expect((await r.json()).versions).toEqual([]);expect(db.supabase).toHaveBeenCalledExactlyOnceWith('/rest/v1/rpc/clear_source_versions','POST',{p_collection_hash:list.collection_hash,p_accept:'DELETE_LITERAL_SOURCE_VERSIONS'},'synthetic-user');
});
it('explicit GET lists read-only summaries/readiness; detail/export preserve immutable bytes and footer',async()=>{
 const r=await GET(get());expect(r.status).toBe(200);expect(await r.json()).toEqual({history:await sourceVersionListFor(),storageAvailable:true});expect(r.headers.get('cache-control')).toBe('no-store');const v=await sourceVersionFor();expect(await (await GET(get('?id='+v.id))).json()).toEqual(v);
 const exported=await GET(get('?export=1'));expect(exported.headers.get('content-type')).toContain('ndjson');const rows=(await exported.text()).trim().split('\n').map(x=>JSON.parse(x));expect(rows[1]).toEqual(v);expect(rows.at(-1)).toMatchObject({complete:true,count:1});expect(db.supabase.mock.calls.every(([path])=>!path.includes('save_')&&!path.includes('clear_'))).toBe(true);
});
it.each(['?bad=1','?id=invalid','?export=0','?export=1&export=1','?id='+sourceEntryId+'&export=1','?expectedOwnerId='+other])('GET refuses invalid/foreign query before data: %s',async query=>{
 expect((await GET(get(query))).status).toBe(query.includes('expectedOwnerId')?409:400);expect(db.supabase).not.toHaveBeenCalled();
});
it('auth/conflict/quota/fixed unreadable results do not retry and never expose raw details',async()=>{
 for(const [error,status] of [['AUTH',401],['CONFLICT',409],['RATE',429]] as const){db.supabase.mockRejectedValueOnce(Error(error));expect((await POST(post())).status).toBe(status);}db.supabase.mockResolvedValueOnce({PRIVATE:'PRIVATE'});const r=await POST(post());expect(r.status).toBe(502);expect(await r.text()).not.toContain('PRIVATE');expect(db.supabase).toHaveBeenCalledTimes(4);
});
