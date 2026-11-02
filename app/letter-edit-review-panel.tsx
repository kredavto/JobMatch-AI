'use client';
import type {reviewLetterEdit} from '../lib/letter-edit-review';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
import {letterReviewCopy} from '../lib/i18n/local-letter';
export default function LetterEditReviewPanel({review,reviewed,onReview,disabled,locale='ru'}:{review:ReturnType<typeof reviewLetterEdit>;reviewed:Set<string>;onReview:(id:string,checked:boolean)=>void;disabled:boolean;locale?:UiLocale}){
 const language=normalizeLocale(locale),t=letterReviewCopy[language];
 return <section lang={language} aria-labelledby="letter-edit-review-title"><h3 id="letter-edit-review-title">{t.region}</h3><p>{t.help}</p>{review.coverage==='token-limit'?<p role="alert">{t.limit}</p>:review.issues.map((issue,i)=><article key={issue.id}><h4>{t.kinds[issue.kind]}</h4>{issue.before&&<p>{t.before}: <q lang="">{issue.before.quote}</q> <small lang="">[{issue.before.start}, {issue.before.end})</small></p>}{issue.after&&<p>{t.after}: <q lang="">{issue.after.quote}</q> <small lang="">[{issue.after.start}, {issue.after.end})</small></p>}<label className="check"><input type="checkbox" disabled={disabled} checked={reviewed.has(issue.id)} onChange={event=>onReview(issue.id,event.target.checked)}/>{t.ack(i+1)}</label></article>)}</section>;
}
