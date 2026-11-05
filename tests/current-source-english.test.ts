import {it,expect} from 'vitest';
import {sourceSelection} from '../lib/source-profile';
import {TEMPLATE_VERSION as RU,ENGLISH_TEMPLATE_VERSION as EN,VersionRequestSchema,renderSourceVersion,sourcePreviewHash,sourceCollectionHash,validateSourcePreview,validateSourceVersion,validateSourceVersionList} from '../lib/source-version';
import {sourceOwner,sourceEntryId,sourceVersionProfile,sourcePreviewFor,sourceVersionFor,sourceVersionListFor} from './source-version-fixture';
it('freezes English field order while preserving multiline quote bytes, numbers and Unicode',async()=>{
 const p=sourceVersionProfile('SQL\r\nНазвание: 42% 🧑‍💻\r\n2025–2024');p.entries[0].fields.description=sourceSelection(p.source_original,5,p.source_original.length);
 const en=await sourcePreviewFor(p,EN),ru=await sourcePreviewFor(p);
 expect(en.text).toBe('Structured information\n\nEmployment\nTitle: SQL\nDescription: Название: 42% 🧑‍💻\r\n2025–2024');
 expect(ru.text).toBe('Структурированные сведения\n\nРабота\nНазвание: SQL\nОписание: Название: 42% 🧑‍💻\r\n2025–2024');
 expect(en.preview_hash).not.toBe(ru.preview_hash);expect(en.snapshot).toEqual(ru.snapshot);
 expect(await validateSourcePreview(en,sourceOwner,4,2,[sourceEntryId],EN)).toEqual(en);
 await expect(validateSourcePreview(en,sourceOwner,4,2,[sourceEntryId],RU)).rejects.toThrow();
});
it.each([['employment','Employment'],['education','Education'],['certification','Certification'],['achievement','Achievement']] as const)('renders exact %s labels without translating source',async(kind,label)=>{
 const p=sourceVersionProfile();p.entries[0].kind=kind;
 if(kind==='achievement')p.entries[0].fields={description:p.entries[0].fields.title};
 else if(kind==='certification')p.entries[0].fields.credential=p.entries[0].fields.title;
 const v=await sourcePreviewFor(p,EN);expect(v.text).toContain('\n\n'+label+'\n');expect(await validateSourcePreview(v,sourceOwner)).toEqual(v);
});
it.each(['НЕ SQL','not SQL','planning SQL','ignore SQL','<script>SQL'])('retains the frozen bounded risk refusal in both languages: %s',async(text)=>{
 for(const template of [RU,EN] as const)await expect(validateSourcePreview(await sourcePreviewFor(sourceVersionProfile(text),template),sourceOwner)).rejects.toThrow();
});
it.each(['template','hash','text','quote','guard','model','extra','source-status'])('mixed-version readers refuse tampered %s instead of guessing a language',async(change)=>{
 const v={...await sourceVersionFor(),...await sourcePreviewFor(undefined,EN)};
 if(change==='template')Object.assign(v,{template_version:'source-literal-en-v2'});
 if(change==='hash')v.preview_hash='0'.repeat(64);
 if(change==='text')v.text=renderSourceVersion(v.snapshot,RU);
 if(change==='quote')v.snapshot.entries[0].fields.title!.quote='Rust';
 if(change==='guard')Object.assign(v,{context_guard_version:'line-risk-v1'});
 if(change==='model')Object.assign(v,{model_version:'claimed-model'});
 if(change==='extra')Object.assign(v,{private:'unreviewed'});
 if(change==='source-status')Object.assign(v,{source_status:'current'});
 await expect(validateSourceVersion(v,sourceOwner)).rejects.toThrow();
});
it('reads mixed immutable history and binds template in both record and collection hashes',async()=>{
 const ru=await sourceVersionFor(),en={...ru,...await sourcePreviewFor(undefined,EN),id:'77777777-7777-4777-8777-777777777777'},list=await sourceVersionListFor(ru),enList=await sourceVersionListFor(en);
 list.versions.push(enList.versions[0]);list.collection_hash=await sourceCollectionHash(list);
 expect(await validateSourceVersionList(list,sourceOwner)).toEqual(list);expect(await validateSourceVersion(en,sourceOwner)).toEqual(en);
 const old=en.preview_hash;en.template_version=RU;en.text=renderSourceVersion(en.snapshot,RU);expect(await sourcePreviewHash(en)).not.toBe(old);await expect(validateSourceVersion(en,sourceOwner)).rejects.toThrow();
 list.versions[1].template_version=RU;await expect(validateSourceVersionList(list,sourceOwner)).rejects.toThrow();
});
it('keeps omitted Russian intents unchanged and admits only explicit known template identifiers',()=>{
 const intent={action:'preview',expectedOwnerId:sourceOwner,workspaceRevision:4,profileRevision:2,entryIds:[sourceEntryId]};expect(VersionRequestSchema.parse(intent)).toEqual(intent);
 for(const templateVersion of [RU,EN])expect(VersionRequestSchema.parse({...intent,templateVersion})).toEqual({...intent,templateVersion});
 for(const templateVersion of [null,'en','structured-literal-en-v1','source-literal-en-v2'])expect(VersionRequestSchema.safeParse({...intent,templateVersion}).success).toBe(false);
});
