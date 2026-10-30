import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),supabase:vi.fn()}));vi.mock('../lib/db',()=>db);
import {GET,POST} from '../app/api/consent-receipts/route';
import {consentOwner,noticeFor,receiptFor,pageFor} from './fixtures/consent-receipts';
import {UserError} from '../lib/errors';
const get=(query='locale=ru',owner=consentOwner)=>new NextRequest('https://app.test/api/consent-receipts?expectedOwnerId='+owner+'&'+query);
const post=(body:unknown,origin='https://app.test',owner=consentOwner)=>new NextRequest('https://app.test/api/consent-receipts?expectedOwnerId='+owner,{method:'POST',headers:{origin},body:JSON.stringify(body)});
async function input(){const notice=await noticeFor(),receipt=await receiptFor(1,notice);return {notice,receipt,request:{expectedSequence:0,commandId:receipt.commandId,noticeVersion:notice.version,noticeLocale:notice.locale,noticeSha256:notice.sha256,acknowledged:true}};}
beforeEach(()=>{vi.stubEnv('JOBMATCH_CONSENT_ACCEPTANCE_ENABLED','true');db.identity.mockReset().mockResolvedValue({id:consentOwner,token:'SYNTHETIC'});db.consumeQuota.mockReset();db.supabase.mockReset();});
afterEach(()=>vi.unstubAllEnvs());
it('reads a strict owner-bound page from one fixed RPC with no write/retry',async()=>{
 const page=await pageFor();db.supabase.mockResolvedValue(page);const response=await GET(get());expect(response.status).toBe(200);expect(await response.json()).toEqual({page,acceptanceEnabled:true});expect(response.headers.get('cache-control')).toBe('no-store');expect(db.supabase).toHaveBeenCalledExactlyOnceWith('/rest/v1/rpc/read_consent_receipts','POST',{p_locale:'ru',p_after:0,p_through:null},'SYNTHETIC');
});
it('accepts only the compact explicit intent; text/time/owner come from the verified RPC record',async()=>{
 const {request,receipt}=await input();db.supabase.mockResolvedValue(receipt);const response=await POST(post(request));expect(response.status).toBe(200);expect(await response.json()).toEqual(receipt);expect(response.headers.get('set-cookie')).toBeNull();expect(db.supabase).toHaveBeenCalledExactlyOnceWith('/rest/v1/rpc/accept_processing_notice','POST',{p_expected_sequence:0,p_command_id:request.commandId,p_notice_version:request.noticeVersion,p_notice_locale:'ru',p_notice_sha256:request.noticeSha256,p_acknowledged:true},'SYNTHETIC');expect(db.consumeQuota).toHaveBeenCalledTimes(1);
});
it('origin/auth/known owner and strict query gates precede quota or DB access',async()=>{
 const {request}=await input();expect((await POST(post(request,'https://evil.test'))).status).toBe(403);
 db.identity.mockRejectedValueOnce(Error('AUTH'));expect((await GET(get())).status).toBe(401);
 expect((await POST(post(request,'https://app.test','44444444-4444-4444-8444-444444444444'))).status).toBe(409);
 for(const query of ['locale=ru&locale=en','locale=fr','locale=ru&after=01','locale=ru&after=201','locale=ru&extra=1'])expect((await GET(get(query))).status).toBe(400);
 expect((await GET(new NextRequest('https://app.test/api/consent-receipts?locale=ru'))).status).toBe(400);expect(db.consumeQuota).not.toHaveBeenCalled();expect(db.supabase).not.toHaveBeenCalled();
});
it('false acknowledgement, unexpected text/time and oversized bodies never reach the write RPC',async()=>{
 const {request}=await input();
 for(const body of [{...request,acknowledged:false},{...request,text:'PRIVATE'},{...request,recordedAt:'2020-01-01T00:00:00Z'}])expect((await POST(post(body))).status).toBe(400);
 expect((await POST(post({...request,padding:'x'.repeat(5000)}))).status).toBe(413);expect(db.supabase).not.toHaveBeenCalled();expect(db.consumeQuota).not.toHaveBeenCalled();
});
it('default-disabled acceptance does not hide reads or perform quota/write RPCs',async()=>{
 vi.stubEnv('JOBMATCH_CONSENT_ACCEPTANCE_ENABLED','false');const {request}=await input();const response=await POST(post(request));expect(response.status).toBe(503);expect((await response.json()).code).toBe('CONSENT_NOT_CONFIGURED');expect(db.consumeQuota).not.toHaveBeenCalled();expect(db.supabase).not.toHaveBeenCalled();
 db.supabase.mockResolvedValue(await pageFor());expect((await (await GET(get())).json()).acceptanceEnabled).toBe(false);expect(db.supabase).toHaveBeenCalledTimes(1);
});
it('invalid config and quota outage fail closed without a receipt write',async()=>{
 vi.stubEnv('JOBMATCH_CONSENT_ACCEPTANCE_ENABLED','wrong');expect((await GET(get())).status).toBe(503);expect(db.supabase).not.toHaveBeenCalled();
 vi.stubEnv('JOBMATCH_CONSENT_ACCEPTANCE_ENABLED','true');db.consumeQuota.mockRejectedValue(new UserError('PRIVATE',503,'UPSTREAM_UNAVAILABLE'));const {request}=await input();expect((await POST(post(request))).status).toBe(503);expect(db.supabase).not.toHaveBeenCalled();
});
it('malformed, other-owner and altered acknowledgements produce safe errors without retry',async()=>{
 const {request,receipt}=await input();
 for(const value of [null,{...receipt,ownerId:'44444444-4444-4444-8444-444444444444'},{...receipt,sequence:2},{...receipt,notice:{...receipt.notice,text:'PRIVATE'}}]){
  db.supabase.mockReset().mockResolvedValue(value);const response=await POST(post(request));expect(response.status).toBe(502);expect((await response.json()).code).toBe('WRITE_RESULT_INVALID');expect(db.supabase).toHaveBeenCalledTimes(1);
 }
 db.supabase.mockReset().mockResolvedValue(null);const response=await GET(get());expect(response.status).toBe(502);expect((await response.json()).code).toBe('CONSENT_RESPONSE_INVALID');expect(db.supabase).toHaveBeenCalledTimes(1);
});
