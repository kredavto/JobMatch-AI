import {supabase,type Identity} from './db';
import {ConsentRequestSchema,validateConsentPage,validateConsentReceipt,type ConsentRequest} from './consent-receipts';
import {UserError} from './errors';
export function consentAcceptanceEnabled(){const value=process.env.JOBMATCH_CONSENT_ACCEPTANCE_ENABLED??'false';if(value!=='false'&&value!=='true')throw new UserError('Запись принятия не настроена.',503,'CONSENT_NOT_CONFIGURED');return value==='true';}
export async function readConsentReceipts(user:Identity,locale:'ru'|'en',after=0,through?:number){
 const data=await supabase('/rest/v1/rpc/read_consent_receipts','POST',{p_locale:locale,p_after:after,p_through:through??null},user.token);
 try{return await validateConsentPage(data,user.id,locale,after,through);}catch{throw new UserError('Журнал принятия не прошёл проверку.',502,'CONSENT_RESPONSE_INVALID');}
}
export async function acceptProcessingNotice(user:Identity,value:ConsentRequest){
 const input=ConsentRequestSchema.parse(value);
 if(!consentAcceptanceEnabled())throw new UserError('Запись принятия не настроена.',503,'CONSENT_NOT_CONFIGURED');
 const data=await supabase('/rest/v1/rpc/accept_processing_notice','POST',{p_expected_sequence:input.expectedSequence,p_command_id:input.commandId,p_notice_version:input.noticeVersion,p_notice_locale:input.noticeLocale,p_notice_sha256:input.noticeSha256,p_acknowledged:input.acknowledged},user.token);
 try{const receipt=await validateConsentReceipt(data,user.id);if(receipt.commandId!==input.commandId||receipt.sequence!==input.expectedSequence+1||receipt.notice.version!==input.noticeVersion||receipt.notice.locale!==input.noticeLocale||receipt.notice.sha256!==input.noticeSha256)throw Error();return receipt;}
 catch{throw new UserError('Ответ принятия не прошёл проверку. Загрузите журнал без повтора записи.',502,'WRITE_RESULT_INVALID');}
}
