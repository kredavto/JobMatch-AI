import {it,expect} from 'vitest';
import {aiReviewStatusError,aiReviewCopy} from '../lib/i18n/ai-review';
it('keeps HTTP review failures semantic across locales without changing request semantics',()=>{
 for(const [status,key] of [[503,'unavailable'],[409,'conflict'],[401,'session'],[429,'rate'],[413,'large'],[504,'interrupted'],[403,'failed'],[502,'failed']] as const){
  const semantic=aiReviewStatusError(status);expect(semantic).toBe(key);
  expect(aiReviewCopy.en.errors[semantic]).not.toBe(aiReviewCopy.ru.errors[semantic]);
 }
});
