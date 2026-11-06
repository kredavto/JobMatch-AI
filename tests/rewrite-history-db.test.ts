import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {readWorkspace,applyWorkspaceCommand,supabase} from '../lib/db';
import {requireRewriteHistoryReady,requireRewriteStorageReady} from '../lib/ai-rewrite-version-capability';
import {reviewedVersionFixture} from './fixtures/rewrite-version';
import {rewriteState} from './fixtures/rewrite-review';
const user={id:rewriteState().ownerId!,token:'public-owned-fixture-token'};
let fetcher:ReturnType<typeof vi.spyOn>;
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
beforeEach(()=>{vi.stubEnv('SUPABASE_URL','http://127.0.0.1:1');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','public-fixture');fetcher=vi.spyOn(globalThis,'fetch');});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
it('reads legacy workspaces with no new capability dependency and preserves unknown metadata',async()=>{
 const state={...rewriteState(),versions:[{id:'legacy',created:'2026-01-01',text:'original',vacancy:'',score:0,evidence_ids:[],custom:'preserved'}]};fetcher.mockResolvedValue(json(state));expect(await readWorkspace(user)).toEqual(state);expect(fetcher).toHaveBeenCalledTimes(1);
});
it('requires closed native history capability before accepting even a self-consistent archival object',async()=>{
 const f=await reviewedVersionFixture(),state={...f.state,versions:[f.row]};fetcher.mockResolvedValueOnce(json(state)).mockResolvedValueOnce(json(false));await expect(readWorkspace(user)).rejects.toMatchObject({status:503,code:'AI_REWRITE_HISTORY_UNAVAILABLE'});expect(fetcher).toHaveBeenCalledTimes(2);
});
it('validates full history and restore provenance with feature flags and current signing key absent',async()=>{
 const f=await reviewedVersionFixture(),copy={...f.row,id:'22222222-2222-4222-8222-222222222222',created:new Date(Date.parse(f.row.created)+1000).toISOString(),restored_from:f.row.id},state={...f.state,versions:[f.row,copy]};fetcher.mockResolvedValueOnce(json(state)).mockResolvedValueOnce(json(true));expect(await readWorkspace(user)).toEqual(state);
});
it('binds canonical RLS reads without the optional ownerId field to the authenticated actor',async()=>{
 const f=await reviewedVersionFixture(),state={...f.state,versions:[f.row]};delete state.ownerId;fetcher.mockResolvedValueOnce(json(state)).mockResolvedValueOnce(json(true));expect(await readWorkspace(user)).toEqual(state);
});
for(const mode of ['corrupt','unknown-namespace','missing-ancestor','foreign-owner'] as const)it('never returns partial or promoted history: '+mode,async()=>{
 const f=await reviewedVersionFixture(),row=structuredClone(f.row);let state:unknown={...f.state,versions:[row]};
 if(mode==='corrupt')row.text+='altered';if(mode==='unknown-namespace')row.engine_version='ai-rewrite-unrecognized-v2';if(mode==='missing-ancestor')Object.assign(row,{restored_from:'22222222-2222-4222-8222-222222222222'});if(mode==='foreign-owner')state={...f.state,ownerId:'22222222-2222-4222-8222-222222222222',versions:[row]};
 fetcher.mockResolvedValueOnce(json(state)).mockResolvedValueOnce(json(true));await expect(readWorkspace(user)).rejects.toMatchObject({status:502,code:'WORKSPACE_INVALID_RESPONSE'});
});
it('does not present a post-command capability error as proof that a mutation was not committed',async()=>{
 const f=await reviewedVersionFixture();fetcher.mockResolvedValueOnce(json({...f.state,revision:8,versions:[f.row]})).mockResolvedValueOnce(json(false));await expect(applyWorkspaceCommand(user,7,{action:'goal',text:'new'})).rejects.toMatchObject({status:502,code:'WORKSPACE_WRITE_INVALID'});expect(fetcher).toHaveBeenCalledTimes(2);
});
for(const mode of ['missing','false','malformed','auth','rate'] as const)it('capability failures remain closed: '+mode,async()=>{
 const call=vi.fn(async()=>{if(mode==='missing')throw Error('unknown rpc');if(mode==='auth')throw Error('AUTH');if(mode==='rate')throw Error('RATE');return mode==='false'?false:{ready:true};});
 if(mode==='auth'||mode==='rate')await expect(requireRewriteHistoryReady(user.token,call)).rejects.toThrow(mode.toUpperCase());else await expect(requireRewriteHistoryReady(user.token,call)).rejects.toMatchObject({status:mode==='malformed'?502:503});
 expect(call).toHaveBeenCalledTimes(1);
});
it('requires history protection before checking write configuration',async()=>{
 const call=vi.fn().mockResolvedValue(false);await expect(requireRewriteStorageReady(user.token,'a'.repeat(64),'b'.repeat(64),call)).rejects.toMatchObject({code:'AI_REWRITE_HISTORY_UNAVAILABLE'});expect(call).toHaveBeenCalledTimes(1);
});
it('maps bounded native write-disable refusal without exposing upstream payloads',async()=>{
 fetcher.mockResolvedValue(json({message:'REWRITE_STORAGE_UNAVAILABLE',private:'canary'},400));await expect(supabase('/rest/v1/rpc/accept_rewrite_version','POST',{},user.token)).rejects.toMatchObject({code:'AI_REWRITE_STORAGE_UNAVAILABLE',status:503});
});
