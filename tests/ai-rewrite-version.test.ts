import {expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {reviewedVersionFixture} from './fixtures/rewrite-version';
import {rewriteState} from './fixtures/rewrite-review';
import {validateReviewedRewriteVersion,validateRewriteVersionCollection,validateRewriteVersionSaveResult,hasRewriteVersionNamespace} from '../lib/ai-rewrite-version';
import {parseFacts} from '../lib/engine';

const owner='11111111-1111-4111-8111-111111111111';
it('does not issue an assertion after normal import until a saved vacancy is supplied',async()=>{
 const state={...rewriteState(),vacancy:''};await expect(reviewedVersionFixture(state)).rejects.toMatchObject({name:'ZodError',issues:expect.arrayContaining([expect.objectContaining({path:['vacancy']})])});await expect(reviewedVersionFixture({...state,vacancy:'SQL role'})).resolves.toHaveProperty('receipt');
});
it.each(['🧑‍💻 SQL\r\n  Built 5 reports  \r\nUnselected é','\u2003SQL\u00a0\nNo Python'])('preserves native-shaped selected Unicode/refusal/manual evidence: %s',async original=>{
 const state={...rewriteState(),original,facts:parseFacts(original,'Public native source').map(f=>({...f,verified:true}))};const f=await reviewedVersionFixture(state,{refused:true,manual:'Manual 7 SQL reports'});expect((await validateRewriteVersionSaveResult(f.result,state,f.receipt,owner)).version).toEqual(f.row);await expect(validateRewriteVersionCollection([f.row],owner)).resolves.toBeUndefined();
});
it('refuses duplicate whole source lines before issuing an archive assertion',async()=>{
 const original='SQL\nSQL',state={...rewriteState(),original,facts:parseFacts(original,'Public native source').map(f=>({...f,verified:true}))};await expect(reviewedVersionFixture(state)).rejects.toThrow('REWRITE_SOURCE_INVALID');
});
it('binds a native-shaped record and ACK to exact receipt/source/known evidence and existing rules score',async()=>{
 const f=await reviewedVersionFixture();expect((await validateReviewedRewriteVersion(f.row,owner)).version).toEqual(f.row);expect(await validateRewriteVersionSaveResult(f.result,f.state,f.receipt,owner)).toEqual(f.result);
});
it.each(['text','vacancy','revision','ids','snapshot','id','created','engine','template','extra','metadata-extra'])('rejects corrupted immutable record %s',async kind=>{
 const f=await reviewedVersionFixture(),row=structuredClone(f.row) as Record<string,unknown>;
 if(kind==='text')row.text='invented';else if(kind==='vacancy')row.vacancy='invented';else if(kind==='revision')row.profile_revision=Number(row.profile_revision)+1;else if(kind==='ids')row.evidence_ids=['other'];else if(kind==='snapshot')(row.evidence_snapshot as {verified:boolean}[])[0].verified=false;else if(kind==='id')row.id=randomUUID();else if(kind==='created')row.created=new Date(Date.parse(f.row.created)+1).toISOString();else if(kind==='engine')row.engine_version='rules-v1';else if(kind==='template')row.template_version='ai-rewrite-reviewed-v2';else if(kind==='extra')row.trusted=true;else (row.match_metadata as Record<string,unknown>).extra=true;
 await expect(validateReviewedRewriteVersion(row,owner)).rejects.toBeDefined();
});
it('preserves unknown fact extras from the exact saved source in an ACK',async()=>{
 const state=rewriteState();Object.assign(state.facts[0],{legacy:{note:'keep'}});const f=await reviewedVersionFixture(state);expect((await validateRewriteVersionSaveResult(f.result,state,f.receipt,owner)).version.evidence_snapshot[0]).toHaveProperty('legacy',{note:'keep'});
 const bad=structuredClone(f.result);Object.assign(bad.version.evidence_snapshot[0],{legacy:{note:'changed'}});await expect(validateRewriteVersionSaveResult(bad,state,f.receipt,owner)).rejects.toThrow('INVALID_REWRITE_SAVE_RESULT');
});
it.each(['owner','workspace-revision','receipt','source','score','metadata','duplicate','cap','restore','extra'])('rejects inconsistent write ACK %s without treating it as commit/rollback evidence',async kind=>{
 const f=await reviewedVersionFixture(),result=structuredClone(f.result),state=structuredClone(f.state),receipt=structuredClone(f.receipt);
 if(kind==='owner')result.ownerId='22222222-2222-4222-8222-222222222222';else if(kind==='workspace-revision')result.workspaceRevision++;else if(kind==='receipt')receipt.signature='0'.repeat(64);else if(kind==='source')state.original+='Changed';else if(kind==='score')result.version.score=(result.version.score+1)%101;else if(kind==='metadata')result.version.match_metadata.rules_revision='other';else if(kind==='duplicate')state.versions=[f.row];else if(kind==='cap')state.versions=Array.from({length:100},(_,i)=>({...f.row,id:String(i)}));else if(kind==='restore')Object.assign(result.version,{id:randomUUID(),restored_from:f.row.id});else Object.assign(result,{extra:true});
 await expect(validateRewriteVersionSaveResult(result,state,receipt,owner)).rejects.toBeDefined();
});
it('checks exact historical restore copies and immediate chain without current keys/time/source',async()=>{
 const f=await reviewedVersionFixture(),one={...f.row,id:randomUUID(),created:'2036-11-06T11:00:00.000Z',restored_from:f.row.id},two={...one,id:randomUUID(),restored_from:one.id};
 await expect(validateRewriteVersionCollection([f.row,one,two],owner)).resolves.toBeUndefined();
 for(const rows of [[one],[one,f.row],[f.row,{...one,text:'changed'}],[f.row,{...one,score:(one.score+1)%101}],[f.row,one,{...two,restored_from:two.id}],[f.row,f.row]])await expect(validateRewriteVersionCollection(rows,owner)).rejects.toBeDefined();
});
it('keeps unrelated legacy rows while rejecting every reserved tag or missing archive',async()=>{
 const f=await reviewedVersionFixture(),legacy={id:'legacy',created:'2026-01-01',text:'original',vacancy:'SQL',score:0,evidence_ids:[],engine_version:'legacy-unknown'};
 expect(hasRewriteVersionNamespace(legacy)).toBe(false);await expect(validateRewriteVersionCollection([legacy,f.row],owner)).resolves.toBeUndefined();
 for(const patch of [{ai_rewrite:null},{engine_version:'ai-rewrite-future'},{template_version:'ai-rewrite-future'}]){const bad={...legacy,...patch};expect(hasRewriteVersionNamespace(bad)).toBe(true);await expect(validateRewriteVersionCollection([bad],owner)).rejects.toBeDefined();}
});
it('does not infer a generated-text score when reading a historical scalar value',async()=>{
 const f=await reviewedVersionFixture(),row={...f.row,score:0};expect((await validateReviewedRewriteVersion(row,owner)).version.score).toBe(0);await expect(validateRewriteVersionSaveResult({...f.result,version:row},f.state,f.receipt,owner)).rejects.toBeDefined();
});
