'use client';
import {useState} from 'react';
import {proposeStructuredEntries,type StructuredProposals,type StructuredProposal} from '../lib/structured-proposals';
import {PROFILE_FIELDS} from '../lib/structured-profile';
import {structuredProfileCopy} from '../lib/i18n/structured-profile';
import {structuredProposalCopy} from '../lib/i18n/structured-proposals';
import type {UiLocale} from '../lib/i18n/locale';
type Props={source:string;disabled:boolean;hasDraft:boolean;locale:UiLocale;onAdopt:(value:StructuredProposal)=>void};
export default function StructuredProposalsPanel({source,disabled,hasDraft,locale,onAdopt}:Props){
 const [report,setReport]=useState<StructuredProposals|null>(null),t=structuredProposalCopy(locale),p=structuredProfileCopy(locale);
 return <section aria-labelledby="structured-proposals-title"><h3 id="structured-proposals-title">{t.title}</h3><p>{t.intro}</p>
 <button type="button" disabled={disabled} onClick={()=>setReport(proposeStructuredEntries(source))}>{t.run}</button>
 {report&&<><button type="button" onClick={()=>setReport(null)}>{t.close}</button><p role="status">{report.status==='unavailable'?t.unavailable:t.summary(report.candidates.length,report.rejectedBlocks,report.outsideLines)}</p>
 {report.status==='available'&&report.candidates.length===0&&<p>{t.empty}</p>}{report.limitReached&&<p role="note">{t.limit}</p>}{hasDraft&&<p role="note">{t.draft}</p>}
 {report.candidates.length>0&&<p>{t.unconfirmed}</p>}
 {report.candidates.map((candidate,index)=><article key={index} className="structured-entry"><h4>{p.kinds[candidate.kind]}</h4>
 <dl>{PROFILE_FIELDS.map(name=>candidate.fields[name]&&<div key={name}><dt>{p.fields[name]}</dt><dd><span lang="">{candidate.fields[name]!.quote}</span> <small>{p.range(candidate.fields[name]!.start,candidate.fields[name]!.end)}</small></dd></div>)}</dl>
 {candidate.warnings.map(warning=><p key={warning} role="note">{t.warnings[warning]}</p>)}
 <button type="button" disabled={disabled||hasDraft} onClick={()=>{if(!disabled&&!hasDraft)onAdopt(candidate);}}>{t.adopt(index+1)}</button></article>)}</>}
 </section>;
}
