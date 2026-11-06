import {afterAll,afterEach,beforeAll,expect,it,vi} from 'vitest';
import http from 'node:http';
import type {AddressInfo} from 'node:net';
import {supabase} from '../lib/db';
import {acceptSavedLetter} from '../lib/saved-letter-db';
import {savedFixture,owner} from './saved-letter-fixture';

// Real owned loopback HTTP. Public authored responses and counters only:
// no Supabase/Auth/model service, database commit or provider restore is simulated as evidence.
const realFetch=globalThis.fetch,requests:{path:string;authorization?:string;keys:string[]}[]=[];
let base='',mode='valid',fixtureAcceptedCommands=0,redirectArrivals=0,closedStreams=0;
const server=http.createServer(async(req,res)=>{
 const path=req.url!;let raw='';for await(const part of req)raw+=part;
 requests.push({path,authorization:req.headers.authorization,keys:raw?Object.keys(JSON.parse(raw)).sort():[]});
 if(path==='/redirect-target'){redirectArrivals++;res.writeHead(200,{'content-type':'application/json'});res.end('true');return;}
 const scenario=path.endsWith('/accept_saved_letter')?mode:path.split('/').at(-1)!;
 if(path.endsWith('/accept_saved_letter'))fixtureAcceptedCommands++;
 if(scenario==='redirect'){res.writeHead(307,{location:base+'/redirect-target'});res.end();return;}
 if(scenario==='wrong-mime'){res.writeHead(200,{'content-type':'text/html'});res.end('true');return;}
 if(scenario==='201'){res.writeHead(201,{'content-type':'application/json'});res.end('true');return;}
 if(scenario==='invalid-utf8'){res.writeHead(200,{'content-type':'application/json'});res.end(Buffer.from([0x22,0xff,0x22]));return;}
 if(scenario==='invalid-utf8-error'){res.writeHead(400,{'content-type':'application/json'});res.end(Buffer.concat([Buffer.from('{"message":"CONFLICT","details":"'),Buffer.from([0xff]),Buffer.from('"}')]));return;}
 if(scenario==='bad-json'){res.writeHead(200,{'content-type':'application/json'});res.end('PUBLIC PRIVATE FIXTURE');return;}
 if(scenario==='lost'){res.writeHead(200,{'content-type':'application/json'});res.write('{"value":');res.flushHeaders();setImmediate(()=>res.destroy());return;}
 if(scenario==='oversized-error'){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({message:'CONFLICT',details:'x'.repeat(65536)}));return;}
 if(scenario==='oversized-success'){res.writeHead(200,{'content-type':'application/json'});res.write('"');const chunk=Buffer.alloc(1024*1024,0x20);for(let i=0;i<16;i++)res.write(chunk);res.end('"');return;}
 if(scenario==='declared-size'){res.writeHead(200,{'content-type':'application/json','content-length':String(16*1024*1024+1)});res.end('true');return;}
 if(scenario==='conflict'){res.writeHead(400,{'content-type':'application/json'});res.end('{"message":"CONFLICT","details":"PUBLIC PRIVATE FIXTURE"}');return;}
 if(scenario==='sql-auth'){res.writeHead(400,{'content-type':'application/json'});res.end('{"message":"AUTH","details":"PUBLIC PRIVATE FIXTURE"}');return;}
 if(['status','401','403','429'].includes(scenario)){res.writeHead(scenario==='status'?503:Number(scenario),{'content-type':'text/html'});res.write('PUBLIC PRIVATE FIXTURE');res.once('close',()=>{closedStreams++;});return;}
 if(scenario==='slow'){
  // Headers consume part of the same15s budget; then body never completes.
  const headerTimer=setTimeout(()=>{res.writeHead(200,{'content-type':'application/json'});res.write('{"value":');res.flushHeaders();},300);
  const bodyTimer=setInterval(()=>{if(res.headersSent)res.write(' ');},250);
  res.once('close',()=>{clearTimeout(headerTimer);clearInterval(bodyTimer);});return;
 }
 res.writeHead(200,{'content-type':'application/json'});
 if(scenario==='unicode'){
  const value=Buffer.from(JSON.stringify({value:'🧑‍💻\r\nНе SQL é'}));const at=value.indexOf(Buffer.from('🧑'))+1;
  res.write(value.subarray(0,at));setImmediate(()=>res.end(value.subarray(at)));return;
 }
 res.end(JSON.stringify({value:true}));
});
beforeAll(async()=>{await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+(server.address() as AddressInfo).port;});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
afterAll(async()=>{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});
function setup(){vi.stubGlobal('fetch',realFetch);vi.stubEnv('SUPABASE_URL',base);vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','public-fixture');}
function call(name:string){setup();return supabase('/rest/v1/rpc/'+name,'POST',{publicFixture:true},'public-session');}
it('uses the actual native fetch wire once and decodes multibyte UTF8 split across chunks exactly',async()=>{
 const before=requests.length;expect(await call('unicode')).toEqual({value:'🧑‍💻\r\nНе SQL é'});expect(requests.slice(before)).toEqual([{path:'/rest/v1/rpc/unicode',authorization:'Bearer public-session',keys:['publicFixture']}]);
});
it('refuses an actual307 without forwarding token/body to its redirect target',async()=>{
 const before=requests.length,redirects=redirectArrivals;await expect(call('redirect')).rejects.toMatchObject({status:503,code:'UPSTREAM_UNAVAILABLE'});expect(requests.length-before).toBe(1);expect(redirectArrivals).toBe(redirects);
});
it.each(['wrong-mime','201','invalid-utf8','invalid-utf8-error','bad-json','oversized-error','oversized-success','declared-size'])('rejects real HTTP %s framing privately with no replay',async name=>{
 const before=requests.length;await expect(call(name)).rejects.toMatchObject({status:502,code:'UPSTREAM_INVALID_RESPONSE',message:expect.not.stringContaining('PRIVATE')});expect(requests.length-before).toBe(1);
});
it('preserves a bounded native conflict without exposing details or retrying',async()=>{
 const before=requests.length;await expect(call('conflict')).rejects.toThrow('CONFLICT');expect(requests.length-before).toBe(1);
});
it('discards a503 body without waiting for its unfinished stream',async()=>{
 const before=requests.length,start=Date.now(),closed=closedStreams;await expect(call('status')).rejects.toMatchObject({status:503,code:'UPSTREAM_UNAVAILABLE',message:expect.not.stringContaining('PRIVATE')});expect(Date.now()-start).toBeLessThan(5000);expect(requests.length-before).toBe(1);await vi.waitFor(()=>expect(closedStreams).toBe(closed+1));
});
it.each([['401','AUTH'],['403','AUTH'],['429','RATE'],['sql-auth','AUTH']])('real HTTP %s preserves the auth/quota boundary with one request',async(status,code)=>{
 const before=requests.length;await expect(call(status)).rejects.toThrow(code);expect(requests.length-before).toBe(1);
});
it('bounds headers and endless body by the same actual wall-time deadline',async()=>{
 const before=requests.length,start=Date.now();await expect(call('slow')).rejects.toMatchObject({status:503,code:'UPSTREAM_TIMEOUT'});expect(Date.now()-start).toBeLessThan(22000);expect(requests.length-before).toBe(1);
},25000);
it.each(['201','invalid-utf8','bad-json','lost','status','redirect','oversized-error'])('a %s reply after the fixture accepted a write stays unknown and never repeats it',async fault=>{
 setup();mode=fault;const before=requests.length,accepted=fixtureAcceptedCommands,{receipt}=await savedFixture();
 await expect(acceptSavedLetter({id:owner,token:'public-session'},3,0,receipt)).rejects.toMatchObject({status:502,code:'LETTER_SAVE_UNKNOWN'});
 expect(fixtureAcceptedCommands-accepted).toBe(1);expect(requests.slice(before)).toEqual([{path:'/rest/v1/rpc/accept_saved_letter',authorization:'Bearer public-session',keys:['p_accept','p_letter_revision','p_payload','p_signature','p_workspace_revision']}]);
});
