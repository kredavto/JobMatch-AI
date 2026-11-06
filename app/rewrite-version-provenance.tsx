'use client';
import {useEffect,useState} from 'react';
import type {Version} from '../lib/db';
import {validateReviewedRewriteVersion} from '../lib/ai-rewrite-version';
import {rewriteStorageCopy} from '../lib/i18n/ai-rewrite-storage';
import type {UiLocale} from '../lib/i18n/locale';
type Checked=Awaited<ReturnType<typeof validateReviewedRewriteVersion>>;
/** Read-response consistency, not verification of an imported file or current MAC. */
export default function RewriteVersionProvenance({version,ownerId,locale}:{version:Version;ownerId?:string;locale:UiLocale}){
 const t=rewriteStorageCopy[locale],[result,setResult]=useState<{version:Version;ownerId:string;value:Checked|null}|null>(null);
 useEffect(()=>{if(!ownerId)return;let live=true;void validateReviewedRewriteVersion(version,ownerId).then(value=>{if(live)setResult({version,ownerId,value});}).catch(()=>{if(live)setResult({version,ownerId,value:null});});return()=>{live=false;};},[version,ownerId]);
 const checked=result?.version===version&&result.ownerId===ownerId?result.value:null;
 return <section aria-label={t.provenance} data-rewrite-provenance=""><h3>{t.provenance}</h3><p>{t.notAccepted}</p><p>{t.scoreHelp}</p><p>{t.userDeclared}</p>
 {!checked?<p role="status">{t.metadataUnavailable}</p>:<><ul>{checked.payload.review.rows.map(row=><li key={row.fact_id}><span lang="">{row.fact_id}</span>: {row.origin==='source'?t.source:row.origin==='manual'?t.manual:t.model}</li>)}</ul><details><summary>{t.original}</summary><pre lang="">{checked.archive.sourceOriginal}</pre></details><p>{t.acceptedAt}: <time dateTime={checked.archive.acceptedAt}>{checked.archive.acceptedAt}</time></p><p>{t.lexicalOnly}</p></>}
 </section>;
}
