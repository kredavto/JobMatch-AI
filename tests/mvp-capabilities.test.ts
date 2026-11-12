import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {GET} from '../app/api/mvp/capabilities/route';
beforeEach(()=>{
 vi.stubEnv('JOBMATCH_HH_OAUTH_ENABLED','true');vi.stubEnv('HH_CLIENT_ID','synthetic-id');vi.stubEnv('HH_CLIENT_SECRET','synthetic-secret');vi.stubEnv('HH_SESSION_KEY','a'.repeat(64));vi.stubEnv('HH_USER_AGENT','SyntheticTest/1.0 (test@example.com)');vi.stubEnv('HH_APP_ORIGIN','https://app.test');
 vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('Capabilities must not contact HH');}));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('reports configuration only, not authentication or live access, with no network or secrets',async()=>{
 const response=await GET(),body=await response.json();expect(body.hh).toEqual({state:'configured_unverified'});expect(body.ai.mode).toBe('automatic');expect(JSON.stringify(body)).not.toContain('synthetic-secret');expect(JSON.stringify(body)).not.toContain('synthetic-id');expect(response.headers.get('cache-control')).toContain('no-store');expect(fetch).not.toHaveBeenCalled();
});
it.each([['JOBMATCH_HH_OAUTH_ENABLED','false'],['HH_CLIENT_ID',''],['HH_CLIENT_SECRET',''],['HH_SESSION_KEY','invalid'],['HH_USER_AGENT','bad\nagent'],['HH_APP_ORIGIN','http://app.test'],['HH_APP_ORIGIN','https://app.test/path']])('fails closed for invalid %s without network',async(name,value)=>{
 vi.stubEnv(name,value);expect((await (await GET()).json()).hh).toEqual({state:'not_configured'});expect(fetch).not.toHaveBeenCalled();
});
