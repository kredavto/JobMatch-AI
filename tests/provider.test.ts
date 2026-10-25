import {beforeEach,afterEach,it,expect,vi} from 'vitest';import {supabase,consumeQuota,identity} from '../lib/db';
beforeEach(()=>{vi.stubEnv('SUPABASE_URL','https://fixture.example');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','fixture');});afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('handles malformed upstream JSON as gateway failure',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>upstream secret</html>')));await expect(supabase('/rest/v1/test')).rejects.toMatchObject({status:502});});
it('handles upstream 403',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({message:'private'},{status:403})));await expect(supabase('/rest/v1/test')).rejects.toThrow('AUTH');});
it('handles upstream 429',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({message:'private'},{status:429})));await expect(supabase('/rest/v1/test')).rejects.toThrow('RATE');});
it('rejects quota schema drift',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({allowed:true})));await expect(consumeQuota({id:'owner',token:'t'},'import')).rejects.toMatchObject({status:502});});
it('fails closed on invalid session result',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({id:'11111111-1111-4111-8111-111111111111'})).mockResolvedValueOnce(Response.json({active:true})));await expect(identity('t')).rejects.toThrow('AUTH');});
it('does not expose network error messages',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('connection password=secret')));await expect(supabase('/rest/v1/test')).rejects.toMatchObject({status:503});});

it('reads normalized snapshot through owner-bound RPC',async()=>{const fetch=vi.fn().mockResolvedValue(Response.json({revision:4,original:'SQL',facts:[],versions:[],applications:[],vacancy:'',goal:''}));vi.stubGlobal('fetch',fetch);const {readWorkspace}=await import('../lib/db');expect((await readWorkspace({id:'owner',token:'jwt'})).revision).toBe(4);expect(fetch.mock.calls[0][0]).toBe('https://fixture.example/rest/v1/rpc/read_workspace');expect(fetch.mock.calls[0][1].body).toBe('{}');});
it('returns empty workspace for a new owner',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(null)));const {readWorkspace,empty}=await import('../lib/db');expect(await readWorkspace({id:'owner',token:'jwt'})).toEqual(empty());});
it('fails closed when normalized RPC schema drifts',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({revision:1,facts:'invalid'})));const {readWorkspace}=await import('../lib/db');await expect(readWorkspace({id:'owner',token:'jwt'})).rejects.toMatchObject({status:502});});
it('maps rejected database transition to safe validation error',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({message:'INVALID_WRITE'},{status:400})));await expect(supabase('/rest/v1/rpc/save_workspace','POST',{})).rejects.toMatchObject({status:400});});
it('rejects malformed nested normalized entities without leaking upstream data',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({revision:4,original:'SQL',facts:[],versions:[{id:'v',text:{private:'secret'}}],applications:[],vacancy:'',goal:''})));
 const {readWorkspace}=await import('../lib/db');
 await expect(readWorkspace({id:'owner',token:'jwt'})).rejects.toMatchObject({status:502,message:'Некорректный ответ хранилища. Повторите позже.'});
});
