'use client';
import type {Fact,Match} from '../lib/engine';
import {unverifiedCandidates} from '../lib/requirement-evidence';
import {ruleReason} from '../lib/i18n/editor';
import {requirementEvidenceCopy} from '../lib/i18n/requirement-evidence';
import {normalizeLocale,type UiLocale} from '../lib/i18n/locale';
type Props={locale?:UiLocale;row:Match;facts:Fact[];disabled:boolean;onConfirm?:(factId:string,requirementId:string)=>Promise<void>;onProfile:()=>void};
export default function RequirementEvidence({locale:requestedLocale='ru',row,facts,disabled,onConfirm,onProfile}:Props){
 const locale=normalizeLocale(requestedLocale),t=requirementEvidenceCopy[locale],reason=ruleReason(row.reason,locale);
 const evidence=facts.filter(fact=>row.evidence_ids.includes(fact.id));
 const candidates=unverifiedCandidates(facts,row.requirement);
 return <div>
  {evidence.map(fact=><p key={fact.id}><span lang="">{fact.text}</span><small><span lang="">{fact.id} · {fact.source}</span> · {t.confirmed}</small></p>)}
  <small lang={reason.catalogued?locale:''}>{reason.text}</small>
  {candidates.length>0&&<details><summary>{t.candidates(candidates.length)}</summary>
   <p>{t.help}</p>{!onConfirm&&<p>{t.ownerHelp}</p>}
   {candidates.map(fact=><div className="card" key={fact.id}><p lang="">{fact.text}</p><small><span lang="">{fact.id} · {fact.source}</span> · {t.unconfirmed}</small><button disabled={disabled||!onConfirm} aria-label={t.confirmLabel(fact.id,row.requirement.id)} onClick={()=>{if(!disabled)void onConfirm?.(fact.id,row.requirement.id);}}>{t.confirm}</button></div>)}
  </details>}
  {row.status!=='matched'&&<button className="ghost" disabled={disabled} onClick={onProfile}>{t.clarify}</button>}
 </div>;
}
