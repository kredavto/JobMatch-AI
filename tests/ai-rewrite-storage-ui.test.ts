import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {adoptReviewedRewrite,validateRewriteStorageRead,rewriteStorageResponse} from '../lib/ai-rewrite-storage-ui';
import {reviewedVersionFixture} from './fixtures/rewrite-version';
import {rewriteState} from './fixtures/rewrite-review';
let f:Awaited<ReturnType<typeof reviewedVersionFixture>>;
beforeEach(async()=>{f=await reviewedVersionFixture();});afterEach(()=>vi.restoreAllMocks());
it('adopts only one immutable row and revision, retaining master data, goals, applications and existing versions',async()=>{
 const before={...rewriteState(),goal:'Keep goal',applications:[{id:'existing',created:'2026-01-01',title:'Keep application',status:'Планируется',note:'Keep note',events:[]}]},g=await reviewedVersionFixture(before);
 const result=await adoptReviewedRewrite(g.result,before,structuredClone(before),g.receipt,before.ownerId);
 expect(result.workspace).toEqual({...before,revision:8,versions:[g.row]});expect(result.saved.version.text).toBe(g.review.text);expect(before.versions).toEqual([]);
});
for(const mode of ['owner','revision','original','facts','vacancy','goal','applications','versions','missing'] as const)it('refuses stale response adoption after '+mode,async()=>{
 let current:typeof f.state|null=structuredClone(f.state);switch(mode){case'owner':current.ownerId='22222222-2222-4222-8222-222222222222';break;case'revision':current.revision++;break;case'original':current.original+='x';break;case'facts':current.facts[0].verified=false;break;case'vacancy':current.vacancy+='x';break;case'goal':current.goal+='x';break;case'applications':current.applications=[{id:'new',created:'2026-01-01',title:'New',status:'Планируется',note:'',events:[]}];break;case'versions':current.versions=[f.row];break;case'missing':current=null;}
 await expect(adoptReviewedRewrite(f.result,f.state,current,f.receipt,f.state.ownerId)).rejects.toThrow();
});
it('manual read matches the exact receipt after expiry without refreshing or adopting it',async()=>{
 vi.spyOn(Date,'now').mockReturnValue((f.payload.expiresAt+1000)*1000);const raw={format:'jobmatch-ai-rewrite-history-v1',ownerId:f.state.ownerId,workspaceRevision:20,versions:[f.row]};const value=await validateRewriteStorageRead(raw,f.state.ownerId!,f.row.id,f.receipt);expect(value.version).toEqual(f.row);expect(value.workspaceRevision).toBe(20);expect(f.state.revision).toBe(7);
});
for(const mode of ['owner','nonce','receipt','restored','empty','duplicate','extra','text'] as const)it('manual read refuses '+mode+' without inferring rollback',async()=>{
 const row=structuredClone(f.row),raw={format:'jobmatch-ai-rewrite-history-v1',ownerId:f.state.ownerId,workspaceRevision:8,versions:[row]};let nonce=f.row.id,receipt=f.receipt;
 switch(mode){case'owner':raw.ownerId='22222222-2222-4222-8222-222222222222';break;case'nonce':nonce='22222222-2222-4222-8222-222222222222';break;case'receipt':receipt={...receipt,signature:'00'.repeat(32)};break;case'restored':Object.assign(row,{restored_from:'22222222-2222-4222-8222-222222222222'});break;case'empty':raw.versions=[];break;case'duplicate':raw.versions=[row,row];break;case'extra':Object.assign(raw,{trusted:true});break;case'text':row.text+='x';}
 await expect(validateRewriteStorageRead(raw,f.state.ownerId!,nonce,receipt)).rejects.toThrow();
});
for(const mode of ['network','status','mime','invalid-utf8','invalid-json','oversize','cancel'] as const)it('bounded response outcome remains unconfirmed after '+mode,async()=>{
 const c=new AbortController();const spy=vi.spyOn(globalThis,'fetch');if(mode==='network')spy.mockRejectedValue(Error('PRIVATE'));else{
  const bytes=mode==='invalid-utf8'?new Uint8Array([255]):mode==='invalid-json'?'{':mode==='oversize'?'x'.repeat(2*1024*1024+1):JSON.stringify({error:'PRIVATE'});
  spy.mockResolvedValue(new Response(bytes,{status:mode==='status'?503:200,headers:{'content-type':mode==='mime'?'text/html':'application/json'}}));
 }if(mode==='cancel')c.abort();await expect(rewriteStorageResponse('/api/rewrite-versions',{method:'POST'},c.signal)).rejects.toThrow('REWRITE_STORAGE_NOT_CONFIRMED');expect(spy).toHaveBeenCalledTimes(1);
});
