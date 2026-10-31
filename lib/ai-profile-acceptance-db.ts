import {z} from 'zod';
import {supabase,type Identity} from './db';
import {ProfileAcceptanceListSchema,SelectedProfileIndicesSchema,decodeProfileReceipt,validateProfileAcceptance,validateProfileAcceptanceResult,type ProfileReceipt} from './ai-profile-acceptance';
import {UserError} from './errors';

export async function requireProfileSigningReady(user:Identity,keyId:string){
 const result=await supabase('/rest/v1/rpc/ai_profile_signing_ready','POST',{p_key_id:keyId},user.token);
 if(result!==true)throw new UserError('',503,'AI_PROFILE_ACCEPTANCE_UNAVAILABLE');
}
export async function acceptProfileCandidates(user:Identity,workspaceRevision:number,profileRevision:number,receipt:ProfileReceipt,selected:unknown){
 const selectedIndices=SelectedProfileIndicesSchema.parse(selected),payload=decodeProfileReceipt(receipt);
 if(payload.source.ownerId!==user.id||payload.source.workspaceRevision!==workspaceRevision||payload.source.profileRevision!==profileRevision||selectedIndices.some(i=>i>=payload.preview.candidates.length))throw new UserError('',400,'AI_PROFILE_RECEIPT_INVALID');
 const data=await supabase('/rest/v1/rpc/accept_ai_profile_candidates','POST',{p_workspace_revision:workspaceRevision,p_profile_revision:profileRevision,p_payload:receipt.payload,p_signature:receipt.signature,p_selected_indices:selectedIndices,p_accept:'SAVE_REVIEWED_AI_FIELDS'},user.token);
 try{return await validateProfileAcceptanceResult(data,user.id,workspaceRevision,profileRevision,receipt,selectedIndices);
 }catch{throw new UserError('',502,'WRITE_RESULT_INVALID');}
}
export async function listProfileAcceptances(user:Identity){
 const data=await supabase('/rest/v1/rpc/list_ai_profile_acceptances','POST',{},user.token);
 try{const list=ProfileAcceptanceListSchema.parse(data);if(list.ownerId!==user.id)throw Error();return list;}
 catch{throw new UserError('',502,'HISTORY_INVALID_RESPONSE');}
}
export async function readProfileAcceptance(user:Identity,id:string){
 const data=await supabase('/rest/v1/rpc/read_ai_profile_acceptance','POST',{p_id:z.uuid().parse(id)},user.token);
 if(data===null)throw new UserError('',404,'AI_PROFILE_ACCEPTANCE_NOT_FOUND');
 try{const result=await validateProfileAcceptance(data,user.id);if(result.id!==id)throw Error();return result;}
 catch{throw new UserError('',502,'HISTORY_INVALID_RESPONSE');}
}
