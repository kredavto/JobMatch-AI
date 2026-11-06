import {afterEach,expect,it,vi} from 'vitest';
import {readRpcText,RPC_ERROR_BYTES,RPC_RESPONSE_BYTES} from '../lib/db-rpc-response';
import {supabase,empty,readWorkspace,applyWorkspaceCommand} from '../lib/db';

const json={'content-type':'application/json'},signal=()=>new AbortController().signal;
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
function configured(response:Response){vi.stubEnv('SUPABASE_URL','https://public-fixture.test');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','public-fixture');const fetch=vi.fn().mockResolvedValue(response);vi.stubGlobal('fetch',fetch);return fetch;}
it.each(['null','true','0','"🧑‍💻\\r\\nкириллица"','{"value":[1,2]}'])('preserves a JSON RPC value without coercion: %s',async value=>{
 const fetch=configured(new Response(value,{headers:{'Content-Type':'Application/JSON; charset=utf-8'}}));
 expect(await supabase('/rest/v1/rpc/public_fixture','POST',{},'public-token')).toEqual(JSON.parse(value));
 expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0][1]).toMatchObject({cache:'no-store',redirect:'error',signal:expect.any(AbortSignal)});
});
it.each([201,202,204,206,301,302,307,308])('rejects non-200 RPC acknowledgement %i without waiting for a cancel hook',async status=>{
 const cancel=vi.fn(()=>new Promise<void>(()=>{}));const response=new Response(status===204?null:new ReadableStream({cancel}),{status,headers:json});
 await expect(readRpcText(response,signal())).rejects.toMatchObject({status:502,code:'UPSTREAM_INVALID_RESPONSE'});
 if(status!==204)expect(cancel).toHaveBeenCalledTimes(1);
});
it.each([['missing',{}],['HTML',{'content-type':'text/html'}],['lookalike',{'content-type':'application/jsonp'}]])('rejects %s MIME even if body is valid JSON',async(_name,headers)=>{
 const cancel=vi.fn();await expect(readRpcText(new Response(new ReadableStream({cancel}),{headers}),signal())).rejects.toMatchObject({status:502});expect(cancel).toHaveBeenCalledTimes(1);
});
it.each([['empty',''],['invalid JSON','PRIVATE PUBLIC FIXTURE'],['malformed UTF8',new Uint8Array([0x22,0xff,0x22])]])('refuses %s without exposing response content or retrying',async(_name,body)=>{
 const fetch=configured(new Response(body,{headers:json}));await expect(supabase('/rest/v1/rpc/public_fixture','POST',{},'public-token')).rejects.toMatchObject({status:502,code:'UPSTREAM_INVALID_RESPONSE',message:expect.not.stringContaining('PRIVATE')});expect(fetch).toHaveBeenCalledTimes(1);
});
it.each(['-1','NaN',String(RPC_RESPONSE_BYTES+1)])('rejects declared body size %s and cancels before reading',async length=>{
 const cancel=vi.fn();await expect(readRpcText(new Response(new ReadableStream({cancel}),{headers:{...json,'content-length':length}}),signal())).rejects.toMatchObject({status:502});expect(cancel).toHaveBeenCalledTimes(1);
});
it('enforces actual bytes without Content-Length and accepts the exact response boundary',async()=>{
 const prefix='"🧑‍💻',suffix='"',filler=' '.repeat(RPC_RESPONSE_BYTES-new TextEncoder().encode(prefix+suffix).length),value=prefix+filler+suffix;
 expect(new TextEncoder().encode(value).length).toBe(RPC_RESPONSE_BYTES);
 expect(await readRpcText(new Response(value,{headers:json}),signal())).toBe(value);
 const cancel=vi.fn();const response=new Response(new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(RPC_RESPONSE_BYTES));c.enqueue(new Uint8Array(1));},cancel}),{headers:json});
 await expect(readRpcText(response,signal())).rejects.toMatchObject({status:502});expect(cancel).toHaveBeenCalledTimes(1);expect(response.body!.locked).toBe(false);
});
it('keeps a smaller error budget while preserving bounded known PostgREST errors',async()=>{
 let fetch=configured(Response.json({message:'CONFLICT',details:'PUBLIC INTERNAL FIXTURE'},{status:400}));await expect(supabase('/rest/v1/rpc/public_fixture','POST',{})).rejects.toThrow('CONFLICT');expect(fetch).toHaveBeenCalledTimes(1);
 fetch=configured(Response.json({message:'CONFLICT',details:'x'.repeat(RPC_ERROR_BYTES)},{status:400}));await expect(supabase('/rest/v1/rpc/public_fixture','POST',{})).rejects.toMatchObject({status:502,code:'UPSTREAM_INVALID_RESPONSE'});expect(fetch).toHaveBeenCalledTimes(1);
});
it.each(['/rest/v1/rpc/apply_workspace_command','/rest/v1/rpc/consume_quota','/rest/v1/rpc/future_authenticated_writer'])('normalizes a bounded SQL AUTH from %s without replay',async path=>{
 const fetch=configured(Response.json({message:'AUTH',details:'PUBLIC PRIVATE FIXTURE'},{status:400}));await expect(supabase(path,'POST',{})).rejects.toThrow('AUTH');expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([[401,'AUTH'],[403,'AUTH'],[429,'RATE'],[500,'UPSTREAM_UNAVAILABLE'],[503,'UPSTREAM_UNAVAILABLE']])('status %i takes precedence over an endless non-JSON body',async(status,code)=>{
 const cancel=vi.fn(()=>new Promise<void>(()=>{}));const fetch=configured(new Response(new ReadableStream({cancel}),{status:status as number,headers:{'content-type':'text/html'}}));
 const result=supabase('/rest/v1/rpc/public_fixture','POST',{});if(status===401||status===403||status===429)await expect(result).rejects.toThrow(code as string);else await expect(result).rejects.toMatchObject({status:503,code});expect(cancel).toHaveBeenCalledTimes(1);expect(fetch).toHaveBeenCalledTimes(1);
});
it('times out a body with a non-settling cancel hook, releases its reader and never retries',async()=>{
 vi.useFakeTimers();const cancel=vi.fn(()=>new Promise<void>(()=>{})),response=new Response(new ReadableStream({cancel}),{headers:json}),fetch=configured(response);
 const result=expect(supabase('/rest/v1/rpc/public_fixture','POST',{})).rejects.toMatchObject({status:503,code:'UPSTREAM_TIMEOUT'});
 await vi.advanceTimersByTimeAsync(15000);await result;expect(cancel).toHaveBeenCalledTimes(1);expect(response.body!.locked).toBe(false);expect(fetch).toHaveBeenCalledTimes(1);
});
it('observes cancellation after headers, instead of accepting a late complete body',async()=>{
 const controller=new AbortController(),cancel=vi.fn(),response=new Response(new ReadableStream({cancel}),{headers:json});
 const result=expect(readRpcText(response,controller.signal)).rejects.toMatchObject({status:503,code:'UPSTREAM_TIMEOUT'});controller.abort();await result;expect(cancel).toHaveBeenCalledTimes(1);
});
it('does not let transport validation replace owner/revision/shape acknowledgement guards',async()=>{
 for(const state of [{...empty(),revision:2},{...empty(),revision:3,ownerId:'22222222-2222-4222-8222-222222222222'},{...empty(),revision:3,facts:'broken'}]){
  const fetch=configured(Response.json(state));await expect(applyWorkspaceCommand({id:'11111111-1111-4111-8111-111111111111',token:'public-token'},2,{action:'goal',text:'Analyst'})).rejects.toMatchObject({status:502,code:'WORKSPACE_WRITE_INVALID'});expect(fetch).toHaveBeenCalledTimes(1);
 }
 const fetch=configured(Response.json({...empty(),revision:3,original:'🧑‍💻\r\nExact é'}));expect((await readWorkspace({id:'11111111-1111-4111-8111-111111111111',token:'public-token'})).original).toBe('🧑‍💻\r\nExact é');expect(fetch).toHaveBeenCalledTimes(1);
});
it('keeps legitimate authentication HTTP201 separate from RPC HTTP200',async()=>{
 const fetch=configured(Response.json({user:{id:'public-fixture'}},{status:201}));expect(await supabase('/auth/v1/signup','POST',{fixture:true})).toEqual({user:{id:'public-fixture'}});expect(fetch.mock.calls[0][1]).not.toHaveProperty('redirect');
});
