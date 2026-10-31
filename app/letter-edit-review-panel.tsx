'use client';
import {letterEditReviewCopy} from '../lib/i18n/letter-edit-review';
import type {reviewLetterEdit} from '../lib/letter-edit-review';
import type {UiLocale} from '../lib/i18n/locale';
type Review=ReturnType<typeof reviewLetterEdit>;
export default function LetterEditReviewPanel({review,reviewed,onReview,disabled,locale}:{review:Review;reviewed:Set<string>;onReview:(id:string,checked:boolean)=>void;disabled:boolean;locale:UiLocale}){
 const t=letterEditReviewCopy(locale);
 return <section aria-labelledby="letter-edit-review-title"><h3 id="letter-edit-review-title">{t.title}</h3><p>{t.help}</p>{review.coverage==='token-limit'?<p role="alert">{t.limit}</p>:review.issues.map((issue,i)=><article key={issue.id}><h4>{t.kinds[issue.kind]}</h4>{issue.before&&<p>{t.before}: <q lang="" className="ai-profile-source">{issue.before.quote}</q> <small>[{issue.before.start}, {issue.before.end})</small></p>}{issue.after&&<p>{t.after}: <q lang="" className="ai-profile-source">{issue.after.quote}</q> <small>[{issue.after.start}, {issue.after.end})</small></p>}<label className="check"><input type="checkbox" disabled={disabled} checked={reviewed.has(issue.id)} onChange={event=>onReview(issue.id,event.target.checked)}/>{t.review(i+1)}</label></article>)}</section>;
}
