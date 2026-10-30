import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createHmac} from 'node:crypto';
const db=vi.hoisted(()=>({supabase:vi.fn()}));vi.mock('../lib/db',()=>db);
import {consumeAuthQuota,localAuthKey} from '../lib/auth-quota';
beforeEach(()=>{vi.stubEnv('JOBMATCH_AUTH_QUOTA_MODE','required');vi.stubEnv('JOBMATCH_AUTH_QUOTA_SECRET','a'.repeat(64));db.supabase.mockReset();});
afterEach(()=>vi.unstubAllEnvs());
it('sends only signed pseudonym/timestamp to the fixed RPC, no raw identity, password or token',async()=>{
 db.supabase.mockResolvedValue(true);await consumeAuthQuota('mail','synthetic@example.test');expect(db.supabase).toHaveBeenCalledTimes(1);
 const [path,method,body]=db.supabase.mock.calls[0];expect(path).toBe('/rest/v1/rpc/consume_auth_quota');expect(method).toBe('POST');expect(body.p_subject).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(body)).not.toContain('synthetic@example.test');
 const signature=createHmac('sha256',Buffer.from('a'.repeat(64),'hex')).update(`jobmatch-auth-quota-v1\nmail\n${body.p_subject}\n${body.p_timestamp}`).digest('hex');expect(body.p_signature).toBe(signature);
});
it.each([false,null,{},'true'])('rejects quota denial or invalid response %j',async value=>{db.supabase.mockResolvedValue(value);await expect(consumeAuthQuota('credentials','synthetic')).rejects.toThrow(value===false?'RATE':'недоступна');expect(db.supabase).toHaveBeenCalledTimes(1);});
it('redacts errors and never retries or falls back',async()=>{db.supabase.mockRejectedValue(Error('provider-secret'));await expect(consumeAuthQuota('refresh','refresh-secret')).rejects.toMatchObject({status:503,code:'AUTH_PROTECTION_UNAVAILABLE'});expect(db.supabase).toHaveBeenCalledTimes(1);});
it.each(['','wrong','B'.repeat(64)])('fails closed before RPC without a valid secret %s',async key=>{vi.stubEnv('JOBMATCH_AUTH_QUOTA_SECRET',key);await expect(consumeAuthQuota('mail','test')).rejects.toMatchObject({status:503,code:'AUTH_PROTECTION_UNAVAILABLE'});expect(db.supabase).not.toHaveBeenCalled();});
it('local compatibility is explicit; unknown mode is not a bypass',async()=>{vi.stubEnv('JOBMATCH_AUTH_QUOTA_MODE','local');await consumeAuthQuota('mail','test');expect(db.supabase).not.toHaveBeenCalled();vi.stubEnv('JOBMATCH_AUTH_QUOTA_MODE','typo');await expect(consumeAuthQuota('mail','test')).rejects.toMatchObject({status:503,code:'AUTH_PROTECTION_UNAVAILABLE'});});
it('isolates scopes and never places raw identity in local key',async()=>{db.supabase.mockResolvedValue(true);await consumeAuthQuota('mail','same');await consumeAuthQuota('credentials','same');expect(db.supabase.mock.calls[0][2].p_subject).not.toBe(db.supabase.mock.calls[1][2].p_subject);expect(localAuthKey('raw@example.test')).toMatch(/^[a-f0-9]{64}$/);expect(localAuthKey('raw@example.test')).toBe(localAuthKey('raw@example.test'));});
