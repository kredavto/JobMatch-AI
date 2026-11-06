import {it,expect} from 'vitest';
import {eligibleRewriteFacts,validateRewriteUiPreview,validateRewriteUiConfirmation} from '../lib/ai-rewrite-review-ui';
import {prepareRewriteReview} from '../lib/ai-rewrite-review';
import {issueRewriteReviewReceipt,verifyRewriteReviewReceipt} from '../lib/ai-rewrite-review-signing';
import {verifyRewriteReceipt} from '../lib/ai-rewrite-signing';
import {rewriteState,rewriteFixture} from './fixtures/rewrite-review';
it('eligible picker requires unique exact whole source lines and verified distinct IDs',()=>{
 const state=rewriteState();expect(eligibleRewriteFacts(state).map(f=>f.id)).toEqual(['sql','negative']);
 expect(eligibleRewriteFacts({...state,original:state.original+'\nNo Python'}).map(f=>f.id)).toEqual(['sql']);
 expect(eligibleRewriteFacts({...state,facts:[...state.facts,state.facts[0]]})).toEqual([]);
 expect(eligibleRewriteFacts({...state,facts:state.facts.map(f=>({...f,verified:false}))})).toEqual([]);
 expect(eligibleRewriteFacts({...state,facts:[{...state.facts[0],text:'SQL'}]})).toEqual([]);
});
it('preview consistency binds exact owner/revision/selection/language/current original and retains unselected bytes',async()=>{
 const f=await rewriteFixture(),result=await validateRewriteUiPreview(f.response,f.state,['negative','sql'],'ru');
 expect(result.payload.preview.source.facts.map(f=>f.id)).toEqual(['sql','negative']);
 expect(result.payload.preview.text).toBe(f.state.original.replace('Built 5','Created 6'));
 expect(result.payload.preview.modelAcceptance).toBe('not-accepted');
});
for(const field of ['owner','revision','original','vacancy','facts','selection','language','extra','unknown-owner'] as const)it('preview rejects mismatched '+field,async()=>{
 const f=await rewriteFixture(),next=structuredClone(f.state);let raw:unknown=f.response,ids=['sql','negative'],language:'ru'|'en'='ru';
 switch(field){case'owner':raw={...f.response,ownerId:'22222222-2222-4222-8222-222222222222'};break;case'revision':raw={...f.response,revision:8};break;case'original':next.original+='x';break;case'vacancy':next.vacancy+='x';break;case'facts':next.facts[0].verified=false;break;case'selection':ids=['sql'];break;case'language':language='en';break;case'extra':raw={...f.response,verified:true};break;case'unknown-owner':next.ownerId=undefined;}
 await expect(validateRewriteUiPreview(raw,next,ids,language)).rejects.toThrow();
});
async function reviewed(){const f=await rewriteFixture(),decisions=[{fact_id:'sql',reviewed:true,action:'edit',text:'Wrote 8 SQL reports'},{fact_id:'negative',reviewed:true,action:'keep-source'}];const prepared=await prepareRewriteReview(f.preview,f.state.original,decisions),confirmation={consent:true,reviewed:true,decisions,acknowledgedReviewSha256:prepared.reviewSha256,acknowledgedIssueIds:prepared.issues.map(i=>i.id)};const receipt=await issueRewriteReviewReceipt(f.state.ownerId!,f.state,f.receipt,confirmation,f.config);return{f,confirmation,receipt,response:{ownerId:f.state.ownerId!,revision:f.state.revision,receipt}};}
it('confirmation response consistency reproduces exact decisions, render and acknowledgements without promoting semantic status',async()=>{
 const {f,confirmation,response}=await reviewed();const result=await validateRewriteUiConfirmation(response,f.state,f.receipt,confirmation);
 expect(result.payload.review.rows.map(r=>r.origin)).toEqual(['manual','source']);expect(result.payload.review.text).toBe(f.state.original.replace('Built 5 SQL reports','Wrote 8 SQL reports'));expect(result.payload.review.semanticAssessment).toBe('not-performed');
});
for(const field of ['owner','revision','text','decision','ack','expiry','key','preview','extra','stale'] as const)it('confirmation refuses changed '+field,async()=>{
 const {f,confirmation,response,receipt}=await reviewed();const p=JSON.parse(receipt.payload);let raw:unknown=response,expected:unknown=confirmation;const next=structuredClone(f.state);
 switch(field){case'owner':raw={...response,ownerId:'22222222-2222-4222-8222-222222222222'};break;case'revision':raw={...response,revision:8};break;case'text':p.review.text+='x';break;case'decision':expected={...confirmation,decisions:confirmation.decisions.map(d=>({...d,action:'keep-source'}))};break;case'ack':expected={...confirmation,acknowledgedIssueIds:[]};break;case'expiry':p.expiresAt++;break;case'key':p.issuerKeyId='00'.repeat(32);break;case'preview':p.previewReceipt.payload+=' ';break;case'extra':p.review.semanticVerified=true;break;case'stale':next.original+='x';}
 if(['text','expiry','key','preview','extra'].includes(field))raw={...response,receipt:{...receipt,payload:JSON.stringify(p)}};
 await expect(validateRewriteUiConfirmation(raw,next,f.receipt,expected)).rejects.toThrow();
});
it('browser decoding checks consistency, never MAC authenticity; server rejects corrupted signatures',async()=>{
 const {f,confirmation,response,receipt}=await reviewed(),badPreview={...f.receipt,signature:'00'.repeat(32)},badReview={...receipt,signature:'00'.repeat(32)};
 await expect(validateRewriteUiPreview({...f.response,receipt:badPreview},f.state,['sql','negative'],'ru')).resolves.toHaveProperty('payload');
 await expect(verifyRewriteReceipt(badPreview,f.state.ownerId!,f.config.signing)).rejects.toThrow();
 await expect(validateRewriteUiConfirmation({...response,receipt:badReview},f.state,f.receipt,confirmation)).resolves.toHaveProperty('payload');
 await expect(verifyRewriteReviewReceipt(f.state.ownerId!,f.state,badReview,f.config)).rejects.toThrow();
});
