import {reviewRewriteDraft,type RewriteFact} from './rewrite-draft';
/** Failure/refusal means no draft, never a silently substituted template. */
export function prepareRewritePreview(source:RewriteFact[],output:unknown){
 try{
  const draft=reviewRewriteDraft(source,output);
  if(!draft.suggestions.length)return {state:'no-suggestions' as const,message:'Модель не предложила изменений. Исходный текст не изменён.'};
  return {state:'review' as const,draft};
 }catch{return {state:'rejected' as const,message:'Черновик отклонён: ответ не прошёл проверку формата, ссылок на источник или чисел и отрицаний. Исходный текст не изменён.'};}
}
