import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {consumeAuthQuota} from '../lib/auth-quota';
const upstream=vi.fn();
beforeEach(()=>{vi.stubGlobal('fetch',upstream);vi.stubEnv('SUPABASE_URL','https://quota.test');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','synthetic-publishable');vi.stubEnv('JOBMATCH_AUTH_QUOTA_MODE','required');vi.stubEnv('JOBMATCH_AUTH_QUOTA_SECRET','a'.repeat(64));upstream.mockReset();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('uses the real fixed bounded RPC transport without redirect, raw identity or Authorization',async()=>{
 upstream.mockResolvedValue(new Response('true',{headers:{'content-type':'application/json'}}));await consumeAuthQuota('mail','synthetic@example.test');
 expect(upstream).toHaveBeenCalledTimes(1);const [url,init]=upstream.mock.calls[0];expect(url).toBe('https://quota.test/rest/v1/rpc/consume_auth_quota');expect(init).toMatchObject({redirect:'error',cache:'no-store',method:'POST',headers:{apikey:'synthetic-publishable'}});expect(init.headers).not.toHaveProperty('Authorization');expect(init.signal).toBeInstanceOf(AbortSignal);expect(init.body).not.toContain('synthetic@example.test');
});
for(const [label,response] of [
 ['oversized streamed body',()=>new Response('true'+' '.repeat(129),{headers:{'content-type':'application/json'}})],
 ['oversized declared body',()=>new Response('true',{headers:{'content-type':'application/json','content-length':'129'}})],
 ['wrong content type',()=>new Response('true',{headers:{'content-type':'text/html'}})],
 ['malformed UTF8',()=>new Response(new Uint8Array([0xff]),{headers:{'content-type':'application/json'}})],
 ['nonboolean JSON',()=>new Response('{"allowed":true}',{headers:{'content-type':'application/json'}})],
 ['redirect response',()=>new Response(null,{status:302,headers:{location:'https://other.test','content-type':'application/json'}})],
 ['non-200 boolean',()=>new Response('true',{status:503,headers:{'content-type':'application/json'}})]
 ,['nonstandard success boolean',()=>new Response('true',{status:201,headers:{'content-type':'application/json'}})]
] as const)it('fails closed for '+label,async()=>{upstream.mockResolvedValue(response());await expect(consumeAuthQuota('refresh','synthetic-token')).rejects.toMatchObject({status:503,code:'AUTH_PROTECTION_UNAVAILABLE'});expect(upstream).toHaveBeenCalledTimes(1);});
it('bounds a stalled response and cancels without waiting for the peer',async()=>{
 vi.useFakeTimers();let cancelled=false;upstream.mockResolvedValue(new Response(new ReadableStream({cancel(){cancelled=true;return new Promise(()=>{});}}),{headers:{'content-type':'application/json'}}));
 const result=consumeAuthQuota('mail','synthetic@example.test');const assertion=expect(result).rejects.toMatchObject({status:503,code:'AUTH_PROTECTION_UNAVAILABLE'});
 await vi.advanceTimersByTimeAsync(2100);await assertion;expect(cancelled).toBe(true);expect(upstream).toHaveBeenCalledTimes(1);
});
