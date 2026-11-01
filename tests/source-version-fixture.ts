import {SourceProfileSchema,sourceSelection} from '../lib/source-profile';
import {TEMPLATE_VERSION,CONTEXT_GUARD_VERSION,renderSourceVersion,sourcePreviewHash,sourceCollectionHash,type SourceVersion,type SourcePreview} from '../lib/source-version';
export const sourceOwner='11111111-1111-4111-8111-111111111111';
export const sourceEntryId='55555555-5555-4555-8555-555555555555';
export function sourceVersionProfile(text='SQL\r\nAcme 🧑‍💻\r\n2024–2025'){
 const at=text.indexOf('SQL');return SourceProfileSchema.parse({format:'jobmatch-source-profile-v1',ownerId:sourceOwner,revision:2,workspace_revision:4,source_workspace_revision:3,source_original:text,source_fact_ids:['f1'],source_captured:true,source_matches:true,entries:[{id:sourceEntryId,kind:'employment',fields:{title:sourceSelection(text,at,at+3)},confirmed:true,created:'2026-11-01T00:00:00Z'}],sourceVerification:'exact-ranges-only',semanticAssessment:'not-performed',modelVersion:null});
}
export async function sourcePreviewFor(snapshot=sourceVersionProfile()){
 const data:Omit<SourcePreview,'preview_hash'>={template_version:TEMPLATE_VERSION,context_guard_version:CONTEXT_GUARD_VERSION,generator:'literal-template' as const,model_version:null,snapshot,text:renderSourceVersion(snapshot)};
 return {...data,preview_hash:await sourcePreviewHash(data)};
}
export async function sourceVersionFor():Promise<SourceVersion>{return {...await sourcePreviewFor(),format:'jobmatch-source-version-v1',id:'66666666-6666-4666-8666-666666666666',created:'2026-11-01T00:01:00Z',source_status:'at-save-only'};}
export async function sourceVersionListFor(version?:SourceVersion){
 version??=await sourceVersionFor();
 const data={format:'jobmatch-source-version-list-v1' as const,ownerId:sourceOwner,versions:[{id:version.id,created:version.created,template_version:version.template_version,profile_revision:version.snapshot.revision,workspace_revision:version.snapshot.workspace_revision,text_length:Array.from(version.text).length,preview_hash:version.preview_hash}]};
 return {...data,collection_hash:await sourceCollectionHash(data)};
}
