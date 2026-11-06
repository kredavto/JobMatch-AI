import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {createHmac} from 'node:crypto';
import type {Workspace} from '../lib/db';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),readWorkspace:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {POST} from '../app/api/ai-rewrite-reviews/route';
import {makeRewritePreview,prepareRewriteSource,type RewritePreview} from '../lib/ai-rewrite';
import {rewriteConfig} from '../lib/ai-rewrite-provider';
import {issueRewriteReceipt,verifyRewriteReceipt} from '../lib/ai-rewrite-signing';
import {prepareRewriteReview,confirmRewriteReview} from '../lib/ai-rewrite-review';
import {issueRewriteReviewReceipt,verifyRewriteReviewReceipt} from '../lib/ai-rewrite-review-signing';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const state={ownerId:owner,revision:7,original:'🧑‍💻 Synthetic\r\n  Built 5 SQL reports  \r\nNo Python\nUNSELECTED',vacancy:'Synthetic SQL role',facts:[{id:'sql',text:'Built 5 SQL reports',source:'synthetic',verified:true},{id:'negative',text:'No Python',source:'synthetic',verified:true}],versions:[],applications:[]} as unknown as Workspace;
const decisions=[{fact_id:'sql',reviewed:true,action:'accept-proposal'},{fact_id:'negative',reviewed:true,action:'keep-source'}];
let preview:RewritePreview,receipt:{payload:string;signature:string},fetchSpy:ReturnType<typeof vi.spyOn>;
const request=(body:unknown,origin='https://app.test',signal?:AbortSignal)=>new NextRequest('https://app.test/api/ai-rewrite-reviews',{method:'POST',headers:{origin},body:JSON.stringify(body),signal});
async function confirmation(input:unknown=decisions){const review=await prepareRewriteReview(preview,state.original,input);return{consent:true,reviewed:true,decisions:input,acknowledgedReviewSha256:review.reviewSha256,acknowledgedIssueIds:review.issues.map(i=>i.id)};}
async function body(){return{...await confirmation(),receipt,expectedOwnerId:owner,revision:7};}
beforeEach(async()=>{
 vi.resetAllMocks();db.identity.mockResolvedValue({id:owner});db.consumeQuota.mockResolvedValue(undefined);db.readWorkspace.mockImplementation(async()=>structuredClone(state));
 for(const [k,v] of Object.entries({NODE_ENV:'test',JOBMATCH_AI_REWRITE_REVIEW_ENABLED:'true',JOBMATCH_AI_REWRITE_ENABLED:'true',JOBMATCH_AI_ENABLED:'true',JOBMATCH_AI_SELF_HOSTED:'true',JOBMATCH_AI_ENDPOINT:'http://127.0.0.1:1/api/chat',JOBMATCH_AI_MODEL:'synthetic-unaccepted',JOBMATCH_AI_TOKEN:'public-fixture-only',JOBMATCH_LETTER_SIGNING_SECRET:'12'.repeat(32),JOBMATCH_OPS_TELEMETRY:'off'}))vi.stubEnv(k,v);
 const config=rewriteConfig(),source=await prepareRewriteSource(state,owner,['sql','negative']);
 preview=await makeRewritePreview(source,'en',config.model,{claims:[{fact_id:'sql',status:'proposed',text:'Created 6 SQL reports'},{fact_id:'negative',status:'refused',text:null}]},state.original,config.configurationId);
 receipt=await issueRewriteReceipt(owner,state,preview,config.signing);
 fetchSpy=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK_PERMITTED'));
});
afterEach(()=>{expect(fetchSpy).not.toHaveBeenCalled();vi.restoreAllMocks();vi.unstubAllEnvs();});
it('binds exact source/proposal/manual decisions, issues and Unicode layout without a truth claim',async()=>{
 const c=await confirmation(),review=await confirmRewriteReview(preview,state.original,c);
 expect(review.rows.map(r=>r.origin)).toEqual(['model-proposal','source']);expect(review.issues).toHaveLength(3);
 expect(review.text).toBe(state.original.replace('Built 5 SQL reports','Created 6 SQL reports'));
 expect(review.semanticAssessment).toBe('not-performed');expect(review.modelAcceptance).toBe('not-accepted');expect(review.reviewStatus).toBe('user-confirmed');
 const reversed=await prepareRewriteReview(preview,state.original,[...decisions].reverse());expect(reversed.reviewSha256).toBe(review.reviewSha256);
});
it('manual edits remain manual and require separate source/proposal findings',async()=>{
 const d=[{fact_id:'sql',reviewed:true,action:'edit',text:'Wrote 8 SQL reports'},{fact_id:'negative',reviewed:true,action:'edit',text:'Use Python'}];
 const review=await confirmRewriteReview(preview,state.original,await confirmation(d));
 expect(review.rows.every(r=>r.origin==='manual')).toBe(true);
 expect(review.rows[0].comparisons.map(c=>c.basis)).toEqual(['source','proposal']);
 expect(review.rows[1].comparisons.map(c=>c.basis)).toEqual(['source']);
 expect(new Set(review.issues.map(i=>i.id)).size).toBe(review.issues.length);
 expect(review.issues.some(i=>i.basis==='source'&&i.issue.kind==='negation-removed')).toBe(true);
 expect(review.issues.some(i=>i.basis==='proposal'&&i.issue.kind==='number-removed')).toBe(true);
});
it('keeping all source rejects model changes without requiring their risk acknowledgements',async()=>{
 const d=decisions.map(x=>({...x,action:'keep-source'})),review=await confirmRewriteReview(preview,state.original,await confirmation(d));
 expect(review.text).toBe(state.original);expect(review.issues).toEqual([]);
});
for(const mode of ['missing','duplicate','unknown','refused-accept','extra-text','not-reviewed','empty-edit','nul-edit','token-limit'] as const)it('refuses decision '+mode,async()=>{
 let d:unknown=structuredClone(decisions);
 switch(mode){case'missing':d=decisions.slice(1);break;case'duplicate':d=[decisions[0],decisions[0]];break;case'unknown':d=[{...decisions[0],fact_id:'foreign'},decisions[1]];break;case'refused-accept':d=[decisions[0],{...decisions[1],action:'accept-proposal'}];break;case'extra-text':d=[{...decisions[0],text:'override'},decisions[1]];break;case'not-reviewed':d=[{...decisions[0],reviewed:false},decisions[1]];break;case'empty-edit':case'nul-edit':case'token-limit':d=[{...decisions[0],action:'edit',text:mode==='empty-edit'?' ':mode==='nul-edit'?'bad\0':Array.from({length:65},(_,i)=>String(i)).join(' ')},decisions[1]];}
 await expect(prepareRewriteReview(preview,state.original,d)).rejects.toThrow();
});
for(const mode of ['missing','duplicate','foreign','hash','stale-text','consent','extra'] as const)it('refuses nonexact acknowledgement '+mode,async()=>{
 const c=await confirmation();let raw:unknown=c;
 switch(mode){case'missing':raw={...c,acknowledgedIssueIds:c.acknowledgedIssueIds.slice(1)};break;case'duplicate':raw={...c,acknowledgedIssueIds:[...c.acknowledgedIssueIds,c.acknowledgedIssueIds[0]]};break;case'foreign':raw={...c,acknowledgedIssueIds:[...c.acknowledgedIssueIds,'foreign']};break;case'hash':raw={...c,acknowledgedReviewSha256:'00'.repeat(32)};break;case'stale-text':raw={...c,decisions:[{...decisions[0],action:'edit',text:'Created 9 SQL reports'},decisions[1]]};break;case'consent':raw={...c,consent:false};break;case'extra':raw={...c,semanticVerified:true};}
 await expect(confirmRewriteReview(preview,state.original,raw)).rejects.toThrow();
});
it('MAC review domain is separate, source-bound and cannot refresh the original deadline',async()=>{
 const config=rewriteConfig(),old=JSON.parse(receipt.payload),now=Date.now();vi.spyOn(Date,'now').mockReturnValue(now+599000);
 const signed=await issueRewriteReviewReceipt(owner,state,receipt,await confirmation(),config),checked=await verifyRewriteReviewReceipt(owner,state,signed,config);
 expect(checked.payload.expiresAt).toBe(old.expiresAt);expect(checked.payload.review.reviewStatus).toBe('user-confirmed');
 await expect(verifyRewriteReceipt(signed,owner,config.signing)).rejects.toThrow();
 await expect(verifyRewriteReviewReceipt(owner,state,receipt,config)).rejects.toThrow();
 vi.spyOn(Date,'now').mockReturnValue(now+601000);await expect(verifyRewriteReviewReceipt(owner,state,signed,config)).rejects.toThrow();
});
for(const field of ['owner','revision','original','vacancy','facts','configuration','key'] as const)it('rejects review receipt after '+field+' changes',async()=>{
 const config=rewriteConfig(),signed=await issueRewriteReviewReceipt(owner,state,receipt,await confirmation(),config),next=structuredClone(state);let active=owner,cfg=config;
 switch(field){case'owner':active=other;next.ownerId=other;break;case'revision':next.revision++;break;case'original':next.original+='x';break;case'vacancy':next.vacancy+='x';break;case'facts':next.facts[0].verified=false;break;case'configuration':cfg={...config,configurationId:'00'.repeat(32)};break;case'key':vi.stubEnv('JOBMATCH_LETTER_SIGNING_SECRET','34'.repeat(32));cfg=rewriteConfig();}
 await expect(verifyRewriteReviewReceipt(active,next,signed,cfg)).rejects.toThrow();
});
for(const mode of ['signature','text','extra','extended-expiry','future'] as const)it('refuses receipt '+mode+' even if a fixture signs malformed content',async()=>{
 const config=rewriteConfig(),signed=await issueRewriteReviewReceipt(owner,state,receipt,await confirmation(),config),p=JSON.parse(signed.payload);
 switch(mode){case'text':p.review.text+='injected';break;case'extra':p.review.semanticVerified=true;break;case'extended-expiry':p.expiresAt++;break;case'future':p.issuedAt+=30;}
 const payload=JSON.stringify(p),signature=mode==='signature'?'00'.repeat(32):createHmac('sha256',config.signing.key).update('jobmatch-ai-rewrite-review-receipt-v1\n'+payload).digest('hex');
 await expect(verifyRewriteReviewReceipt(owner,state,{payload,signature},config)).rejects.toThrow();
});
it('refuses a review that exceeds the signed UTF8 byte budget',async()=>{
 const next={...state,original:'😀'.repeat(45000)+'\n'+state.original},config=rewriteConfig();
 const source=await prepareRewriteSource(next,owner,['sql','negative']),p=await makeRewritePreview(source,'en',config.model,{claims:preview.claims},next.original,config.configurationId),r=await issueRewriteReceipt(owner,next,p,config.signing),review=await prepareRewriteReview(p,next.original,decisions);
 await expect(issueRewriteReviewReceipt(owner,next,r,{consent:true,reviewed:true,decisions,acknowledgedReviewSha256:review.reviewSha256,acknowledgedIssueIds:review.issues.map(i=>i.id)},config)).rejects.toMatchObject({status:413});
});
it('refuses combined review overflow rather than silently dropping acknowledgements',async()=>{
 const text=Array.from({length:33},(_,i)=>String(i)).join(' '),edited=Array.from({length:33},(_,i)=>String(i+100)).join(' ');
 const next={...state,original:text,facts:[{id:'numbers',text,source:'synthetic',verified:true}]},config=rewriteConfig();
 const source=await prepareRewriteSource(next,owner,['numbers']),p=await makeRewritePreview(source,'en',config.model,{claims:[{fact_id:'numbers',status:'proposed',text}]},next.original,config.configurationId);
 await expect(prepareRewriteReview(p,next.original,[{fact_id:'numbers',reviewed:true,action:'edit',text:edited}])).rejects.toThrow();
});
it('supports valid control-character IDs without ambiguous acknowledgement IDs',async()=>{
 const unusual='\u0001'.repeat(100),next={...state,facts:[{...state.facts[0],id:unusual}]},config=rewriteConfig();
 const source=await prepareRewriteSource(next,owner,[unusual]),p=await makeRewritePreview(source,'en',config.model,{claims:[{fact_id:unusual,status:'proposed',text:'Created 6 SQL reports'}]},next.original,config.configurationId);
 const d=[{fact_id:unusual,reviewed:true,action:'accept-proposal'}],review=await prepareRewriteReview(p,next.original,d);
 expect(review.issues[0].id.length).toBeGreaterThan(500);
 await expect(confirmRewriteReview(p,next.original,{consent:true,reviewed:true,decisions:d,acknowledgedReviewSha256:review.reviewSha256,acknowledgedIssueIds:review.issues.map(i=>i.id)})).resolves.toHaveProperty('reviewStatus','user-confirmed');
});
for(const mode of ['json','utf8','oversize','owner-hint','pre-abort','late-expiry','late-key','late-foreign-storage'] as const)it('route envelope/lifetime guard '+mode,async()=>{
 const b=await body();let req=request(b),expected=400;
 switch(mode){
  case'json':req=new NextRequest('https://app.test/api/ai-rewrite-reviews',{method:'POST',headers:{origin:'https://app.test'},body:'{'});break;
  case'utf8':req=new NextRequest('https://app.test/api/ai-rewrite-reviews',{method:'POST',headers:{origin:'https://app.test'},body:new Uint8Array([255])});break;
  case'oversize':req=request({...b,padding:'x'.repeat(524288)});expected=413;break;
  case'owner-hint':req=request(b);req.headers.set('x-jobmatch-owner',other);expected=409;break;
  case'pre-abort':{const control=new AbortController();control.abort();req=request(b,undefined,control.signal);expected=408;break;}
  case'late-expiry':{const now=Date.now();db.readWorkspace.mockResolvedValueOnce(state).mockImplementation(async()=>{vi.spyOn(Date,'now').mockReturnValue(now+601000);return state;});break;}
  case'late-key':db.readWorkspace.mockResolvedValueOnce(state).mockImplementation(async()=>{vi.stubEnv('JOBMATCH_LETTER_SIGNING_SECRET','34'.repeat(32));return state;});expected=409;break;
  case'late-foreign-storage':db.readWorkspace.mockResolvedValueOnce(state).mockResolvedValue({...state,ownerId:other});expected=502;
 }
 const r=await POST(req);expect(r.status).toBe(expected);expect(await r.json()).not.toHaveProperty('receipt');
});
it('production route returns a verified human-review receipt without inference or workspace writes',async()=>{
 const r=await POST(request(await body()));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');
 const result=await r.json();expect(result).toMatchObject({ownerId:owner,revision:7});
 const checked=await verifyRewriteReviewReceipt(owner,state,result.receipt,rewriteConfig());expect(checked.payload.review.text).toContain('Created 6');
 expect(db.consumeQuota).toHaveBeenCalledExactlyOnceWith({id:owner},'analysis');expect(db.readWorkspace).toHaveBeenCalledTimes(2);
});
for(const mode of ['origin','unauth','owner','revision','disabled','preview-disabled','key','quota','signature','ack','extra','foreign-storage','session-change','state-change','configuration-change','late-disable','cancel'] as const)it('route guard '+mode+' returns no review receipt',async()=>{
 const b=await body(),control=new AbortController();let origin='https://app.test';let expected=400;
 switch(mode){case'origin':origin='https://other.test';expected=403;break;case'unauth':db.identity.mockRejectedValue(Error('AUTH'));expected=401;break;case'owner':b.expectedOwnerId=other;expected=409;break;case'revision':b.revision=6;expected=409;break;case'disabled':vi.stubEnv('JOBMATCH_AI_REWRITE_REVIEW_ENABLED','false');expected=503;break;case'preview-disabled':vi.stubEnv('JOBMATCH_AI_REWRITE_ENABLED','false');expected=503;break;case'key':vi.stubEnv('JOBMATCH_LETTER_SIGNING_SECRET','');expected=503;break;case'quota':db.consumeQuota.mockRejectedValue(Error('RATE'));expected=429;break;case'signature':b.receipt={...receipt,signature:'00'.repeat(32)};break;case'ack':b.acknowledgedIssueIds=[];break;case'extra':Object.assign(b,{text:'client supplied full replacement'});break;case'foreign-storage':db.readWorkspace.mockResolvedValue({...state,ownerId:other});expected=502;break;case'session-change':db.identity.mockResolvedValueOnce({id:owner}).mockResolvedValue({id:other});expected=409;break;case'state-change':db.readWorkspace.mockResolvedValueOnce(state).mockResolvedValue({...state,original:state.original+'x'});expected=409;break;case'configuration-change':db.readWorkspace.mockResolvedValueOnce(state).mockImplementation(async()=>{vi.stubEnv('JOBMATCH_AI_TOKEN','synthetic-token-rotation-long');return state;});expected=409;break;case'late-disable':db.readWorkspace.mockResolvedValueOnce(state).mockImplementation(async()=>{vi.stubEnv('JOBMATCH_AI_REWRITE_REVIEW_ENABLED','false');return state;});expected=503;break;case'cancel':db.readWorkspace.mockResolvedValueOnce(state).mockImplementation(async()=>{control.abort();return state;});expected=504;}
 const r=await POST(request(b,origin,control.signal));expect(r.status).toBe(expected);expect(await r.json()).not.toHaveProperty('receipt');
});
