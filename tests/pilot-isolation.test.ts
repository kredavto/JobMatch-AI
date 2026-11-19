import {describe,it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import {pilotConfig,createPilotBackend} from '../mvp/pilot-backend';
import {createPilotAuthService} from '../mvp/pilot-auth-service';
import {supabase} from '../lib/db';
import {POST as legacyPost} from '../app/api/service/route';
import {NextRequest} from 'next/server';
const id='00000000-0000-4000-8000-000000000001';
const config={url:'https://xhpkjvlttfiaxbpgbjcp.supabase.co',key:'sb_publishable_test'};
const req=(body:unknown)=>new Request('https://local.test/api/pilot-auth',{method:'POST',headers:{origin:'https://local.test','content-type':'application/json'},body:JSON.stringify(body)});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('isolated pilot auth',()=>{
 it('requires explicit isolated publishable config, rejects legacy/service-role fallback',()=>{
 expect(pilotConfig({SUPABASE_URL:config.url,SUPABASE_PUBLISHABLE_KEY:config.key})).toBeNull();
 expect(pilotConfig({JOBMATCH_PILOT_ENABLED:'true',JOBMATCH_PILOT_SUPABASE_URL:config.url,JOBMATCH_PILOT_SUPABASE_PUBLISHABLE_KEY:'service-role'})).toBeNull();
 expect(pilotConfig({JOBMATCH_PILOT_ENABLED:'true',JOBMATCH_PILOT_SUPABASE_URL:config.url,JOBMATCH_PILOT_SUPABASE_PUBLISHABLE_KEY:config.key})).toEqual(config);
 });
 it('pilot env cannot activate legacy DB or workspace import',async()=>{
 vi.stubEnv('SUPABASE_URL','');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','');
 vi.stubEnv('JOBMATCH_PILOT_SUPABASE_URL',config.url);vi.stubEnv('JOBMATCH_PILOT_SUPABASE_PUBLISHABLE_KEY',config.key);
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 await expect(supabase('/rest/v1/rpc/save_workspace','POST',{original:'SYNTHETIC'})).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 const request=new NextRequest('https://local.test/api/service',{method:'POST',headers:{origin:'https://local.test','content-type':'application/json',cookie:'jm_pilot_access=synthetic'},body:JSON.stringify({action:'import',revision:0,text:'SYNTHETIC'})});
 expect((await legacyPost(request)).status).not.toBe(200);expect(fetcher).not.toHaveBeenCalled();
 });
 it('no registration/import/export or unrecognized fields reach backend',async()=>{
 const fetcher=vi.fn();const handle=createPilotAuthService(createPilotBackend(config,fetcher));
 for(const body of [{action:'register'},{action:'import',text:'SYNTHETIC'},{action:'export'},{action:'login',email:'test@example.test',password:'synthetic-only-password',resume:'SYNTHETIC'}])expect((await handle(req(body))).status).toBe(401);
 expect(fetcher).not.toHaveBeenCalled();
 });
 it('allows fixed paths only and never workspace RPC',async()=>{
 const fetcher=vi.fn();await expect(createPilotBackend(config,fetcher).call('/rest/v1/rpc/save_workspace',{})).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 });
 it('sign-in verifies user+active session and sets only scoped HttpOnly cookies',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:300,token_type:'bearer'})).mockResolvedValueOnce(Response.json({id,email_confirmed_at:'2026-01-01'})).mockResolvedValueOnce(Response.json(true));
 const r=await createPilotAuthService(createPilotBackend(config,fetcher))(req({action:'login',email:'test@example.test',password:'synthetic-only-password'}));
 expect(r.status).toBe(200);expect(r.headers.get('set-cookie')).toContain('jm_pilot_access=');expect(r.headers.get('set-cookie')).toContain('HttpOnly');expect(r.headers.get('set-cookie')).not.toContain('jm_access=');expect(await r.json()).toEqual({ok:true});
 expect(fetcher.mock.calls.every(([url])=>String(url).startsWith(config.url))).toBe(true);
 });
 it('disabled and foreign-origin requests never authenticate',async()=>{
 expect((await createPilotAuthService()(req({action:'logout'}))).status).toBe(503);
 const fetcher=vi.fn();const foreign=new Request('https://local.test',{method:'POST',headers:{origin:'https://evil.test'}});
 expect((await createPilotAuthService(createPilotBackend(config,fetcher))(foreign)).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();
 });
 it('UI never invokes legacy service; runtime has no legacy config dependency',()=>{
 expect(readFileSync('app/principal-rewrite-panel.tsx','utf8')).not.toContain('/api/service');
 for(const p of ['mvp/pilot-auth.ts','mvp/pilot-runtime.ts','mvp/pilot-backend.ts'])expect(readFileSync(p,'utf8')).not.toContain("from '../lib/db'");
 });
});
