import {createHash} from 'node:crypto';
import {profilePreview} from '../../lib/ai-profile-v2';
import {issueProfileReceipt} from '../../lib/ai-profile-signing';
import {decodeProfileReceipt,profilePayloadSha256,type ProfileAcceptance} from '../../lib/ai-profile-acceptance';
import type {StructuredProfile} from '../../lib/structured-profile';
export const AI_ACCEPTANCE_FIXTURE_KEY='ab'.repeat(32);
export const AI_ACCEPTANCE_FIXTURE_OWNER='11111111-1111-4111-8111-111111111111';
/** Scripted UI/protocol fixture, never an actual-model or provider-Auth result. */
export async function aiAcceptanceFixture(indices=[0,1]){
 const source='😀 Engineer at Orbit.\n\nAnalyst at River.';
 const profile:StructuredProfile={format:'jobmatch-structured-profile-v1',ownerId:AI_ACCEPTANCE_FIXTURE_OWNER,revision:0,workspace_revision:1,source_workspace_revision:1,source_original:source,source_fact_ids:['f1','f2'],source_matches:true,entries:[]};
 const fields=(title:string,organization:string)=>({title,organization,start:null,end:null,description:null,credential:null});
 const preview=profilePreview({entries:[{blockId:0,kind:'employment',fields:fields('Engineer','Orbit')},{blockId:1,kind:'employment',fields:fields('Analyst','River')}]},source,{model:'synthetic-fixture',operatorDeclaredModelDigest:'sha256:'+'c'.repeat(64),modelIdentityVerified:false});
 const key=Buffer.from(AI_ACCEPTANCE_FIXTURE_KEY,'hex'),receipt=issueProfileReceipt(profile,preview,{key,keyId:createHash('sha256').update(key).digest('hex')}),payload=decodeProfileReceipt(receipt),created=new Date((payload.issuedAt+1)*1000).toISOString();
 const allIds=['33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
 const record:ProfileAcceptance={format:'jobmatch-ai-profile-acceptance-v1',id:payload.id,ownerId:profile.ownerId,created,receipt,payloadSha256:await profilePayloadSha256(receipt.payload),selectedIndices:indices,entryIds:indices.map(i=>allIds[i]),userSelectionAccepted:true,signatureVerifiedAtAcceptance:true,issuerIdentity:'server-key-holder',modelIdentityVerified:false,modelAcceptance:'not-accepted'};
 const saved:StructuredProfile={...profile,revision:indices.length,entries:indices.map(i=>({id:allIds[i],kind:preview.candidates[i].kind,fields:preview.candidates[i].fields,confirmed:false,created}))};
 const list={format:'jobmatch-ai-profile-acceptance-list-v1' as const,ownerId:profile.ownerId,items:[{id:record.id,created,entryCount:indices.length,workspaceRevision:1,profileRevision:0,model:preview.origin.model,operatorDeclaredModelDigest:preview.origin.operatorDeclaredModelDigest,contractVersion:'paragraph-quotes-v2' as const,payloadSha256:record.payloadSha256,modelIdentityVerified:false as const,modelAcceptance:'not-accepted' as const}]};
 return {profile,preview,receipt,record,saved,list,result:{profile:saved,record},envelope:{ownerId:profile.ownerId,workspaceRevision:1,profileRevision:0,preview,receipt}};
}
