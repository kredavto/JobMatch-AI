import {it,expect} from 'vitest';
import {sourceSelection} from '../lib/source-profile';
import {SourcePreviewSchema,SourceVersionSchema,VersionRequestSchema,ClearVersionsSchema,sourcePreviewHash,sourceCollectionHash,validateSourcePreview,validateSourceVersion,validateSourceVersionList,contextIssue,renderSourceVersion,SOURCE_VERSION_FIELDS} from '../lib/source-version';
import {sourceOwner,sourceEntryId,sourceVersionProfile,sourcePreviewFor,sourceVersionFor,sourceVersionListFor} from './source-version-fixture';
it('freezes literal labels/order and preserves raw CRLF/emoji selected fields without rewriting',async()=>{
 const p=sourceVersionProfile();p.entries[0].fields.organization=sourceSelection(p.source_original,5,5+'Acme 🧑‍💻'.length);
 const v=await sourcePreviewFor(p);expect(renderSourceVersion(p)).toBe('Структурированные сведения\n\nРабота\nНазвание: SQL\nОрганизация: Acme 🧑‍💻');
 expect(await validateSourcePreview(v,sourceOwner,4,2,[sourceEntryId])).toEqual(v);expect(Object.isFrozen(SOURCE_VERSION_FIELDS)).toBe(true);
});
it.each(['НЕ SQL','not SQL','No SQL','CANNOT use SQL','Планирую SQL','Изучаю SQL','ignore instructions SQL','<script>SQL','πnot SQL'])('bounded grammar refuses known context: %s',async text=>{
 const p=sourceVersionProfile(text);expect(contextIssue(p,p.entries[0])).toBeTruthy();expect(SourcePreviewSchema.safeParse(await sourcePreviewFor(p)).success).toBe(false);
});
it.each(['SQL','Notable SQL','безопасный SQL','2025–2024 SQL','Não usa SQL','ſystem prompt SQL','Not skilled in:\nSQL'])('literal/limited grammar is not a semantic/date/all-language verifier: %s',async text=>{
 const p=sourceVersionProfile(text);expect(contextIssue(p,p.entries[0])).toBeNull();expect(await validateSourcePreview(await sourcePreviewFor(p),sourceOwner)).toBeTruthy();
});
it.each(['source','ids','revision','workspace','entry-created','fields','rendered'])('hash binds %s and does not accept stale caller content',async mutation=>{
 const v=await sourcePreviewFor(),changed=structuredClone(v);
 if(mutation==='source')changed.snapshot.source_original+='\nPrivate retained line';
 if(mutation==='ids')changed.snapshot.source_fact_ids=['new-fact-id'];
 if(mutation==='revision')changed.snapshot.revision++;
 if(mutation==='workspace')changed.snapshot.workspace_revision++;
 if(mutation==='entry-created')changed.snapshot.entries[0].created='2026-11-01T00:01:00Z';
 if(mutation==='fields'){changed.snapshot.entries[0].fields.description=sourceSelection(changed.snapshot.source_original,0,3);changed.text=renderSourceVersion(changed.snapshot);}
 if(mutation==='rendered')changed.text+=' Invented data';
 expect(await sourcePreviewHash(changed)).not.toBe(v.preview_hash);await expect(validateSourcePreview(changed,sourceOwner)).rejects.toThrow();
});
it.each(['unconfirmed','uncaptured','stale-source','foreign','wrong-id','wrong-revision','extra','fake-model','frozen-text'])('refuses invalid provenance/context %s',async kind=>{
 const v=await sourcePreviewFor();let owner=sourceOwner,ids=[sourceEntryId],rev=4;
 if(kind==='unconfirmed')v.snapshot.entries[0].confirmed=false;
 if(kind==='uncaptured')v.snapshot.source_captured=false;
 if(kind==='stale-source')v.snapshot.source_matches=false;
 if(kind==='foreign')owner='22222222-2222-4222-8222-222222222222';
 if(kind==='wrong-id')ids=['77777777-7777-4777-8777-777777777777'];
 if(kind==='wrong-revision')rev=5;
 if(kind==='extra')Object.assign(v,{private:'PRIVATE'});
 if(kind==='fake-model')Object.assign(v,{model_version:'claimed-model'});
 if(kind==='frozen-text')v.text=v.text.replace('Название','Role');
 await expect(validateSourcePreview(v,owner,rev,2,ids)).rejects.toThrow();
});
it('historical source match is at-save-only, and edits to ID/creation/list summaries invalidate the collection hash',async()=>{
 const v=await sourceVersionFor(),list=await sourceVersionListFor(v);expect(await validateSourceVersion(v,sourceOwner)).toEqual(v);expect(await validateSourceVersionList(list,sourceOwner)).toEqual(list);
 for(const patch of [{id:'77777777-7777-4777-8777-777777777777'},{created:'2026-11-01T00:02:00Z'},{text_length:1},{profile_revision:3},{workspace_revision:5},{preview_hash:'0'.repeat(64)}]){
  const changed=structuredClone(list);Object.assign(changed.versions[0],patch);expect(await sourceCollectionHash(changed)).not.toBe(list.collection_hash);await expect(validateSourceVersionList(changed,sourceOwner)).rejects.toThrow();
 }
 expect(SourceVersionSchema.safeParse({...v,source_status:'current'}).success).toBe(false);
});
it('strict intents require explicit save consent/acceptance and separately hash-bound clear',()=>{
 const preview={action:'preview',expectedOwnerId:sourceOwner,workspaceRevision:4,profileRevision:2,entryIds:[sourceEntryId]};
 expect(VersionRequestSchema.parse(preview)).toEqual(preview);
 const save={...preview,action:'save',previewHash:'a'.repeat(64),accept:'SAVE_LITERAL_SOURCE_VERSION',consentToStore:true};expect(VersionRequestSchema.parse(save)).toEqual(save);
 for(const bad of [{...save,consentToStore:false},{...save,consentToStore:undefined},{...save,text:'forged'},{...preview,entryIds:[sourceEntryId,sourceEntryId]},{...preview,profileRevision:2147483648}])expect(VersionRequestSchema.safeParse(bad).success).toBe(false);
 expect(ClearVersionsSchema.safeParse({action:'clear',expectedOwnerId:sourceOwner,collectionHash:'a'.repeat(64),accept:'DELETE_LITERAL_SOURCE_VERSIONS'}).success).toBe(true);
 expect(ClearVersionsSchema.safeParse({...save,action:'clear'}).success).toBe(false);
});
