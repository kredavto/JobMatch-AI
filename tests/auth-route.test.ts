import {beforeEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({supabase:vi.fn(),identity:vi.fn()}));
vi.mock('../lib/db',()=>({supabase:db.supabase,readWorkspace:vi.fn(),saveWorkspace:vi.fn(),consumeQuota:vi.fn(),identity:db.identity}));
import {POST} from '../app/api/service/route';
const user={id:'11111111-1111-4111-8111-111111111111',email:'demo@example.test'};
const session={access_token:'fake.access.token',refresh_token:'fake-refresh',expires_in:3600,token_type:'bearer'};
const request=(action:string,extra:Record<string,unknown>={})=>new NextRequest('https://app.test/api/service',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json',cookie:'jm_refresh=old-fixture'},body:JSON.stringify({action,email:user.email,password:'fixture-password-123',consent:true,...extra})});
beforeEach(()=>{db.supabase.mockReset();db.identity.mockReset();});
it.each(['login','refresh'])('sets secure cookies only for a validated %s response',async action=>{
 db.supabase.mockResolvedValue(session);const res=await POST(request(action));
 expect(res.status).toBe(200);expect(await res.json()).toEqual({ok:true});
 const cookies=res.headers.get('set-cookie')||'';
 expect(cookies).toContain('HttpOnly');expect(cookies).toContain('Secure');expect(cookies).toContain('SameSite=strict');expect(cookies).toContain('Max-Age=3600');
});
it.each(['login','refresh'])('does not treat a missing %s token as email confirmation',async action=>{
 db.supabase.mockResolvedValue(user);const res=await POST(request(action));
 expect(res.status).toBe(502);expect(res.headers.get('set-cookie')).toBeNull();
 expect(JSON.stringify(await res.json())).not.toContain(user.email);
});
it('requires a real signup user shape for the confirmation response',async()=>{
 db.supabase.mockResolvedValueOnce({}).mockResolvedValueOnce(user);
 const bad=await POST(request('register'));expect(bad.status).toBe(502);expect(bad.headers.get('set-cookie')).toBeNull();
 const good=await POST(request('register'));expect(await good.json()).toEqual({confirmationRequired:true});expect(good.headers.get('set-cookie')).toBeNull();
});
it('rejects invalid expiry without installing either cookie',async()=>{
 db.supabase.mockResolvedValue({...session,expires_in:'3600'});const res=await POST(request('login'));
 expect(res.status).toBe(502);expect(res.headers.get('set-cookie')).toBeNull();
});
it('allows local logout after session expiration without claiming a provider revocation',async()=>{
 db.identity.mockRejectedValueOnce(new Error('AUTH'));
 const res=await POST(request('logout'));expect(res.status).toBe(200);expect(await res.json()).toEqual({ok:true});
 expect(res.headers.get('set-cookie')).toContain('jm_access=');expect(res.headers.get('set-cookie')).toContain('jm_refresh=');
 expect(db.supabase).not.toHaveBeenCalled();
});
it('does not silently succeed when logout fails due to an upstream outage',async()=>{
 db.identity.mockResolvedValue({id:'owner',token:'fake'});db.supabase.mockRejectedValue(new Error('upstream secret'));
 const res=await POST(request('logout'));expect(res.status).toBe(500);expect(res.headers.get('set-cookie')).toBeNull();
 expect(JSON.stringify(await res.json())).not.toContain('secret');
});
it('rejects reauthentication to another owner before replacing cookies',async()=>{
 db.supabase.mockResolvedValue(session);db.identity.mockResolvedValue({id:'22222222-2222-4222-8222-222222222222',token:'new-token'});
 const res=await POST(request('login',{expectedOwnerId:user.id}));
 expect(res.status).toBe(409);expect(res.headers.get('set-cookie')).toBeNull();
});
it('permits reauthentication only after verifying the expected owner',async()=>{
 db.supabase.mockResolvedValue(session);db.identity.mockResolvedValue({id:user.id,token:'new-token'});
 const res=await POST(request('login',{expectedOwnerId:user.id}));
 expect(res.status).toBe(200);expect(db.identity).toHaveBeenCalledWith(session.access_token);expect(res.headers.get('set-cookie')).toContain('jm_access=');
});
it('rejects a mutation from a stale account tab before accessing its workspace',async()=>{
 db.identity.mockResolvedValue({id:'22222222-2222-4222-8222-222222222222',token:'new-token'});
 const res=await POST(request('verify',{expectedOwnerId:user.id,ids:[],verified:true}));
 expect(res.status).toBe(409);expect(db.supabase).not.toHaveBeenCalled();
});
it('does not revoke another account globally when logging out from a stale tab',async()=>{
 db.identity.mockResolvedValue({id:'22222222-2222-4222-8222-222222222222',token:'other-token'});
 const res=await POST(request('logout',{expectedOwnerId:user.id}));
 expect(res.status).toBe(200);expect(res.headers.get('set-cookie')).toContain('jm_access=');expect(db.supabase).not.toHaveBeenCalled();
});
