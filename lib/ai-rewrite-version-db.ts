import {supabase,type Identity,type Workspace} from './db';
import {UserError} from './errors';
import {RewriteReceiptSchema,type RewriteReceipt} from './ai-rewrite';
import type {RewriteSigningConfig} from './ai-rewrite-signing';
import {prepareRewriteVersionScore,validateRewriteVersionSaveResult} from './ai-rewrite-version';
/** Current review MAC/source/config must be verified by the handler. SQL checks
 * them again under lock. Transport/unknown ACK is never a rollback certificate.
 */
export async function acceptReviewedRewrite(user:Identity,previous:Workspace,rawReceipt:RewriteReceipt,config:{signing:RewriteSigningConfig;configurationId:string}){
 const receipt=RewriteReceiptSchema.parse(rawReceipt),score=prepareRewriteVersionScore(previous);let value:unknown;
 try{value=await supabase('/rest/v1/rpc/accept_rewrite_version','POST',{p_revision:previous.revision,p_payload:receipt.payload,p_signature:receipt.signature,p_key_id:config.signing.keyId,p_configuration_id:config.configurationId,p_score:score.score,p_match_metadata:score.match_metadata,p_accept:'STORE_REVIEWED_AI_REWRITE'},user.token);}
 catch(error){if(error instanceof Error&&['AUTH','CONFLICT','RATE'].includes(error.message)||error instanceof UserError&&(error.status<500||error.code==='AI_REWRITE_STORAGE_UNAVAILABLE'))throw error;throw new UserError('Результат записи неизвестен.',502,'AI_REWRITE_VERSION_SAVE_UNKNOWN');}
 try{return await validateRewriteVersionSaveResult(value,previous,receipt,user.id);}catch{throw new UserError('Подтверждение записи некорректно.',502,'AI_REWRITE_VERSION_WRITE_INVALID');}
}
