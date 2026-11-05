import {createServer,type Server,type IncomingMessage,type ServerResponse} from 'node:http';
import {once} from 'node:events';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
import type {Workspace} from '../lib/db';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),readWorkspace:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {POST} from '../app/api/ai-rewrites/route';
import {prepareRewriteSource,decodeRewriteReceipt} from '../lib/ai-rewrite';
import {proposeRewrite,rewriteConfig} from '../lib/ai-rewrite-provider';
import {verifyRewriteReceipt,rewriteSigningConfig} from '../lib/ai-rewrite-signing';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const state={ownerId:owner,revision:7,original:'🧑‍💻 Synthetic name\r\n  Built 5 SQL reports  \r\nНе использую Python\nUNSELECTED PRIVATE FIXTURE',vacancy:'Synthetic SQL role',facts:[{id:'sql',text:'Built 5 SQL reports',source:'private-source-fixture',verified:true},{id:'no-python',text:'Не использую Python',source:'private-source-fixture',verified:true},{id:'private',text:'UNSELECTED PRIVATE FIXTURE',source:'private',verified:false}],versions:[],applications:[]} as unknown as Workspace;
const claims={claims:[{fact_id:'sql',status:'proposed',text:'Created 6 SQL reports'},{fact_id:'no-python',status:'refused',text:null}]};
const envelope=(content:unknown=claims)=>({done:true,done_reason:'stop',message:{role:'assistant',content:JSON.stringify(content)}});
const body={consent:true,expectedOwnerId:owner,revision:7,factIds:['sql','no-python'],requestedLanguage:'en'};
let server:Server,seen:{url:string|undefined;headers:IncomingMessage['headers'];body:Record<string,unknown>}[],respond:(req:IncomingMessage,res:ServerResponse)=>void;
const request=(value:unknown=body,origin='https://app.test',signal?:AbortSignal)=>new NextRequest('https://app.test/api/ai-rewrites',{method:'POST',headers:{origin},body:JSON.stringify(value),signal});
beforeEach(async()=>{
 vi.resetAllMocks();seen=[];db.identity.mockResolvedValue({id:owner});db.readWorkspace.mockImplementation(async()=>structuredClone(state));db.consumeQuota.mockResolvedValue(undefined);
 respond=(_req,res)=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(envelope()));};
 server=createServer(async(req,res)=>{const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));seen.push({url:req.url,headers:req.headers,body:JSON.parse(Buffer.concat(chunks).toString())});respond(req,res);});
 server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error();
 for(const [key,value] of Object.entries({NODE_ENV:'test',JOBMATCH_AI_REWRITE_ENABLED:'true',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_ENDPOINT:`http://127.0.0.1:${address.port}/api/chat`,JOBMATCH_AI_MODEL:'synthetic-unqualified-model',JOBMATCH_AI_TOKEN:'synthetic-owned-http-test-token',JOBMATCH_LETTER_SIGNING_SECRET:'12'.repeat(32),JOBMATCH_OPS_TELEMETRY:'off'}))vi.stubEnv(key,value);
});
afterEach(async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));vi.unstubAllEnvs();});
it('actual HTTP route signs per-fact proposals, retains every unselected byte and exposes lexical risk without claiming truth',async()=>{
 const response=await POST(request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');const result=await response.json();
 expect(result.ownerId).toBe(owner);expect(result.revision).toBe(7);const {payload}=await verifyRewriteReceipt(result.receipt,owner,rewriteSigningConfig());
 expect(payload.preview.text).toBe(state.original.replace('Built 5 SQL reports','Created 6 SQL reports'));expect(payload.preview.review.claims[0].lexical.issues.map(x=>x.kind)).toContain('number-added');
 expect(payload.preview).toMatchObject({modelAcceptance:'not-accepted',modelIdentity:'unverified',semanticAssessment:'not-performed',reviewStatus:'not-reviewed',requestedLanguage:'en'});
 expect(db.readWorkspace).toHaveBeenCalledTimes(2);expect(db.identity).toHaveBeenCalledTimes(2);expect(db.consumeQuota).toHaveBeenCalledExactlyOnceWith({id:owner},'analysis');expect(seen).toHaveLength(1);
 const call=seen[0],input=JSON.parse((call.body.messages as {content:string}[])[1].content);expect(call.url).toBe('/api/chat');expect(call.headers.authorization).toBe('Bearer synthetic-owned-http-test-token');
 expect(input).toEqual({language:'en',vacancy:state.vacancy,facts:state.facts.slice(0,2).map(f=>({fact_id:f.id,text:f.text}))});
 expect(JSON.stringify(call.body)).not.toContain('UNSELECTED PRIVATE FIXTURE');expect(JSON.stringify(call.body)).not.toContain(owner);expect(JSON.stringify(call.body)).not.toContain('private-source-fixture');
 expect(call.body).toMatchObject({stream:false,options:{temperature:0,num_predict:4096}});expect(call.body.format).toHaveProperty('type','object');
 expect(Object.keys(db).sort()).toEqual(['consumeQuota','identity','readWorkspace']);
});
it.each(['JOBMATCH_AI_REWRITE_ENABLED','JOBMATCH_AI_ENABLED','JOBMATCH_AI_SELF_HOSTED'])('closed operator gate %s prevents source/quota/network access',async key=>{vi.stubEnv(key,'false');expect((await POST(request())).status).toBe(503);expect(db.readWorkspace).not.toHaveBeenCalled();expect(db.consumeQuota).not.toHaveBeenCalled();expect(seen).toHaveLength(0);});
it('requires signing configuration before source or network access',async()=>{vi.stubEnv('JOBMATCH_LETTER_SIGNING_SECRET','');expect((await POST(request())).status).toBe(503);expect(db.readWorkspace).not.toHaveBeenCalled();expect(seen).toHaveLength(0);});
it('rejects cross origin before auth',async()=>{expect((await POST(request(body,'https://evil.test'))).status).toBe(403);expect(db.identity).not.toHaveBeenCalled();expect(seen).toHaveLength(0);});
it.each([{consent:false},{expectedOwnerId:other},{original:'client supplied'},{factIds:['private']},{factIds:['sql','sql']},{revision:8},{requestedLanguage:'fr'}])('rejects invalid, stale or unverified selection %j before quota/inference',async change=>{const r=await POST(request({...body,...change}));expect(r.status).toBe(change.expectedOwnerId||change.revision?409:400);expect(db.consumeQuota).not.toHaveBeenCalled();expect(seen).toHaveLength(0);});
it('fails closed on invalid UTF8 and oversized request',async()=>{for(const bytes of [new Uint8Array([255]),new TextEncoder().encode(' '.repeat(4097))]){const req=new NextRequest('https://app.test/api/ai-rewrites',{method:'POST',headers:{origin:'https://app.test'},body:bytes});expect((await POST(req)).status).toBe(bytes.length===1?400:413);}expect(seen).toHaveLength(0);});
it.each([{revision:8},{original:state.original+'x'},{vacancy:'changed'},{facts:state.facts.map(f=>({...f,verified:false}))}])('discards actual provider reply after changed workspace %j',async change=>{db.readWorkspace.mockResolvedValueOnce(structuredClone(state)).mockResolvedValueOnce({...state,...change});const r=await POST(request());expect(r.status).toBe(409);expect(await r.json()).not.toHaveProperty('receipt');expect(seen).toHaveLength(1);});
it.each(['revoked','owner','config','disabled'] as const)('discards completed inference on late %s',async kind=>{
 respond=(_req,res)=>{if(kind==='revoked')db.identity.mockRejectedValueOnce(new Error('AUTH'));if(kind==='owner')db.identity.mockResolvedValueOnce({id:other});if(kind==='config')vi.stubEnv('JOBMATCH_AI_TOKEN','rotated-synthetic-token');if(kind==='disabled')vi.stubEnv('JOBMATCH_AI_REWRITE_ENABLED','false');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(envelope()));};
 const r=await POST(request());expect(r.status).toBe(kind==='revoked'?401:kind==='disabled'?503:409);expect(await r.json()).not.toHaveProperty('receipt');expect(seen).toHaveLength(1);
});
it('quota refusal never sends source to provider',async()=>{db.consumeQuota.mockRejectedValueOnce(new Error('RATE'));expect((await POST(request())).status).toBe(429);expect(seen).toHaveLength(0);});
it.each(['before','after'])('refuses a storage reply identifying a different owner %s inference',async when=>{if(when==='before')db.readWorkspace.mockResolvedValueOnce({...state,ownerId:other});else db.readWorkspace.mockResolvedValueOnce(state).mockResolvedValueOnce({...state,ownerId:other});const r=await POST(request());expect(r.status).toBe(502);expect(await r.json()).not.toHaveProperty('receipt');expect(seen).toHaveLength(when==='before'?0:1);});
it('foreign owner header is rejected before reading source or calling inference',async()=>{const req=request();req.headers.set('x-jobmatch-owner',other);expect((await POST(req)).status).toBe(409);expect(db.readWorkspace).not.toHaveBeenCalled();expect(seen).toHaveLength(0);});
it.each(['redirect','status','mime','utf8','large','unfinished','length','unknown','duplicate','extra'] as const)('real HTTP %s fails closed with one request and no provider diagnostics',async mode=>{
 respond=(_req,res)=>{res.setHeader('Content-Type','application/json');switch(mode){case'redirect':res.writeHead(302,{Location:'/forbidden'});res.end();break;case'status':res.statusCode=500;res.end('synthetic-provider-private');break;case'mime':res.setHeader('Content-Type','text/plain');res.end(JSON.stringify(envelope()));break;case'utf8':res.end(Buffer.from([255]));break;case'large':res.end(' '.repeat(128001));break;case'unfinished':res.end(JSON.stringify({...envelope(),done:false}));break;case'length':res.end(JSON.stringify({...envelope(),done_reason:'length'}));break;case'unknown':res.end(JSON.stringify(envelope({claims:[{fact_id:'invented',status:'refused',text:null}]})));break;case'duplicate':res.end(JSON.stringify(envelope({claims:[claims.claims[0],claims.claims[0]]})));break;case'extra':res.end(JSON.stringify(envelope({...claims,truth:true})));}}
 const r=await POST(request());expect(r.status).toBe(502);const result=await r.json();expect(result.code).toBe('AI_REWRITE_RESPONSE_INVALID');expect(JSON.stringify(result)).not.toContain('synthetic-provider-private');expect(result).not.toHaveProperty('receipt');expect(seen).toHaveLength(1);
});
it('aborted real HTTP inference returns no signed result or retry',async()=>{const controller=new AbortController();respond=()=>controller.abort();const r=await POST(request(body,undefined,controller.signal));expect(r.status).toBe(504);expect(await r.json()).not.toHaveProperty('receipt');expect(seen).toHaveLength(1);});
it('provider rejects stale original locally before making a request',async()=>{const source=await prepareRewriteSource(state,owner,body.factIds);await expect(proposeRewrite(source,state.original+'x','ru',new AbortController().signal)).rejects.toMatchObject({code:'AI_REWRITE_SOURCE_INVALID'});expect(seen).toHaveLength(0);});
it('opaque configuration changes with endpoint, token, model and signing key without exposing them',()=>{const base=rewriteConfig().configurationId;for(const key of ['JOBMATCH_AI_TOKEN','JOBMATCH_AI_MODEL','JOBMATCH_LETTER_SIGNING_SECRET']){const original=process.env[key]!;vi.stubEnv(key,key.endsWith('SECRET')?'34'.repeat(32):'synthetic-rotation');expect(rewriteConfig().configurationId).not.toBe(base);vi.stubEnv(key,original);}expect(base).toMatch(/^[a-f0-9]{64}$/);});
it('structural browser decoding is not signature verification',async()=>{const r=await POST(request()),result=await r.json();const altered={...result.receipt,signature:'00'.repeat(32)};await expect(decodeRewriteReceipt(altered)).resolves.toHaveProperty('preview');await expect(verifyRewriteReceipt(altered,owner,rewriteSigningConfig())).rejects.toMatchObject({code:'AI_REWRITE_PREVIEW_INVALID'});});
