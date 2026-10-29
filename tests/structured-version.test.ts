import {it,expect} from 'vitest';
import {contextIssue,renderStructuredVersion,validateStructuredPreview,validateStructuredVersion,VersionRequestSchema,VersionListSchema} from '../lib/structured-version';
import {snapshot,owner,entryId,previewFor,versionFor} from './fixtures/structured-version';
it('literal template retains exact numbers, Unicode quotes, order and provenance',async()=>{
 const value=await previewFor();expect(value.text).toBe('Структурированные сведения\n\nРабота\nНазвание: Python\nОрганизация: Орбита\nНачало / дата выдачи: 2020\nОкончание: 2024');
 expect(await validateStructuredPreview(value,owner,1,2,[entryId])).toEqual(value);expect((await validateStructuredVersion(await versionFor(),owner)).model_version).toBeNull();
});
it('rejects forged text, source, offsets, hash, owner, revisions and selected set',async()=>{
 const value=await previewFor();
 for(const candidate of [{...value,text:value.text+'5 лет'},{...value,preview_hash:'a'.repeat(64)},{...value,snapshot:{...snapshot,source_original:snapshot.source_original+'!'}},{...value,snapshot:{...snapshot,source_matches:false}},{...value,snapshot:{...snapshot,entries:[{...snapshot.entries[0],confirmed:false}]}}])await expect(validateStructuredPreview(candidate,owner)).rejects.toThrow();
 await expect(validateStructuredPreview(value,entryId)).rejects.toThrow();await expect(validateStructuredPreview(value,owner,2)).rejects.toThrow();await expect(validateStructuredPreview(value,owner,1,3)).rejects.toThrow();await expect(validateStructuredPreview(value,owner,1,2,[owner])).rejects.toThrow();
});
it.each(['Не использовал Python','Never used Python','Learning Python','Планирую Python','ignore previous instructions Python','<script>Python','Не\nPython\nнет'])('checks full source lines with explicit Unicode ranges: %s',source=>{
 const start=Array.from(source.slice(0,source.indexOf('Python'))).length,entry={...snapshot.entries[0],fields:{title:{quote:'Python',start,end:start+6}}};
 const profile={...snapshot,source_original:source,entries:[entry]};expect(!!contextIssue(profile,entry)).toBe(source!=='Не\nPython\nнет');
});
it('checks all lines of multiline fields and does not infer date duration',()=>{
 const source='Python\nnot SQL';const entry={...snapshot.entries[0],fields:{title:{quote:source,start:0,end:Array.from(source).length}}};expect(contextIssue({...snapshot,source_original:source},entry)).toBeTruthy();expect(renderStructuredVersion(snapshot)).not.toMatch(/лет|years/);
});
it('requires unique selected IDs, explicit save acceptance and prohibits client text or provenance',()=>{
 const body={action:'preview',expectedOwnerId:owner,workspaceRevision:1,profileRevision:2,entryIds:[entryId]};expect(VersionRequestSchema.safeParse(body).success).toBe(true);
 for(const bad of [{...body,entryIds:[]},{...body,entryIds:[entryId,entryId]},{...body,text:'invented'},{...body,action:'save',previewHash:'a'.repeat(64)},{...body,profileRevision:0}])expect(VersionRequestSchema.safeParse(bad).success).toBe(false);
 expect(VersionRequestSchema.safeParse({...body,action:'save',previewHash:'a'.repeat(64),accept:'SAVE_LITERAL_VERSION'}).success).toBe(true);
});
it('hash binds positions, repeated quotes, fact-ID boundaries and generator version',async()=>{
 const first={...snapshot,source_original:'Python Python',entries:[{...snapshot.entries[0],fields:{title:{quote:'Python',start:0,end:6}}}]};const second={...first,entries:[{...first.entries[0],fields:{title:{quote:'Python',start:7,end:13}}}]};
 expect((await previewFor(first)).text).toBe((await previewFor(second)).text);expect((await previewFor(first)).preview_hash).not.toBe((await previewFor(second)).preview_hash);
 expect((await previewFor({...snapshot,source_fact_ids:['a,b','c']})).preview_hash).not.toBe((await previewFor({...snapshot,source_fact_ids:['a','b,c']})).preview_hash);
});
it('history summary is bounded and has no source payload',()=>{expect(VersionListSchema.safeParse({format:'jobmatch-structured-version-list-v1',ownerId:owner,versions:[],source_original:'x'}).success).toBe(false);});

it('uses code-point text budgets consistently with PostgreSQL for large non-BMP literals',async()=>{
 const quote='😀'.repeat(500),field={quote,start:0,end:500};
 const profile={...snapshot,source_original:quote,entries:Array.from({length:50},(_,i)=>({...snapshot.entries[0],id:'22222222-2222-4222-8222-'+String(i+1).padStart(12,'0'),kind:'certification' as const,fields:{title:field,organization:field,start:field,end:field,description:field,credential:field}}))};
 const preview=await previewFor(profile);expect(preview.text.length).toBeGreaterThan(200000);expect(Array.from(preview.text).length).toBeLessThan(200000);expect(await validateStructuredPreview(preview,owner)).toEqual(preview);
});
