import {it,expect} from 'vitest';
import {ENGLISH_TEMPLATE_VERSION,TEMPLATE_VERSION,TemplateVersionSchema,renderStructuredVersion,validateStructuredPreview,validateStructuredVersion,VersionRequestSchema,VersionListSchema,structuredPreviewHash} from '../lib/structured-version';
import {snapshot,owner,entryId,previewFor,versionFor} from './fixtures/structured-version';
const EN=ENGLISH_TEMPLATE_VERSION;
it('preserves a fixed historical Russian text and independently calculated UTF-8 digest',async()=>{
 const ru=await previewFor();expect(ru.preview_hash).toBe('728956041059bda4b4b184c49fbf4dedad7b8cfd36f9235ec2736538749d59f2');
 expect(renderStructuredVersion(snapshot,TEMPLATE_VERSION)).toBe(renderStructuredVersion(snapshot));expect(await validateStructuredVersion(await versionFor(),owner)).toEqual(await versionFor());
});
it('English labels copy exact mixed-script source, dates, positions and snapshot without translation',async()=>{
 const en=await previewFor(snapshot,EN),ru=await previewFor();expect(en.text).toBe('Structured information\n\nEmployment\nTitle: Python\nOrganization: Орбита\nStart / issue date: 2020\nEnd: 2024');
 expect(en.snapshot).toEqual(ru.snapshot);expect(en.preview_hash).not.toBe(ru.preview_hash);expect(en.model_version).toBeNull();
 expect(await validateStructuredPreview(en,owner,1,2,[entryId],EN)).toEqual(en);
});
it.each([['employment','Employment'],['education','Education'],['certification','Certification'],['achievement','Achievement']] as const)('freezes all English section and field labels for %s',async(kind,label)=>{
 const field={quote:'😀 42%',start:0,end:5},p={...snapshot,source_original:field.quote,entries:[{...snapshot.entries[0],kind,fields:{title:field,organization:field,start:field,end:field,description:field,credential:field}}]};
 const en=await previewFor(p,EN);expect(en.text).toBe('Structured information\n\n'+label+'\nTitle: 😀 42%\nOrganization: 😀 42%\nStart / issue date: 😀 42%\nEnd: 😀 42%\nDescription: 😀 42%\nCredential number: 😀 42%');expect(await validateStructuredPreview(en,owner)).toEqual(en);
});
it('rejects valid alternate-template responses when the request bound another template',async()=>{
 const en=await previewFor(snapshot,EN),ru=await previewFor();await expect(validateStructuredPreview(en,owner,1,2,[entryId],TEMPLATE_VERSION)).rejects.toThrow();await expect(validateStructuredPreview(ru,owner,1,2,[entryId],EN)).rejects.toThrow();
});
it('rejects changed tag/body/hash and unknown future versions rather than normalizing',async()=>{
 const en=await previewFor(snapshot,EN);
 for(const bad of [{...en,template_version:TEMPLATE_VERSION},{...en,template_version:'structured-literal-en-v2'},{...en,text:en.text.replace('Орбита','Orbit')},{...en,preview_hash:'a'.repeat(64)}])await expect(validateStructuredPreview(bad,owner)).rejects.toThrow();
 const tagOnly={...en,template_version:TEMPLATE_VERSION};expect(await structuredPreviewHash(tagOnly)).not.toBe(en.preview_hash);
 for(const tag of ['en','ru','STRUCTURED-LITERAL-EN-V1','structured-literal-en-v2',null])expect(TemplateVersionSchema.safeParse(tag).success).toBe(false);
});
it('accepts only optional exact known request tags and mixed bounded history',async()=>{
 const request={action:'preview',expectedOwnerId:owner,workspaceRevision:1,profileRevision:2,entryIds:[entryId]};
 expect(VersionRequestSchema.safeParse(request).success).toBe(true);expect(VersionRequestSchema.safeParse({...request,templateVersion:EN}).success).toBe(true);
 for(const tag of ['en',null,'structured-literal-en-v2'])expect(VersionRequestSchema.safeParse({...request,templateVersion:tag}).success).toBe(false);
 const ru=await versionFor(),en={...await versionFor(snapshot,EN),id:'44444444-4444-4444-8444-444444444444'};
 const versions=[ru,en].map(v=>({id:v.id,created:v.created,template_version:v.template_version,profile_revision:2,workspace_revision:1,text_length:Array.from(v.text).length,preview_hash:v.preview_hash}));
 expect(VersionListSchema.parse({format:'jobmatch-structured-version-list-v1',ownerId:owner,versions}).versions).toHaveLength(2);
});
it('English preserves the same context rejection without claiming semantic verification',async()=>{
 const p={...snapshot,source_original:'Never used Python',entries:[{...snapshot.entries[0],fields:{title:{quote:'Python',start:11,end:17}}}]};
 await expect(validateStructuredPreview(await previewFor(p,EN),owner)).rejects.toThrow();
});
