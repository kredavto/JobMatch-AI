import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn()}));vi.mock('../lib/db',()=>db);
import {POST} from '../app/api/import/route';
const owner='11111111-1111-4111-8111-111111111111';
beforeEach(()=>{vi.clearAllMocks();db.identity.mockResolvedValue({id:owner,token:'private-jwt'});db.consumeQuota.mockResolvedValue(undefined);vi.stubEnv('IMPORT_PARSER_MODE','worker');vi.stubEnv('IMPORT_PARSER_URL','https://owned-parser.example/extract');vi.stubEnv('IMPORT_PARSER_TOKEN','worker_test_token_'.repeat(3));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function request(headers:Record<string,string>={}){const form=new FormData();form.set('file',new File(['Synthetic PDF bytes'],'personal-name.pdf'));return new NextRequest('https://app.test/api/import',{method:'POST',headers:{origin:'https://app.test','x-jobmatch-owner':owner,...headers},body:form});}
it('returns a draft only and keeps import auth/quota before worker transmission',async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json({ok:true,text:'Draft text SQL'}));vi.stubGlobal('fetch',fetch);const response=await POST(request());
 expect(response.status).toBe(200);expect(await response.json()).toEqual({text:'Draft text SQL'});expect(response.headers.get('cache-control')).toBe('no-store');
 expect(db.consumeQuota).toHaveBeenCalledWith({id:owner,token:'private-jwt'},'import');expect(fetch).toHaveBeenCalledTimes(1);expect(JSON.stringify(fetch.mock.calls[0][1].headers)).not.toContain('private-jwt');expect(JSON.stringify(fetch.mock.calls[0][1].headers)).not.toContain(owner);
});
it('keeps worker diagnostics out of the HTTP error and preserves no-store',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'sensitive worker details'},{status:500})));const response=await POST(request());expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toBe('no-store');expect((await response.json()).error).not.toContain('sensitive');});
it('rejects an unauthenticated upload before quota or worker',async()=>{db.identity.mockRejectedValue(new Error('AUTH'));const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect((await POST(request())).status).toBe(401);expect(db.consumeQuota).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();});
it('rejects a changed owner before quota or worker',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect((await POST(request({'x-jobmatch-owner':'22222222-2222-4222-8222-222222222222'}))).status).toBe(409);expect(db.consumeQuota).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();});
it('does not transmit a file when origin or quota fails',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect((await POST(request({origin:'https://foreign.test'}))).status).toBe(403);expect(db.identity).not.toHaveBeenCalled();db.consumeQuota.mockRejectedValue(new Error('RATE'));expect((await POST(request())).status).toBe(429);expect(fetch).not.toHaveBeenCalled();});

it('returns OCR provenance with the draft, without persisting the profile',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({ok:true,text:'Recognized SQL draft',ocrPages:2})));const response=await POST(request());expect(response.status).toBe(200);expect(await response.json()).toEqual({text:'Recognized SQL draft',ocrPages:2});expect(response.headers.get('cache-control')).toBe('no-store');});
