import {supabase,type Identity} from './db';
import {UserError} from './errors';
import {SavedLettersStateSchema,validateSavedLetterVersion,decodeLetterReceipt,type LetterReceipt} from './saved-letter';
import {z} from 'zod';
export async function readSavedLetters(user:Identity){
 const value=await supabase('/rest/v1/rpc/read_saved_letters','POST',{},user.token);
 try{const state=SavedLettersStateSchema.parse(value);if(state.ownerId!==user.id)throw Error();return state;}catch{throw new UserError('Ответ истории писем не прошёл проверку.',502,'LETTER_HISTORY_INVALID');}
}
export async function readSavedLetter(user:Identity,id:string){
 const value=await supabase('/rest/v1/rpc/read_saved_letter','POST',{p_id:z.uuid().parse(id)},user.token);if(value===null)throw new UserError('Версия письма не найдена.',404,'LETTER_NOT_FOUND');
 try{const row=await validateSavedLetterVersion(value,user.id);if(row.id!==id)throw Error();return row;}catch{throw new UserError('Версия письма не прошла проверку.',502,'LETTER_VERSION_INVALID');}
}
export async function requireLetterSigningReady(user:Identity,keyId:string){if(await supabase('/rest/v1/rpc/letter_signing_ready','POST',{p_key_id:keyId},user.token)!==true)throw new UserError('Серверное сохранение писем недоступно.',503,'LETTER_STORAGE_UNAVAILABLE');}
export async function acceptSavedLetter(user:Identity,workspaceRevision:number,letterRevision:number,receipt:LetterReceipt){
 let value:unknown;
 try{value=await supabase('/rest/v1/rpc/accept_saved_letter','POST',{p_workspace_revision:workspaceRevision,p_letter_revision:letterRevision,p_payload:receipt.payload,p_signature:receipt.signature,p_accept:'SAVE_REVIEWED_LETTER_VERSION'},user.token);}catch(error){if(error instanceof Error&&['AUTH','CONFLICT','RATE'].includes(error.message)||error instanceof UserError&&error.status<500)throw error;throw new UserError('Результат сохранения неизвестен. Сначала перечитайте историю; не повторяйте запись автоматически.',502,'LETTER_SAVE_UNKNOWN');}
 try{const result=z.strictObject({state:SavedLettersStateSchema,record:z.unknown()}).parse(value),row=await validateSavedLetterVersion(result.record,user.id),p=decodeLetterReceipt(receipt),item=result.state.items[0];
  if(result.state.ownerId!==user.id||result.state.revision!==letterRevision+1||p.source.workspaceRevision!==workspaceRevision||p.source.letterRevision!==letterRevision||row.receipt.payload!==receipt.payload||row.receipt.signature!==receipt.signature||!item||item.id!==row.id||item.version!==row.version||item.payloadSha256!==row.payloadSha256||item.created!==row.created||item.workspaceRevision!==workspaceRevision||item.templateVersion!==p.snapshot.templateVersion||item.style!==p.snapshot.style||item.edited!==p.snapshot.review.edited)throw Error();
  return {state:result.state,record:row};
 }catch{throw new UserError('Ответ записи не прошёл проверку. Сначала перечитайте историю; не повторяйте запись автоматически.',502,'LETTER_WRITE_INVALID');}
}
