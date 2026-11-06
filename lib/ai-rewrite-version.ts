import {z} from 'zod';
import type {Workspace,Version} from './db';
import {FactSchema,match,parseVacancy} from './engine';
import {MatchMetadataSchema,matchMetadata} from './match-config';
import {validateRewriteArchive} from './ai-rewrite-archive';
import {RewriteReceiptSchema,type RewriteReceipt} from './ai-rewrite';
import {sameJson} from './application-write-response';
export const REWRITE_VERSION_ENGINE='ai-rewrite-human-reviewed-v1',REWRITE_VERSION_TEMPLATE='ai-rewrite-reviewed-v1';
const valid=(s:string)=>s.isWellFormed()&&!s.includes('\0');
const id=z.string().min(1).max(100).refine(valid),text=(max:number)=>z.string().min(1).max(max).refine(valid);
const VersionSchema=z.strictObject({id:z.uuid(),created:z.iso.datetime(),text:text(300000),vacancy:text(30000),
 evidence_ids:z.array(id).min(1).max(12),score:z.number().int().min(0).max(100),
 evidence_snapshot:z.array(FactSchema.extend({id,source:text(500),verified:z.literal(true)}).passthrough()).min(1).max(12),
 profile_revision:z.number().int().min(0).max(2147483646),engine_version:z.literal(REWRITE_VERSION_ENGINE),template_version:z.literal(REWRITE_VERSION_TEMPLATE),
 match_metadata:MatchMetadataSchema,ai_rewrite:z.unknown(),restored_from:id.optional()});
export type ReviewedRewriteVersion=z.infer<typeof VersionSchema>;
/** Frozen historical rendering/structure, not current MAC or file authentication. */
export async function validateReviewedRewriteVersion(raw:unknown,ownerId:string){
 const version=VersionSchema.parse(raw),checked=await validateRewriteArchive(version.ai_rewrite,ownerId),source=checked.previewPayload.preview.source;
 const ids=source.facts.map(f=>f.id),snapshot=version.evidence_snapshot.map(({id,text,source,verified})=>({id,text,source,verified}));
 if(version.created!==new Date(version.created).toISOString()||version.text!==checked.payload.review.text||version.vacancy!==source.vacancy||version.profile_revision!==source.revision
  ||!sameJson(version.evidence_ids,ids)||!sameJson(snapshot,source.facts.map(({id,text,source,verified})=>({id,text,source,verified})))
  ||!sameJson(version.match_metadata,(raw as Record<string,unknown>).match_metadata))throw Error('INVALID_REWRITE_VERSION');
 if(version.restored_from===undefined){if(version.id!==checked.payload.id||version.created!==checked.archive.acceptedAt)throw Error('INVALID_REWRITE_VERSION');}
 else if(version.id===version.restored_from||Date.parse(version.created)<Date.parse(checked.archive.acceptedAt)-5000)throw Error('INVALID_REWRITE_VERSION');
 return{version,...checked};
}
export function hasRewriteVersionNamespace(raw:unknown){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;const v=raw as Record<string,unknown>;
 return Object.hasOwn(v,'ai_rewrite')||typeof v.engine_version==='string'&&v.engine_version.startsWith('ai-rewrite-')||typeof v.template_version==='string'&&v.template_version.startsWith('ai-rewrite-');
}
/** Fail the collection on corruption/unknown reserved tags; never drop/promote a
 * legacy row. Restore provenance must be an exact copy of an earlier same-owner row.
 * Not registered in workspace reads until native acceptance is independently tested.
 */
export async function validateRewriteVersionCollection(versions:Version[],ownerId:string){
 if(versions.length>100||new Set(versions.map(v=>v.id)).size!==versions.length)throw Error('INVALID_REWRITE_HISTORY');
 const previous=new Map<string,ReviewedRewriteVersion>();
 for(const raw of versions){if(!hasRewriteVersionNamespace(raw))continue;const {version}=await validateReviewedRewriteVersion(raw,ownerId);
  if(version.restored_from!==undefined){const old=previous.get(version.restored_from);if(!old||!sameJson({...version,id:null,created:null,restored_from:null},{...old,id:null,created:null,restored_from:null}))throw Error('INVALID_REWRITE_HISTORY');}
  previous.set(version.id,version);
 }
}
/** Existing rules on saved facts, not an evaluation of generated/manual text. */
export function prepareRewriteVersionScore(state:Workspace){const result=match(state.facts,parseVacancy(state.vacancy));return{score:result.score,match_metadata:matchMetadata(result.rows)};}
export async function validateRewriteVersionSaveResult(raw:unknown,previous:Workspace,submitted:RewriteReceipt,ownerId:string){
 const body=z.strictObject({format:z.literal('jobmatch-ai-rewrite-save-result-v1'),ownerId:z.literal(ownerId),workspaceRevision:z.literal(previous.revision+1),version:z.unknown()}).parse(raw);
 const checked=await validateReviewedRewriteVersion(body.version,ownerId),version=checked.version,score=prepareRewriteVersionScore(previous);
 if(previous.ownerId!==ownerId||previous.versions.length>=100||previous.versions.some(v=>v.id===version.id)||version.restored_from!==undefined
  ||version.profile_revision!==previous.revision||checked.archive.sourceOriginal!==previous.original||version.vacancy!==previous.vacancy
  ||!sameJson(checked.archive.receipt,RewriteReceiptSchema.parse(submitted))||version.score!==score.score||!sameJson(version.match_metadata,score.match_metadata)
  ||!sameJson(version.evidence_snapshot,previous.facts.filter(f=>version.evidence_ids.includes(f.id))))throw Error('INVALID_REWRITE_SAVE_RESULT');
 return{...body,version};
}
