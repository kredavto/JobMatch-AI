import {afterEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {rewriteFixture,rewriteState} from './fixtures/rewrite-review';
import {prepareRewriteReview} from '../lib/ai-rewrite-review';
import {issueRewriteReviewReceipt,verifyRewriteReviewReceipt} from '../lib/ai-rewrite-review-signing';
import {decodeRewriteReviewReceipt} from '../lib/ai-rewrite-review-receipt';
import {REWRITE_ARCHIVE_FORMAT,REWRITE_ARCHIVE_BYTES,REWRITE_ARCHIVE_V1_PROMPT_SHA256,rewriteArchiveReceiptSha256,validateRewriteArchive} from '../lib/ai-rewrite-archive';
import {REWRITE_SYSTEM_PROMPT} from '../lib/ai-rewrite-prompt';
import type {RewriteReceipt} from '../lib/ai-rewrite';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();vi.useRealTimers();});
/** Authored archive assertion only; signing is real, storage acceptance is not.
 * No native writer/table/legacy metadata trust path is enabled by this fixture.
 */
async function fixture(action:'keep-source'|'accept-proposal'|'edit'='accept-proposal',refused=false,state=rewriteState()){
 const f=await rewriteFixture(state,state.facts.map(f=>f.id),'en',refused);
 const decisions=f.preview.source.facts.map((f,i)=>({fact_id:f.id,reviewed:true,action:i===0?action:'keep-source',...(i===0&&action==='edit'?{text:'Manually built 7 SQL reports'}:{})}));
 const review=await prepareRewriteReview(f.preview,state.original,decisions),confirmation={consent:true,reviewed:true,decisions,acknowledgedReviewSha256:review.reviewSha256,acknowledgedIssueIds:review.issues.map(i=>i.id)};
 const receipt=await issueRewriteReviewReceipt(state.ownerId!,state,f.receipt,confirmation,f.config),payload=JSON.parse(receipt.payload);
 await verifyRewriteReviewReceipt(state.ownerId!,state,receipt,f.config);
 const archive={format:REWRITE_ARCHIVE_FORMAT,ownerId:state.ownerId!,acceptedAt:new Date(payload.issuedAt*1000+125).toISOString(),sourceOriginal:state.original,receipt,receiptSha256:await rewriteArchiveReceiptSha256(receipt),sourceVerification:'current-at-storage-acceptance',receiptSignature:'verified-at-storage-acceptance',storageConsent:'STORE_REVIEWED_AI_REWRITE',contentReview:'user-declared-only',semanticAssessment:'not-performed',modelAcceptance:'not-accepted'};
 return{...f,review,confirmation,receipt,payload,archive};
}
async function altered(f:Awaited<ReturnType<typeof fixture>>,change:(p:Record<string,unknown>)=>void){
 const payload=JSON.parse(f.receipt.payload);change(payload);const receipt={...f.receipt,payload:JSON.stringify(payload)};
 return{...f.archive,receipt,receiptSha256:await rewriteArchiveReceiptSha256(receipt)};
}
it('freezes the actual v1 system-prompt STRING hash, distinct from its source-file hash',()=>{
 expect(createHash('sha256').update(REWRITE_SYSTEM_PROMPT).digest('hex')).toBe(REWRITE_ARCHIVE_V1_PROMPT_SHA256);
 expect(REWRITE_ARCHIVE_V1_PROMPT_SHA256).not.toBe('ff51cfd359eb90970f3ef0f4f713395230a8f047d4844f8183ef84592ab786e2');
});
it.each(['keep-source','accept-proposal','edit'] as const)('reconstructs exact source/chosen text and origin for %s without modifying the archive',async action=>{
 const f=await fixture(action),before=structuredClone(f.archive),result=await validateRewriteArchive(f.archive,f.state.ownerId!);
 expect(result.archive).toEqual(before);expect(f.archive).toEqual(before);expect(result.payload.review.text).toBe(action==='keep-source'?f.state.original:f.state.original.replace('Built 5 SQL reports',action==='edit'?'Manually built 7 SQL reports':'Created 6 SQL reports'));
 expect(result.payload.review.rows[0].origin).toBe(action==='keep-source'?'source':action==='edit'?'manual':'model-proposal');expect(result.previewPayload.preview.claims[0].text).toBe('Created 6 SQL reports');
 expect(result.payload.review.semanticAssessment).toBe('not-performed');expect(result.payload.review.modelAcceptance).toBe('not-accepted');expect(result.payload.review.text).toContain('\r\n');expect(result.payload.review.text).toContain('UNSELECTED PRIVATE FIXTURE');
});
it('retains model refusal separately from a manual rendering instruction',async()=>{
 const f=await fixture('edit',true),r=await validateRewriteArchive(f.archive,f.state.ownerId!);
 expect(r.previewPayload.preview.claims.every(c=>c.status==='refused'&&c.text===null)).toBe(true);expect(r.payload.review.claims[0].status).toBe('proposed');expect(r.payload.review.rows[0].origin).toBe('manual');expect(r.payload.review.rows[0].comparisons.map(c=>c.basis)).toEqual(['source']);
});
it('reads after expiry, key/config rotation and feature disable without network, environment configuration or Date.now',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-06T11:00:00.000Z'));const f=await fixture();
 vi.setSystemTime(new Date('2036-11-06T11:00:00.000Z'));await expect(verifyRewriteReviewReceipt(f.state.ownerId!,f.state,f.receipt,f.config)).rejects.toMatchObject({code:'AI_REWRITE_REVIEW_INVALID'});
 vi.stubEnv('JOBMATCH_AI_REWRITE_ENABLED','false');vi.stubEnv('JOBMATCH_AI_REWRITE_REVIEW_ENABLED','false');vi.stubEnv('JOBMATCH_LETTER_SIGNING_SECRET','not-a-current-key');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('NO_HISTORY_NETWORK');}));vi.spyOn(Date,'now').mockImplementation(()=>{throw Error('NO_HISTORY_WALL_CLOCK');});
 const r=await validateRewriteArchive(f.archive,f.state.ownerId!);expect(r.archive).toEqual(f.archive);expect(r.payload.expiresAt).toBe(f.payload.expiresAt);expect(globalThis.fetch).not.toHaveBeenCalled();
});
it('keeps history independent of current source/revision and a rotated current verifier',async()=>{
 const f=await fixture(),key=Buffer.from('ac'.repeat(32),'hex'),config={...f.config,configurationId:'ab'.repeat(32),signing:{key,keyId:createHash('sha256').update(key).digest('hex')}};
 for(const state of [{...f.state,revision:f.state.revision+1},{...f.state,original:f.state.original+'Changed'},{...f.state,vacancy:'Changed SQL role'}])await expect(verifyRewriteReviewReceipt(f.state.ownerId!,state,f.receipt,f.config)).rejects.toMatchObject({code:'AI_REWRITE_REVIEW_INVALID'});
 await expect(verifyRewriteReviewReceipt(f.state.ownerId!,f.state,f.receipt,config)).rejects.toMatchObject({code:'AI_REWRITE_REVIEW_INVALID'});expect((await validateRewriteArchive(f.archive,f.state.ownerId!)).archive.receipt).toEqual(f.receipt);
});
it.each([
 ['format',{format:'jobmatch-ai-rewrite-archive-v2'}],['owner',{ownerId:'22222222-2222-4222-8222-222222222222'}],['semantic pass',{semanticAssessment:'passed'}],['accepted model',{modelAcceptance:'accepted'}],['automatic review',{contentReview:'verified'}],['no storage consent',{storageConsent:false}],['preview is storage consent',{storageConsent:true}],['unknown field',{trusted:true}],['invalid accepted time',{acceptedAt:'invalid'}],['noncanonical accepted time',{acceptedAt:'2026-11-06T11:00:00Z'}],['corrupt digest',{receiptSha256:'0'.repeat(64)}],['NUL source',{sourceOriginal:'\0'}],['unpaired surrogate source',{sourceOriginal:'\ud800'}],['oversized source',{sourceOriginal:'a'.repeat(100001)}]
])('rejects archive %s without promoting an acceptance claim',async(_name,patch)=>{
 const f=await fixture();await expect(validateRewriteArchive({...f.archive,...patch},f.state.ownerId!)).rejects.toBeDefined();
});
it('rejects a foreign expected owner even for an otherwise valid archive',async()=>{
 const f=await fixture();await expect(validateRewriteArchive(f.archive,'22222222-2222-4222-8222-222222222222')).rejects.toThrow('INVALID_REWRITE_ARCHIVE');
});
it.each(['unselected-byte','range-byte','CRLF','whitespace'])('binds full source exactly, including %s',async kind=>{
 const f=await fixture(),original=kind==='unselected-byte'?f.state.original.replace('PRIVATE','PUBLIC'):kind==='range-byte'?f.state.original.replace('Built 5','Built 6'):kind==='CRLF'?f.state.original.replaceAll('\r\n','\n'):' '+f.state.original;
 await expect(validateRewriteArchive({...f.archive,sourceOriginal:original},f.state.ownerId!)).rejects.toBeDefined();
});
it.each(['exact-expiry','before-issue-skew','after-expiry'])('bounds original acceptance time: %s',async kind=>{
 const f=await fixture(),at=kind==='before-issue-skew'?f.payload.issuedAt-5.001:kind==='after-expiry'?f.payload.expiresAt+1:f.payload.expiresAt;
 await expect(validateRewriteArchive({...f.archive,acceptedAt:new Date(at*1000).toISOString()},f.state.ownerId!)).rejects.toThrow('INVALID_REWRITE_ARCHIVE');
});
it('allows the bounded original clock skew while preserving the exact stored timestamp',async()=>{
 const f=await fixture(),archive={...f.archive,acceptedAt:new Date((f.payload.issuedAt-5)*1000).toISOString()};expect((await validateRewriteArchive(archive,f.state.ownerId!)).archive.acceptedAt).toBe(archive.acceptedAt);
});
it.each(['format','extra','key','expiry','old-issued','future-issued','review-text','review-origin','decision','digest','issue-ack','global-consent','model-status'])('rederives receipt structure and confirmation after %s corruption even with a recomputed corruption digest',async kind=>{
 const f=await fixture(),archive=await altered(f,p=>{
  if(kind==='format')p.format='future';else if(kind==='extra')p.extra=true;else if(kind==='key')p.issuerKeyId='00'.repeat(32);else if(kind==='expiry')p.expiresAt=Number(p.expiresAt)+1;else if(kind==='old-issued')p.issuedAt=JSON.parse((p.previewReceipt as RewriteReceipt).payload).issuedAt-6;else if(kind==='future-issued')p.issuedAt=p.expiresAt;
  else{const r=p.review as Record<string,unknown>;if(kind==='review-text')r.text='invented';else if(kind==='review-origin')(r.rows as {origin:string}[])[0].origin='source';else if(kind==='decision')(r.decisions as {action:string}[])[0].action='keep-source';else if(kind==='digest')r.reviewSha256='0'.repeat(64);else if(kind==='issue-ack')(r.confirmation as {acknowledgedIssueIds:string[]}).acknowledgedIssueIds=[];else if(kind==='global-consent')(r.confirmation as {consent:boolean}).consent=false;else (r.proposalClaims as {status:string}[])[0].status='refused';}
 });await expect(validateRewriteArchive(archive,f.state.ownerId!)).rejects.toBeDefined();
});
it('rejects an unknown nested preview tag and inconsistent inner lifecycle even if outer digest is recomputed',async()=>{
 const f=await fixture();for(const kind of ['tag','expiry']){
  const archive=await altered(f,p=>{const inner=p.previewReceipt as RewriteReceipt,body=JSON.parse(inner.payload);if(kind==='tag')body.preview.format='future-preview';else body.expiresAt++;inner.payload=JSON.stringify(body);});await expect(validateRewriteArchive(archive,f.state.ownerId!)).rejects.toBeDefined();
 }
});
it('covers signature corruption in the accidental-corruption digest without calling it MAC verification',async()=>{
 const f=await fixture(),receipt={...f.receipt,signature:'0'.repeat(64)};
 expect(await rewriteArchiveReceiptSha256(receipt)).not.toBe(f.archive.receiptSha256);await expect(validateRewriteArchive({...f.archive,receipt},f.state.ownerId!)).rejects.toThrow('INVALID_REWRITE_ARCHIVE');
 // A self-consistent file with a replaced signature can still pass structural
 // reading. Only the current authenticated verifier can reject the false MAC.
 const invented={...f.archive,receipt,receiptSha256:await rewriteArchiveReceiptSha256(receipt)};
 expect((await validateRewriteArchive(invented,f.state.ownerId!)).archive.receipt.signature).toBe(receipt.signature);
 await expect(verifyRewriteReviewReceipt(f.state.ownerId!,f.state,receipt,f.config)).rejects.toMatchObject({code:'AI_REWRITE_REVIEW_INVALID'});
});
it('does not authenticate a fully self-consistent invented review inside a local file',async()=>{
 const f=await fixture('edit'),decisions=f.confirmation.decisions.map((d,i)=>i?d:{...d,text:'Built 900 SQL reports'}),review=await prepareRewriteReview(f.preview,f.state.original,decisions),confirmation={consent:true,reviewed:true,decisions,acknowledgedReviewSha256:review.reviewSha256,acknowledgedIssueIds:review.issues.map(i=>i.id)};
 const {confirmRewriteReview}=await import('../lib/ai-rewrite-review'),inventedReview=await confirmRewriteReview(f.preview,f.state.original,confirmation),archive=await altered(f,p=>{p.review=inventedReview;});
 expect((await validateRewriteArchive(archive,f.state.ownerId!)).payload.review.text).toContain('900');await expect(verifyRewriteReviewReceipt(f.state.ownerId!,f.state,archive.receipt,f.config)).rejects.toMatchObject({code:'AI_REWRITE_REVIEW_INVALID'});
});
it('bounds the serialized UTF8 archive before attempting to parse an adversarial nested payload',async()=>{
 const f=await fixture(),receipt={payload:'\\"'.repeat(131072),signature:'ab'.repeat(32)},archive={...f.archive,sourceOriginal:'\u0001'.repeat(100000),receipt,receiptSha256:await rewriteArchiveReceiptSha256(receipt)};
 expect(new TextEncoder().encode(JSON.stringify(archive)).length).toBeGreaterThan(REWRITE_ARCHIVE_BYTES);await expect(validateRewriteArchive(archive,f.state.ownerId!)).rejects.toThrow('INVALID_REWRITE_ARCHIVE');
});
it('retains control-character fact IDs, Unicode source ranges and exact lexical acknowledgements',async()=>{
 const state=rewriteState();state.facts[0].id='\u0001'.repeat(100);const f=await fixture('edit',true,state),r=await validateRewriteArchive(f.archive,state.ownerId!);
 expect(r.payload.review.decisions[0].fact_id).toBe(state.facts[0].id);expect(r.payload.review.issues.some(i=>i.id.length>500)).toBe(true);expect(r.payload.review.confirmation.acknowledgedIssueIds).toEqual(r.payload.review.issues.map(i=>i.id));
});
it('structurally decodes an expired review without refreshing either nested deadline',async()=>{
 const f=await fixture();vi.useFakeTimers();vi.setSystemTime((f.payload.expiresAt+1000)*1000);const r=await decodeRewriteReviewReceipt(f.receipt,f.state.original);expect(r.payload.expiresAt).toBe(f.payload.expiresAt);expect(r.previewPayload.expiresAt).toBe(f.payload.expiresAt);expect(r.receipt).toEqual(f.receipt);
});
