import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {UserError} from '../lib/errors';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),readWorkspace:vi.fn(),supabase:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {GET,POST} from '../app/api/rewrite-versions/route';
import {reviewedVersionFixture} from './fixtures/rewrite-version';
import {rewriteState} from './fixtures/rewrite-review';
import {rewriteConfig} from '../lib/ai-rewrite-provider';
const owner=rewriteState().ownerId!,other='22222222-2222-4222-8222-222222222222';
let fixture:Awaited<ReturnType<typeof reviewedVersionFixture>>,network:ReturnType<typeof vi.spyOn>;
const body=()=>({action:'accept',expectedOwnerId:owner,revision:7,receipt:fixture.receipt,consentToStore:true,accept:'STORE_REVIEWED_AI_REWRITE'});
const post=(value:unknown=body(),signal?:AbortSignal)=>new NextRequest('https://app.test/api/rewrite-versions',{method:'POST',headers:{origin:'https://app.test'},body:JSON.stringify(value),signal});
const get=(suffix='')=>new NextRequest('https://app.test/api/rewrite-versions?expectedOwnerId='+owner+suffix);
const writes=()=>db.supabase.mock.calls.filter(([path])=>path==='/rest/v1/rpc/accept_rewrite_version');
beforeEach(async()=>{
 vi.resetAllMocks();for(const [key,value] of Object.entries({NODE_ENV:'test',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:1/api/chat',JOBMATCH_AI_MODEL:'synthetic-unaccepted',JOBMATCH_AI_TOKEN:'public-fixture-only',JOBMATCH_LETTER_SIGNING_SECRET:'ab'.repeat(32),JOBMATCH_AI_REWRITE_ENABLED:'true',JOBMATCH_AI_REWRITE_REVIEW_ENABLED:'true',JOBMATCH_AI_REWRITE_STORAGE_ENABLED:'true',JOBMATCH_OPS_TELEMETRY:'off'}))vi.stubEnv(key,value);
 fixture=await reviewedVersionFixture(rewriteState(),{configurationId:rewriteConfig().configurationId});
 db.identity.mockResolvedValue({id:owner,token:'public-owned-session'});db.readWorkspace.mockImplementation(async()=>structuredClone(fixture.state));
 db.supabase.mockImplementation(async(path:string)=>path==='/rest/v1/rpc/accept_rewrite_version'?structuredClone(fixture.result):true);
 network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No network/model call permitted'));
});
afterEach(()=>{expect(network).not.toHaveBeenCalled();vi.restoreAllMocks();vi.unstubAllEnvs();});
it('accepts the exact signed review once, sends server-derived score only and leaves profile facts unchanged',async()=>{
 const before=structuredClone(fixture.state),response=await POST(post());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.json()).toEqual(fixture.result);
 expect(fixture.state).toEqual(before);expect(db.consumeQuota).toHaveBeenCalledExactlyOnceWith({id:owner,token:'public-owned-session'},'service');
 expect(writes()).toHaveLength(1);expect(writes()[0]).toEqual(['/rest/v1/rpc/accept_rewrite_version','POST',{p_revision:7,p_payload:fixture.receipt.payload,p_signature:fixture.receipt.signature,p_key_id:fixture.config.signing.keyId,p_configuration_id:fixture.config.configurationId,p_score:fixture.row.score,p_match_metadata:fixture.row.match_metadata,p_accept:'STORE_REVIEWED_AI_REWRITE'},'public-owned-session']);
});
for(const mode of ['origin','auth','owner','owner-header','revision','source','signature','consent','accept','extra-text','extra-score','disabled','review-disabled','preview-disabled','key','quota','foreign-storage','history-false','write-false','ready-shape','session-change','late-config','late-disable','late-expiry','cancel'] as const)it('refuses before mutation: '+mode,async()=>{
 const value=body(),control=new AbortController();let expected=400;
 switch(mode){
  case'auth':db.identity.mockRejectedValue(Error('AUTH'));expected=401;break;
  case'owner':value.expectedOwnerId=other;expected=409;break;
  case'revision':value.revision=6;expected=409;break;
  case'source':db.readWorkspace.mockResolvedValue({...fixture.state,original:fixture.state.original+'changed'});break;
  case'signature':value.receipt={...value.receipt,signature:'00'.repeat(32)};break;
  case'consent':Object.assign(value,{consentToStore:false});break;
  case'accept':value.accept='I_REVIEWED_IT';break;
  case'extra-text':Object.assign(value,{text:'replacement'});break;
  case'extra-score':Object.assign(value,{score:100});break;
  case'disabled':vi.stubEnv('JOBMATCH_AI_REWRITE_STORAGE_ENABLED','false');expected=503;break;
  case'review-disabled':vi.stubEnv('JOBMATCH_AI_REWRITE_REVIEW_ENABLED','false');expected=503;break;
  case'preview-disabled':vi.stubEnv('JOBMATCH_AI_REWRITE_ENABLED','false');expected=503;break;
  case'key':vi.stubEnv('JOBMATCH_LETTER_SIGNING_SECRET','');expected=503;break;
  case'quota':db.consumeQuota.mockRejectedValue(Error('RATE'));expected=429;break;
  case'foreign-storage':db.readWorkspace.mockResolvedValue({...fixture.state,ownerId:other});expected=502;break;
  case'history-false':db.supabase.mockResolvedValue(false);expected=503;break;
  case'write-false':db.supabase.mockResolvedValueOnce(true).mockResolvedValueOnce(false);expected=503;break;
  case'ready-shape':db.supabase.mockResolvedValue('true');expected=502;break;
  case'session-change':db.identity.mockResolvedValueOnce({id:owner,token:'public-owned-session'}).mockResolvedValue({id:other,token:'other'});expected=409;break;
  case'late-config':case'late-disable':case'late-expiry':case'cancel':db.supabase.mockImplementation(async()=>{if(mode==='late-config')vi.stubEnv('JOBMATCH_AI_TOKEN','public-fixture-rotated-token');if(mode==='late-disable')vi.stubEnv('JOBMATCH_AI_REWRITE_STORAGE_ENABLED','false');if(mode==='late-expiry')vi.spyOn(Date,'now').mockReturnValue((fixture.payload.expiresAt+1)*1000);if(mode==='cancel')control.abort();return true;});expected=mode==='late-config'?409:mode==='late-disable'?503:mode==='cancel'?504:400;
 }
 const request=post(value,control.signal);if(mode==='origin'){request.headers.set('origin','https://elsewhere.test');expected=403;}if(mode==='owner-header'){request.headers.set('x-jobmatch-owner',other);expected=409;}
 const response=await POST(request);expect(response.status).toBe(expected);expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.json()).not.toHaveProperty('version');expect(writes()).toHaveLength(0);
});
for(const mode of ['json','utf8','oversize','cap','preabort'] as const)it('bounded request and history capacity: '+mode,async()=>{
 let request=post(),expected=400;
 if(mode==='json')request=new NextRequest(request.url,{method:'POST',headers:request.headers,body:'{'});
 if(mode==='utf8')request=new NextRequest(request.url,{method:'POST',headers:request.headers,body:new Uint8Array([255])});
 if(mode==='oversize'){request=post({...body(),extra:'x'.repeat(524288)});expected=413;}
 if(mode==='cap')db.readWorkspace.mockResolvedValue({...fixture.state,versions:Array(100).fill(fixture.row)});
 if(mode==='preabort'){const controller=new AbortController();controller.abort();request=post(body(),controller.signal);expected=408;}
 expect((await POST(request)).status).toBe(expected);expect(writes()).toHaveLength(0);
});
for(const mode of ['transport','invalid-json','wrong-owner','wrong-revision','altered-text','auth','conflict','rate','disabled-native'] as const)it('one native call, no automatic retry after '+mode,async()=>{
 db.supabase.mockImplementation(async(path:string)=>{if(path!=='/rest/v1/rpc/accept_rewrite_version')return true;
  if(mode==='transport')throw new UserError('fixture',503,'UPSTREAM_TIMEOUT');if(mode==='auth')throw Error('AUTH');if(mode==='conflict')throw Error('CONFLICT');if(mode==='rate')throw Error('RATE');if(mode==='disabled-native')throw new UserError('fixture',503,'AI_REWRITE_STORAGE_UNAVAILABLE');
  if(mode==='invalid-json')return null;const result=structuredClone(fixture.result);if(mode==='wrong-owner')result.ownerId=other;if(mode==='wrong-revision')result.workspaceRevision++;if(mode==='altered-text')result.version.text+='changed';return result;});
 const response=await POST(post());expect(response.status).toBe(mode==='auth'?401:mode==='conflict'?409:mode==='rate'?429:mode==='disabled-native'?503:502);
 const value=await response.json();if(mode==='transport')expect(value.code).toBe('AI_REWRITE_VERSION_SAVE_UNKNOWN');expect(writes()).toHaveLength(1);
});
it('returns a validated known ACK after a late disconnect instead of manufacturing an unknown outcome',async()=>{
 const controller=new AbortController();db.supabase.mockImplementation(async(path:string)=>{if(path==='/rest/v1/rpc/accept_rewrite_version'){controller.abort();return fixture.result;}return true;});
 expect((await POST(post(body(),controller.signal))).status).toBe(200);expect(writes()).toHaveLength(1);
});
it('reads original archived text after expiry/key rotation/all feature flags disabled, with no MAC or model call',async()=>{
 db.readWorkspace.mockResolvedValue({...fixture.state,revision:8,versions:[fixture.row]});vi.spyOn(Date,'now').mockReturnValue((fixture.payload.expiresAt+1)*1000);
 for(const key of ['JOBMATCH_AI_REWRITE_STORAGE_ENABLED','JOBMATCH_AI_REWRITE_REVIEW_ENABLED','JOBMATCH_AI_REWRITE_ENABLED','JOBMATCH_AI_ENABLED','JOBMATCH_AI_SELF_HOSTED'])vi.stubEnv(key,'false');vi.stubEnv('JOBMATCH_LETTER_SIGNING_SECRET','');
 const response=await GET(get('&id='+fixture.row.id));expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.json()).toEqual({format:'jobmatch-ai-rewrite-history-v1',ownerId:owner,workspaceRevision:8,versions:[fixture.row]});expect(writes()).toHaveLength(0);
});
for(const mode of ['legacy','missing','query','duplicate','foreign','corrupt','owner','auth','rate'] as const)it('history preserves full-collection/owner/query boundaries: '+mode,async()=>{
 let request=get(),expected=400;
 switch(mode){case'legacy':expected=200;break;case'missing':request=get('&id='+fixture.row.id);expected=404;break;case'query':request=get('&text=override');break;case'duplicate':request=get('&expectedOwnerId='+owner);break;case'foreign':db.readWorkspace.mockResolvedValue({...fixture.state,ownerId:other});expected=502;break;case'corrupt':db.readWorkspace.mockResolvedValue({...fixture.state,versions:[{...fixture.row,text:'changed'}]});expected=502;break;case'owner':request=new NextRequest('https://app.test/api/rewrite-versions?expectedOwnerId='+other);expected=409;break;case'auth':db.identity.mockRejectedValue(Error('AUTH'));expected=401;break;case'rate':db.consumeQuota.mockRejectedValue(Error('RATE'));expected=429;}
 const response=await GET(request);expect(response.status).toBe(expected);if(mode==='legacy')expect((await response.json()).versions).toEqual([]);expect(writes()).toHaveLength(0);
});
