import {renderStructuredVersion,structuredPreviewHash,type StructuredPreview,type StructuredVersion} from '../../lib/structured-version';
import type {StructuredProfile} from '../../lib/structured-profile';
export const owner='11111111-1111-4111-8111-111111111111',entryId='22222222-2222-4222-8222-222222222222',versionId='33333333-3333-4333-8333-333333333333';
export const snapshot:StructuredProfile={format:'jobmatch-structured-profile-v1',ownerId:owner,revision:2,workspace_revision:1,source_workspace_revision:1,source_original:'😀 Python\nОрбита\n2020–2024',source_fact_ids:['f1'],source_matches:true,entries:[{id:entryId,kind:'employment',fields:{title:{quote:'Python',start:2,end:8},organization:{quote:'Орбита',start:9,end:15},start:{quote:'2020',start:16,end:20},end:{quote:'2024',start:21,end:25}},confirmed:true,created:'2026-10-29T00:00:00+00:00'}]};
export async function previewFor(profile:StructuredProfile=snapshot):Promise<StructuredPreview>{
 const value={template_version:'structured-literal-v1' as const,context_guard_version:'line-risk-v1' as const,generator:'literal-template' as const,model_version:null,snapshot:profile,text:renderStructuredVersion(profile)};
 return {...value,preview_hash:await structuredPreviewHash(value)};
}
export async function versionFor(profile:StructuredProfile=snapshot):Promise<StructuredVersion>{return {...await previewFor(profile),format:'jobmatch-structured-version-v1',id:versionId,created:'2026-10-29T01:00:00+00:00'};}
