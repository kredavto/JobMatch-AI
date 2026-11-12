import {it,expect,vi,afterEach} from 'vitest';
import {NextRequest} from 'next/server';
import {POST as adapt} from '../app/api/ai-resume-adaptation/route';
import {POST as review} from '../app/api/ai-review/route';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it.each([adapt,review])('blocks legacy AI entrypoints before any network even with consent and enabled providers',async handler=>{
 vi.stubEnv('JOBMATCH_AI_ENABLED','true');vi.stubEnv('JOBMATCH_AI_ADAPTATION_ENABLED','true');vi.stubEnv('JOBMATCH_AI_SELF_HOSTED','true');vi.stubGlobal('fetch',vi.fn());
 const response=await handler(new NextRequest('https://app.test/api/ai-resume-adaptation',{method:'POST',headers:{origin:'https://app.test'},body:JSON.stringify({consent:true,revision:3,expectedOwnerId:'11111111-1111-4111-8111-111111111111'})}));
 expect(response.status).toBe(503);expect(await response.text()).toContain('hh.ru');expect(response.headers.get('cache-control')).toBe('no-store');expect(fetch).not.toHaveBeenCalled();
});
it.each([adapt,review])('retains cross-origin rejection without network',async handler=>{
 vi.stubGlobal('fetch',vi.fn());expect((await handler(new NextRequest('https://app.test/api/ai-review',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}))).status).toBe(403);expect(fetch).not.toHaveBeenCalled();
});
