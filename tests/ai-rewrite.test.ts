import {it,expect,vi,afterEach} from 'vitest';
import {createHash} from 'node:crypto';
import type {Workspace} from '../lib/db';
import {prepareRewriteSource,makeRewritePreview,validateRewritePreview,renderRewriteOriginal,decodeRewriteReceipt,rewriteResponseSchema} from '../lib/ai-rewrite';
import {issueRewriteReceipt,verifyRewriteReceipt} from '../lib/ai-rewrite-signing';
const owner='11111111-1111-4111-8111-111111111111';
const configurationId='c'.repeat(64);
const basis=():Workspace=>({ownerId:owner,revision:4,original:'🧑‍💻 Name\r\n  Built 5 SQL reports  \r\nНе использую Python\nUnselected source stays here\r\n',vacancy:'SQL reports',goal:'Analyst',facts:[{id:'f1',text:'Built 5 SQL reports',source:'Original source',verified:true},{id:'f2',text:'Не использую Python',source:'Original source',verified:true},{id:'f3',text:'Unselected source stays here',source:'Original source',verified:false}],versions:[],applications:[]});
async function preview(){const w=basis(),source=await prepareRewriteSource(w,owner,['f1','f2']);return{w,source,p:await makeRewritePreview(source,'en','synthetic-model',{claims:[{fact_id:'f2',status:'refused',text:null},{fact_id:'f1',status:'proposed',text:'Produced 5 SQL reports'}]},w.original,configurationId)};}
afterEach(()=>vi.restoreAllMocks());
it('rewrites only unique selected line ranges and preserves every other CRLF/Unicode/space byte',async()=>{
 const {w,source,p}=await preview();expect(p.text).toBe(w.original.replace('Built 5 SQL reports','Produced 5 SQL reports'));expect(p.claims.map(c=>c.fact_id)).toEqual(['f1','f2']);expect(p.reviewStatus).toBe('not-reviewed');expect(p.modelAcceptance).toBe('not-accepted');expect(p.modelIdentity).toBe('unverified');expect(p.semanticAssessment).toBe('not-performed');expect(p.requestedLanguage).toBe('en');expect(p.declaredModel).toBe('synthetic-model');
 expect(await validateRewritePreview(p,{source,language:'en',original:w.original})).toEqual(p);expect(p.review.claims[1]).toMatchObject({status:'refused',changed:false});
});
it('changed numbers and removed negation are findings, never semantic or automatic acceptance',async()=>{
 const w=basis(),source=await prepareRewriteSource(w,owner,['f1','f2']),p=await makeRewritePreview(source,'ru','synthetic-model',{claims:[{fact_id:'f1',status:'proposed',text:'Built 6 SQL reports'},{fact_id:'f2',status:'proposed',text:'Использую Python'}]},w.original,configurationId);
 expect(p.review.claims[0].lexical.issues.map(i=>i.kind)).toEqual(['manual-edit','number-removed','number-added']);expect(p.review.claims[1].lexical.issues.map(i=>i.kind)).toContain('negation-removed');expect(p.semanticAssessment).toBe('not-performed');expect(w.facts[2].verified).toBe(false);
});
it.each(['foreign','unverified','duplicate-id','duplicate-line','substring','missing','nul','empty'])('rejects ambiguous or unavailable source %s',async kind=>{
 const w=basis();let ids=['f1'],actor=owner;
 if(kind==='foreign')actor='22222222-2222-4222-8222-222222222222';if(kind==='unverified')w.facts[0].verified=false;if(kind==='duplicate-id')w.facts.push({...w.facts[0]});if(kind==='duplicate-line')w.original+='Built 5 SQL reports\n';if(kind==='substring')w.original=w.original.replace('  Built 5 SQL reports  ','not Built 5 SQL reports');if(kind==='missing')ids=['unknown'];if(kind==='nul')w.original+='\0';if(kind==='empty')ids=[];
 await expect(prepareRewriteSource(w,actor,ids)).rejects.toThrow();
});
it.each(['duplicate','unknown','missing','extra','false-refusal','partial','review-limit'])('refuses complete-envelope but invalid model rows %s',async kind=>{
 const w=basis(),source=await prepareRewriteSource(w,owner,['f1','f2']);const rows:unknown[]=[{fact_id:'f1',status:'proposed',text:'Produced 5 SQL reports'},{fact_id:'f2',status:'refused',text:null}];
 if(kind==='duplicate')rows[1]=rows[0];if(kind==='unknown')Object.assign(rows[0] as object,{fact_id:'unknown'});if(kind==='missing')rows.pop();if(kind==='extra')Object.assign(rows[0] as object,{verified:true});if(kind==='false-refusal')Object.assign(rows[1] as object,{text:'Invented claim'});if(kind==='partial')Object.assign(rows[0] as object,{text:''});if(kind==='review-limit')Object.assign(rows[0] as object,{text:Array.from({length:65},(_,i)=>i).join(' ')});
 await expect(makeRewritePreview(source,'ru','synthetic-model',{claims:rows},w.original,configurationId)).rejects.toThrow();
});
it.each(['text','review','source','language','acceptance','identity','prompt','configuration-shape'])('context-bound preview refuses tampered %s',async kind=>{
 const {w,source,p}=await preview(),bad=structuredClone(p);
 if(kind==='text')bad.text=bad.text.replace('Name','FAKE');if(kind==='review')Object.assign(bad,{review:{}});if(kind==='source')bad.source.originalSha256='0'.repeat(64);if(kind==='language')bad.requestedLanguage='ru';if(kind==='acceptance')Object.assign(bad,{modelAcceptance:'accepted'});if(kind==='identity')Object.assign(bad,{modelIdentity:'verified'});if(kind==='prompt')bad.promptSha256='0'.repeat(64);if(kind==='configuration-shape')bad.configurationId='opaque-private-key';
 await expect(validateRewritePreview(bad,{source,language:'en',original:w.original})).rejects.toThrow();
});
it('same-length edits outside selected spans cannot pass a current-source comparison',async()=>{const{w,source,p}=await preview();const bad={...p,text:p.text.replace('Name','Lies')};await expect(validateRewritePreview(bad,{source,language:'en',original:w.original})).rejects.toThrow();await expect(renderRewriteOriginal(w.original+'x',source,p.claims)).rejects.toThrow();});
it('issuer refuses to sign a same-length alteration outside selected source ranges',async()=>{const{w,p}=await preview(),key=Buffer.alloc(32,42),config={key,keyId:createHash('sha256').update(key).digest('hex')};await expect(issueRewriteReceipt(owner,w,{...p,text:p.text.replace('Name','Lies')},config)).rejects.toThrow();});
it('request schema contains only the selected fact IDs and exact row count',async()=>{const{source}=await preview(),schema=rewriteResponseSchema(source);expect(schema.safeParse({claims:[{fact_id:'f1',status:'proposed',text:'5 SQL reports'},{fact_id:'f2',status:'refused',text:null}]}).success).toBe(true);expect(schema.safeParse({claims:[{fact_id:'other',status:'refused',text:null}]}).success).toBe(false);});
it('a signed proposal is owner/time/key bound and structural decoding is not signature verification',async()=>{
 vi.spyOn(Date,'now').mockReturnValue(1800000000000);const{p,w}=await preview(),key=Buffer.alloc(32,42),config={key,keyId:createHash('sha256').update(key).digest('hex')},receipt=await issueRewriteReceipt(owner,w,p,config),decoded=await decodeRewriteReceipt(receipt);
 expect(decoded.preview.reviewStatus).toBe('not-reviewed');expect((await verifyRewriteReceipt(receipt,owner,config)).receipt).toEqual(receipt);
 await expect(verifyRewriteReceipt({...receipt,signature:'0'.repeat(64)},owner,config)).rejects.toMatchObject({status:400,code:'AI_REWRITE_PREVIEW_INVALID'});
 await expect(verifyRewriteReceipt(receipt,'22222222-2222-4222-8222-222222222222',config)).rejects.toMatchObject({status:400});
 await expect(verifyRewriteReceipt(receipt,owner,{key:Buffer.alloc(32,43),keyId:config.keyId})).rejects.toMatchObject({status:400});
 vi.mocked(Date.now).mockReturnValue(1800000600000);await expect(verifyRewriteReceipt(receipt,owner,config)).rejects.toMatchObject({status:400});
});
