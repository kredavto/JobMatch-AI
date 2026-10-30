'use client';
import {type Fact,type Match} from '../lib/engine';
import {unverifiedCandidates} from '../lib/requirement-evidence';
type Props={row:Match;facts:Fact[];disabled:boolean;onConfirm:(id:string)=>Promise<void>;onProfile:()=>void};
export default function RequirementEvidence({row,facts,disabled,onConfirm,onProfile}:Props){
 const evidence=facts.filter(fact=>row.evidence_ids.includes(fact.id));
 const candidates=unverifiedCandidates(facts,row.requirement);
 return <div>
  {evidence.map(fact=><p key={fact.id}>{fact.text}<small>{fact.id} · {fact.source} · Подтверждено пользователем</small></p>)}
  <small>{row.reason}</small>
  {candidates.length>0&&<details><summary>Найдено в резюме, но не подтверждено ({candidates.length})</summary>
   <p>Это возможная связь по терминам, а не доказательство всего требования. Подтверждайте только правдивую строку целиком. Исходный текст не меняется.</p>
   {candidates.map(fact=><div className="card" key={fact.id}><p>{fact.text}</p><small>{fact.id} · {fact.source} · Не подтверждено</small><button disabled={disabled} aria-label={'Подтвердить факт '+fact.id} onClick={()=>void onConfirm(fact.id)}>Подтверждаю весь факт</button></div>)}
  </details>}
  {row.status!=='matched'&&<button className="ghost" disabled={disabled} onClick={onProfile}>Уточнить опыт в профиле</button>}
 </div>;
}
