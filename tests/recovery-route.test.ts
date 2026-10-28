import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({supabase:vi.fn(),identity:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {POST} from '../app/api/recovery/route';
const verifier='a'.repeat(43);
const req=(body:unknown,cookie='',origin='https://app.test')=>new NextRequest('https://app.test/api/recovery',{method:'POST',headers:{origin,cookie},body:JSON.stringify(body)});
beforeEach(()=>{vi.stubEnv('APP_URL','https://app.test');db.supabase.mockReset();db.identity.mockReset();});
afterEach(()=>vi.unstubAllEnvs());
it('uses configured redirect and S256 without returning verifier or existence',async()=>{
 db.supabase.mockResolvedValue({});const r=await POST(req({action:'request',email:'test@example.test'}));
 expect(await r.json()).toEqual({ok:true});const [path,method,body]=db.supabase.mock.calls[0];expect(path).toBe('/auth/v1/recover?redirect_to=https%3A%2F%2Fapp.test%2Frecover');expect(method).toBe('POST');expect(body.code_challenge_method).toBe('s256');expect(body.code_challenge).toHaveLength(43);
 expect(r.headers.get('set-cookie')).toContain('HttpOnly');expect(r.headers.get('set-cookie')).toContain('Secure');expect(r.headers.get('set-cookie')).toContain('SameSite=strict');expect(r.headers.get('cache-control')).toBe('no-store');
});
it('fails closed without configuration',async()=>{vi.stubEnv('APP_URL','');const r=await POST(req({action:'request',email:'other@example.test'}));expect(r.status).toBe(503);expect(db.supabase).not.toHaveBeenCalled();});
it('rejects cross origin before provider access',async()=>{const r=await POST(req({action:'update',password:'new-password-123'},'jm_recovery_access=token','https://evil.test'));expect(r.status).toBe(403);expect(db.supabase).not.toHaveBeenCalled();});
it('requires PKCE cookie',async()=>{const r=await POST(req({action:'exchange',code:'fixture-code'}));expect(r.status).toBe(400);expect(db.supabase).not.toHaveBeenCalled();});
it('exchanges code without installing regular application cookies or returning tokens',async()=>{
 db.supabase.mockResolvedValue({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer'});
 const r=await POST(req({action:'exchange',code:'fixture-code'},'jm_recovery_verifier='+verifier));expect(await r.json()).toEqual({ok:true});expect(db.supabase).toHaveBeenCalledWith('/auth/v1/token?grant_type=pkce','POST',{auth_code:'fixture-code',code_verifier:verifier});
 expect(r.headers.get('set-cookie')).toContain('jm_recovery_access=fixture-access');expect(r.headers.get('set-cookie')).not.toContain('jm_access=');expect(r.headers.get('set-cookie')).not.toContain('fixture-refresh');
});
it('rejects malformed token grants',async()=>{db.supabase.mockResolvedValue({});const r=await POST(req({action:'exchange',code:'fixture'},'jm_recovery_verifier='+verifier));expect(r.status).toBe(502);expect(r.headers.get('set-cookie')).toBeNull();});
it('ordinary login cookie cannot authorize password update',async()=>{const r=await POST(req({action:'update',password:'new-password-123'},'jm_access=normal'));expect(r.status).toBe(401);expect(db.identity).not.toHaveBeenCalled();});
it('updates authenticated recovery owner then revokes sessions and clears cookies',async()=>{
 db.identity.mockResolvedValue({id:'owner'});db.supabase.mockResolvedValueOnce({id:'owner'}).mockResolvedValueOnce(null);
 const r=await POST(req({action:'update',password:'new-password-123'},'jm_recovery_access=recovery'));expect(await r.json()).toEqual({ok:true,sessionsRevoked:true});expect(db.identity).toHaveBeenCalledWith('recovery');expect(db.supabase).toHaveBeenNthCalledWith(1,'/auth/v1/user','PUT',{password:'new-password-123'},'recovery');expect(db.supabase).toHaveBeenNthCalledWith(2,'/auth/v1/logout?scope=global','POST',{},'recovery');expect(r.headers.get('set-cookie')).toContain('Max-Age=0');
});
it('reports successful password change separately from failed global logout',async()=>{db.identity.mockResolvedValue({id:'owner'});db.supabase.mockResolvedValueOnce({id:'owner'}).mockRejectedValueOnce(new Error('secret'));const r=await POST(req({action:'update',password:'new-password-123'},'jm_recovery_access=recovery'));expect(await r.json()).toEqual({ok:true,sessionsRevoked:false});});
it('never reflects provider secrets',async()=>{db.supabase.mockRejectedValue(new Error('private-token'));const r=await POST(req({action:'exchange',code:'fixture'},'jm_recovery_verifier='+verifier));expect(r.status).toBe(500);expect(JSON.stringify(await r.json())).not.toContain('private-token');});
