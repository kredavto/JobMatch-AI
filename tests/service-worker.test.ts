import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function worker(){
 const handlers:Record<string,(event:unknown)=>void>={};const cache={addAll:vi.fn(async()=>{}),match:vi.fn(async():Promise<Response|undefined>=>new Response('public offline'))};
 const caches={open:vi.fn(async()=>cache),keys:vi.fn(async()=>['jobmatch-public-v0','jobmatch-public-v1','jobmatch-public-v2','unrelated']),delete:vi.fn(async()=>true)};
 const fetch=vi.fn(async()=>new Response('network'));
 class LocalRequest extends Request{constructor(input:string,init?:RequestInit){super(new URL(input,'https://app.test'),init);}}
 const self={location:{origin:'https://app.test'},addEventListener:(name:string,handler:(event:unknown)=>void)=>{handlers[name]=handler;},skipWaiting:vi.fn(async()=>{}),clients:{claim:vi.fn(async()=>{})}};
 runInNewContext(source,{self,caches,fetch,Request:LocalRequest,Response,URL});return {handlers,cache,caches,fetch,self};
}
describe('service worker privacy boundary',()=>{
 it('installs only fixed public assets without credentials',async()=>{const w=worker();let task:Promise<unknown>|undefined;w.handlers.install({waitUntil:(p:Promise<unknown>)=>task=p});await task;const requests=w.cache.addAll.mock.calls[0] as unknown as [Request[]];expect(requests[0].map(r=>new URL(r.url).pathname)).toEqual(['/offline.html','/icon.svg','/icon-192.png','/icon-512.png']);expect(requests[0].every(r=>r.credentials==='omit')).toBe(true);});
 it.each([['/api/service','GET','navigate'],['/api/fact-history?export=1','GET','cors'],['/api/import','POST','cors'],['/','POST','navigate'],['https://other.test/','GET','navigate'],['/_next/static/a.js','GET','cors'],['/icon.svg?private=1','GET','cors']])('does not intercept %s %s', (path,method,mode)=>{const w=worker(),respondWith=vi.fn();w.handlers.fetch({request:{url:new URL(path,'https://app.test').href,method,mode},respondWith});expect(respondWith).not.toHaveBeenCalled();expect(w.caches.open).not.toHaveBeenCalled();});
 it('serves generic offline screen only when navigation fails',async()=>{const w=worker();w.fetch.mockRejectedValueOnce(new Error('offline'));let response:Promise<Response>|undefined;w.handlers.fetch({request:{url:'https://app.test/',method:'GET',mode:'navigate'},respondWith:(p:Promise<Response>)=>response=p});expect(await (await response!).text()).toBe('public offline');expect(w.cache.addAll).not.toHaveBeenCalled();});
 it('never caches successful personalized documents',async()=>{const w=worker();w.fetch.mockResolvedValueOnce(new Response('private profile'));let response:Promise<Response>|undefined;w.handlers.fetch({request:{url:'https://app.test/',method:'GET',mode:'navigate'},respondWith:(p:Promise<Response>)=>response=p});expect(await (await response!).text()).toBe('private profile');expect(w.caches.open).not.toHaveBeenCalled();});
 it('removes only obsolete app-owned caches',async()=>{const w=worker();let task:Promise<unknown>|undefined;w.handlers.activate({waitUntil:(p:Promise<unknown>)=>task=p});await task;expect(w.caches.delete.mock.calls).toEqual([['jobmatch-public-v0'],['jobmatch-public-v1']]);expect(w.self.clients.claim).toHaveBeenCalledOnce();});
 it('returns safe fallback after browser evicts offline assets',async()=>{const w=worker();w.fetch.mockRejectedValueOnce(new Error('offline'));w.cache.match.mockResolvedValueOnce(undefined);let response:Promise<Response>|undefined;w.handlers.fetch({request:{url:'https://app.test/',method:'GET',mode:'navigate'},respondWith:(p:Promise<Response>)=>response=p});expect((await response!).status).toBe(503);expect(await (await response!).text()).toContain('Нет подключения');});
});
