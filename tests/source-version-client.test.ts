import {it,expect,vi,afterEach} from 'vitest';
import {sourceVersionRequest} from '../lib/source-version-client';
import {sourceOwner} from './source-version-fixture';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('fixed same-origin endpoint carries owner hint and uses no-store/redirect error with no retry',async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json({ok:true}));vi.stubGlobal('fetch',fetch);expect(await sourceVersionRequest(sourceOwner,new AbortController().signal,{action:'preview'})).toEqual({ok:true});
 expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/source-versions',expect.objectContaining({method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',headers:{'x-jobmatch-owner':sourceOwner,'Content-Type':'application/json'},body:'{"action":"preview"}'}));
});
it('failed/redirected/malformed content never echoes upstream errors or retries',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);for(const response of [Response.json({PRIVATE:'SECRET'},{status:503}),new Response('PRIVATE',{headers:{'content-type':'text/html'}}),new Response('{PRIVATE',{headers:{'content-type':'application/json'}}),new Response(new Uint8Array([255]),{headers:{'content-type':'application/json'}}),Response.json({ok:true},{status:206})]){fetch.mockResolvedValueOnce(response);await expect(sourceVersionRequest(sourceOwner,new AbortController().signal)).rejects.toMatchObject({message:'SOURCE_VERSION_REQUEST_FAILED'});}expect(fetch).toHaveBeenCalledTimes(5);
 fetch.mockRejectedValueOnce(Error('PRIVATE_REDIRECT'));await expect(sourceVersionRequest(sourceOwner,new AbortController().signal)).rejects.toMatchObject({status:0});expect(fetch).toHaveBeenCalledTimes(6);
});
it('declared or streamed oversize fails closed; invalid owner/id cannot choose a destination',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);for(const response of [new Response('{}',{headers:{'content-type':'application/json','content-length':'4000001'}}),new Response('x'.repeat(4000001),{headers:{'content-type':'application/json'}})]){fetch.mockResolvedValueOnce(response);await expect(sourceVersionRequest(sourceOwner,new AbortController().signal)).rejects.toMatchObject({status:502});}
 await expect(sourceVersionRequest('https://evil.test',new AbortController().signal)).rejects.toThrow();await expect(sourceVersionRequest(sourceOwner,new AbortController().signal,undefined,'../private')).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(2);
});
it('network cancellation is bounded even when a response cancellation hook does not settle',async()=>{
 const cancel=vi.fn(()=>new Promise<void>(()=>{}));vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new ReadableStream({cancel}),{status:503})));
 await expect(sourceVersionRequest(sourceOwner,new AbortController().signal)).rejects.toMatchObject({status:503});expect(cancel).toHaveBeenCalledTimes(1);
});
