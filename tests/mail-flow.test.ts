import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({supabase:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {POST} from '../app/api/auth-email/route';
import {mailOrigin} from '../lib/mail-origin';
import {mailFailure} from '../lib/mail-feedback';
const req=(body:unknown,origin='https://app.test')=>new NextRequest('https://app.test/api/auth-email',{method:'POST',headers:{origin},body:JSON.stringify(body)});
beforeEach(()=>{vi.stubEnv('APP_URL','https://app.test');db.supabase.mockReset();});
afterEach(()=>vi.unstubAllEnvs());
it('uses signup resend with canonical redirect and never creates accounts or grants a session',async()=>{
 db.supabase.mockResolvedValue({});const response=await POST(req({email:'Pending@EXAMPLE.test'}));expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true});expect(response.headers.get('cache-control')).toBe('no-store');expect(response.headers.get('set-cookie')).toBeNull();
 expect(db.supabase).toHaveBeenCalledExactlyOnceWith('/auth/v1/resend?redirect_to=https%3A%2F%2Fapp.test%2F','POST',{email:'pending@example.test',type:'signup'});
});
it('rejects unknown fields and cannot accept an attacker redirect or different email type',async()=>{
 const response=await POST(req({email:'fixture@example.test',redirectTo:'https://evil.test',type:'email_change'}));expect(response.status).toBe(400);expect(db.supabase).not.toHaveBeenCalled();
});
it('rejects cross-origin request before provider access',async()=>{expect((await POST(req({email:'cross@example.test'},'https://evil.test'))).status).toBe(403);expect(db.supabase).not.toHaveBeenCalled();});
it('allows one request per email per minute even when casing differs',async()=>{db.supabase.mockResolvedValue({});expect((await POST(req({email:'quota@example.test'}))).status).toBe(200);const second=await POST(req({email:'QUOTA@example.test'}));expect(second.status).toBe(429);expect(second.headers.get('retry-after')).toBe('60');expect(db.supabase).toHaveBeenCalledTimes(1);});
it('does not hide a provider outage as a successful email request or expose private details',async()=>{db.supabase.mockRejectedValue(new Error('smtp private secret'));const response=await POST(req({email:'outage@example.test'}));expect(response.status).toBe(500);expect(await response.text()).not.toContain('smtp private secret');});
it.each(['','http://app.test','https://user:secret@app.test','https://app.test/path','https://app.test/?next=evil','https://app.test/#fragment'])('fails closed for invalid canonical setting %s',value=>{vi.stubEnv('APP_URL',value);expect(()=>mailOrigin('https://app.test')).toThrow();});
it('does not issue a mail link on a domain that cannot receive its verifier',()=>{expect(()=>mailOrigin('https://preview.test')).toThrow('основном адресе');});
it('never uses a forwarded or user-controlled origin',()=>{expect(mailOrigin('https://app.test')).toBe('https://app.test');expect(()=>mailOrigin('https://evil.test')).toThrow();});
it('keeps password-update uncertainty distinct from a new request failure',()=>{expect(mailFailure(503,'update')).toContain('Сначала попробуйте войти с новым паролем');expect(mailFailure(503,'request')).toContain('администратору');expect(mailFailure(429,'exchange')).toContain('минуту');});
