import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {aiConfig,aiReview} from '../lib/ai-provider';
const facts=[{id:'f1',text:'SQL',verified:true,source:'private-source'},{id:'f2',text:'Unconfirmed private data',verified:false,source:'private'}];
const grant={done:true,done_reason:'stop',message:{role:'assistant',content:JSON.stringify({requirements:[{quote:'SQL',evidence_ids:['f1']}]})}};
beforeEach(()=>{vi.stubEnv('JOBMATCH_AI_ENABLED','true');vi.stubEnv('JOBMATCH_AI_SELF_HOSTED','true');vi.stubEnv('JOBMATCH_AI_ENDPOINT','https://inference.example.test/api/chat');vi.stubEnv('JOBMATCH_AI_MODEL','fixture-model');vi.stubEnv('NODE_ENV','production');vi.stubEnv('JOBMATCH_AI_TOKEN','fixture-gateway-token-only');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it.each(['JOBMATCH_AI_ENABLED','JOBMATCH_AI_SELF_HOSTED'])('requires explicit operator configuration: %s',async name=>{vi.stubEnv(name,'false');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(aiReview(facts,'SQL',new AbortController().signal)).rejects.toMatchObject({status:503});expect(fetcher).not.toHaveBeenCalled();});
it.each(['http://inference.example.test/api/chat','https://user:secret@example.test/api/chat','https://example.test/api/chat?redirect=1','https://example.test/other','http://127.0.0.1/api/chat'])('rejects unsafe or production HTTP endpoint: %s',url=>{vi.stubEnv('JOBMATCH_AI_ENDPOINT',url);expect(()=>aiConfig()).toThrow();});
it('allows loopback HTTP only in development',()=>{vi.stubEnv('NODE_ENV','development');vi.stubEnv('JOBMATCH_AI_ENDPOINT','http://127.0.0.1:11434/api/chat');expect(aiConfig().endpoint).toBe('http://127.0.0.1:11434/api/chat');});
it('sends only eligible IDs/text to fixed endpoint; schema constrained, no redirect or retry',async()=>{const fetcher=vi.fn().mockResolvedValue(Response.json(grant));vi.stubGlobal('fetch',fetcher);await expect(aiReview(facts,'SQL',new AbortController().signal)).resolves.toEqual({requirements:[{quote:'SQL',evidence_ids:['f1']}]});expect(fetcher).toHaveBeenCalledTimes(1);const [url,options]=fetcher.mock.calls[0];expect(url).toBe('https://inference.example.test/api/chat');expect(options.redirect).toBe('error');const body=JSON.parse(options.body);expect(body.stream).toBe(false);expect(body.format.type).toBe('object');expect(body.messages[1].content).not.toContain('Unconfirmed');expect(body.messages[1].content).not.toContain('private-source');expect(body.messages[1].content).not.toContain('verified');});
it.each([
 ()=>Response.json({...grant,done:false}),
 ()=>Response.json({...grant,done_reason:'length'}),
 ()=>Response.json({...grant,message:{role:'assistant',content:'{"requirements":[{"quote":"invented","evidence_ids":[]}]}'}}),
 ()=>new Response('upstream-secret',{status:500}),
 ()=>new Response('not-json'),
 ()=>Response.json({...grant,padding:'x'.repeat(65000)})
])('fails closed on incomplete/invalid/provider responses %#',async response=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response()));await expect(aiReview(facts,'SQL',new AbortController().signal)).rejects.toMatchObject({status:502});});
it('redacts transport errors',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('credential-secret')));await expect(aiReview(facts,'SQL',new AbortController().signal)).rejects.not.toThrow('credential-secret');});
it('rejects oversized input before provider access',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(aiReview(facts,'я'.repeat(30000),new AbortController().signal)).rejects.toMatchObject({status:413});expect(fetcher).not.toHaveBeenCalled();});

it('requires a gateway token in production without leaking it',()=>{vi.stubEnv('JOBMATCH_AI_TOKEN','');expect(()=>aiConfig()).toThrow();});
