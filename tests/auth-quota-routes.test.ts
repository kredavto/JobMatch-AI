import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({supabase:vi.fn(),identity:vi.fn()}));
vi.mock('../lib/db',()=>db);
vi.mock('../lib/http',async importOriginal=>({...await importOriginal<typeof import('../lib/http')>(),rateLimit:vi.fn()}));
import {AUTH_PROTECTION_UNAVAILABLE} from '../lib/auth-quota';
import {rateLimit} from '../lib/http';
import {POST as service} from '../app/api/service/route';
import {POST as recovery} from '../app/api/recovery/route';
import {POST as mail} from '../app/api/auth-email/route';
const req=(path:string,body:unknown,cookie='',origin='https://app.test')=>new NextRequest('https://app.test'+path,{method:'POST',headers:{origin,cookie},body:JSON.stringify(body)});
beforeEach(()=>{vi.stubEnv('APP_URL','https://app.test');vi.stubEnv('JOBMATCH_AUTH_QUOTA_MODE','required');vi.stubEnv('JOBMATCH_AUTH_QUOTA_SECRET','a'.repeat(64));db.supabase.mockReset();db.identity.mockReset();vi.mocked(rateLimit).mockClear();});
afterEach(()=>vi.unstubAllEnvs());
const attempts=[
 ()=>service(req('/api/service',{action:'login',email:'a@example.test',password:'synthetic-password'})),
 ()=>service(req('/api/service',{action:'register',email:'a@example.test',password:'synthetic-password',consent:true})),
 ()=>service(req('/api/service',{action:'refresh'},'jm_refresh=synthetic-refresh')),
 ()=>recovery(req('/api/recovery',{action:'request',email:'a@example.test'})),
 ()=>recovery(req('/api/recovery',{action:'exchange',code:'synthetic-code'},'jm_recovery_verifier='+'a'.repeat(43))),
 ()=>recovery(req('/api/recovery',{action:'update',password:'synthetic-password'},'jm_recovery_access=synthetic-token')),
 ()=>mail(req('/api/auth-email',{email:'a@example.test'}))
];
it.each(attempts.map((attempt,index)=>[index,attempt] as const))('quota denial blocks Auth and cookies for route %#',async(_,attempt)=>{
 db.supabase.mockResolvedValue(false);const response=await attempt();expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('60');expect(response.headers.get('set-cookie')).toBeNull();expect(response.headers.get('cache-control')).toBe('no-store');expect(db.supabase).toHaveBeenCalledTimes(1);expect(db.supabase.mock.calls[0][0]).toBe('/rest/v1/rpc/consume_auth_quota');expect(db.identity).not.toHaveBeenCalled();
});
it('register charges credentials and shared mail budgets before signup',async()=>{
 db.supabase.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce({id:'11111111-1111-4111-8111-111111111111',email:'a@example.test'});
 const result=await attempts[1]();expect(result.status).toBe(200);expect(db.supabase.mock.calls.map(call=>call[0])).toEqual(['/rest/v1/rpc/consume_auth_quota','/rest/v1/rpc/consume_auth_quota','/auth/v1/signup']);expect(db.supabase.mock.calls[0][2].p_scope).toBe('credentials');expect(db.supabase.mock.calls[1][2].p_scope).toBe('mail');
});
it('recovery and resend normalize to the same central mail identity',async()=>{
 db.supabase.mockResolvedValue(true);await recovery(req('/api/recovery',{action:'request',email:'A@example.test'}));await mail(req('/api/auth-email',{email:'a@example.test'}));const calls=db.supabase.mock.calls.filter(call=>call[0].includes('consume_auth_quota'));expect(calls).toHaveLength(2);expect(calls[0][2].p_subject).toBe(calls[1][2].p_subject);
});
it('Origin/consent/APP_URL gates precede central quota; outage never invokes Auth',async()=>{
 expect((await service(req('/api/service',{action:'login'},'','https://evil.test'))).status).toBe(403);
 expect((await service(req('/api/service',{action:'register',email:'a@example.test',password:'synthetic-password'}))).status).toBe(400);
 vi.stubEnv('APP_URL','');expect((await attempts[6]()).status).toBe(503);expect(db.supabase).not.toHaveBeenCalled();
 db.supabase.mockRejectedValue(Error('secret-diagnostic'));const result=await attempts[0]();expect(result.status).toBe(503);expect(JSON.stringify(await result.json())).not.toContain('secret');expect(db.supabase).toHaveBeenCalledTimes(1);
});

it.each(attempts.map((attempt,index)=>[index,attempt] as const))('quota outage has a closed safe code and blocks every Auth route %#',async(_,attempt)=>{
 db.supabase.mockRejectedValue(Error('PRIVATE provider password / secret'));
 const response=await attempt();expect(response.status).toBe(503);
 expect(response.headers.get('set-cookie')).toBeNull();expect(response.headers.get('cache-control')).toBe('no-store');
 const body=await response.json();expect(body).toEqual({code:'AUTH_PROTECTION_UNAVAILABLE',error:AUTH_PROTECTION_UNAVAILABLE});
 expect(db.supabase).toHaveBeenCalledTimes(1);expect(db.supabase.mock.calls[0][0]).toBe('/rest/v1/rpc/consume_auth_quota');expect(db.identity).not.toHaveBeenCalled();
});
it.each([false,null])('registration cannot proceed when its second mail charge returns %j',async result=>{
 db.supabase.mockResolvedValueOnce(true).mockResolvedValueOnce(result);const response=await attempts[1]();
 expect(response.status).toBe(result===false?429:503);expect(response.headers.get('set-cookie')).toBeNull();
 expect(db.supabase.mock.calls.map(call=>call[0])).toEqual(['/rest/v1/rpc/consume_auth_quota','/rest/v1/rpc/consume_auth_quota']);
 expect(db.supabase.mock.calls.map(call=>call[2].p_scope)).toEqual(['credentials','mail']);expect(db.identity).not.toHaveBeenCalled();
});
it('missing cookies, malformed input and mail-origin mismatch do not charge quota',async()=>{
 expect((await service(req('/api/service',{action:'refresh'}))).status).toBe(401);
 expect((await recovery(req('/api/recovery',{action:'exchange',code:'synthetic-code'}))).status).toBe(400);
 expect((await recovery(req('/api/recovery',{action:'update',password:'synthetic-password'},'jm_access=ordinary-session'))).status).toBe(401);
 expect((await service(req('/api/service',{action:'login',email:'invalid',password:'synthetic-password'}))).status).toBe(400);
 vi.stubEnv('APP_URL','https://primary.test');expect((await attempts[3]()).status).toBe(400);expect((await attempts[6]()).status).toBe(400);
 expect(db.supabase).not.toHaveBeenCalled();expect(db.identity).not.toHaveBeenCalled();
});
it('local guards receive pseudonyms for normalized email while the central mail subject is shared',async()=>{
 db.supabase.mockResolvedValue(true);
 await service(req('/api/service',{action:'login',email:'A@example.test',password:'synthetic-password'}));
 await recovery(req('/api/recovery',{action:'request',email:'a@example.test'}));
 await mail(req('/api/auth-email',{email:'a@example.test'}));
 const keys=vi.mocked(rateLimit).mock.calls.map(call=>call[0]).filter(key=>/^(email|recovery-email|confirmation-email):/.test(key));
 expect(keys).toHaveLength(3);expect(new Set(keys.map(key=>key.split(':')[1])).size).toBe(1);
 for(const key of keys){expect(key).toMatch(/:[a-f0-9]{64}$/);expect(key).not.toContain('@');}
});
