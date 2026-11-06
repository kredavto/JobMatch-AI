import {createHash} from 'node:crypto';
import type {Workspace} from '../../lib/db';
import {rewriteState} from './rewrite-review';
import {makeRewritePreview,prepareRewriteSource,type RewriteLocale} from '../../lib/ai-rewrite';
import {issueRewriteReceipt} from '../../lib/ai-rewrite-signing';
import {issueRewriteReviewReceipt} from '../../lib/ai-rewrite-review-signing';
import {prepareRewriteReview} from '../../lib/ai-rewrite-review';
import {rewriteArchiveReceiptSha256,REWRITE_ARCHIVE_FORMAT} from '../../lib/ai-rewrite-archive';
import {prepareRewriteVersionScore,REWRITE_VERSION_ENGINE,REWRITE_VERSION_TEMPLATE} from '../../lib/ai-rewrite-version';
/** Public authored responses/key/acceptedAt assertion. Never a DB/model acceptance. */
export async function reviewedVersionFixture(state:Workspace=rewriteState(),options:{configurationId?:string;language?:RewriteLocale;action?:'keep-source'|'accept-proposal'|'edit';refused?:boolean;manual?:string;ids?:string[]}={}){
 const key=Buffer.from('ab'.repeat(32),'hex'),config={signing:{key,keyId:createHash('sha256').update(key).digest('hex')},configurationId:options.configurationId??'34'.repeat(32)},ids=options.ids??state.facts.filter(f=>f.verified).map(f=>f.id);
 const source=await prepareRewriteSource(state,state.ownerId!,ids),preview=await makeRewritePreview(source,options.language??'en','public-unaccepted-fixture',{claims:source.facts.map(f=>options.refused?{fact_id:f.id,status:'refused',text:null}:{fact_id:f.id,status:'proposed',text:'Documented '+f.text})},state.original,config.configurationId),previewReceipt=await issueRewriteReceipt(state.ownerId!,state,preview,config.signing);
 const decisions=source.facts.map((f,i)=>({fact_id:f.id,reviewed:true,action:i===0?(options.action??'edit'):'keep-source',...(i===0&&(options.action??'edit')==='edit'?{text:options.manual??'Manually documented '+f.text}:{})}));
 const review=await prepareRewriteReview(preview,state.original,decisions),confirmation={consent:true,reviewed:true,decisions,acknowledgedReviewSha256:review.reviewSha256,acknowledgedIssueIds:review.issues.map(i=>i.id)},receipt=await issueRewriteReviewReceipt(state.ownerId!,state,previewReceipt,confirmation,config),payload=JSON.parse(receipt.payload),created=new Date(payload.issuedAt*1000+125).toISOString();
 const archive={format:REWRITE_ARCHIVE_FORMAT,ownerId:state.ownerId!,acceptedAt:created,sourceOriginal:state.original,receipt,receiptSha256:await rewriteArchiveReceiptSha256(receipt),sourceVerification:'current-at-storage-acceptance',receiptSignature:'verified-at-storage-acceptance',storageConsent:'STORE_REVIEWED_AI_REWRITE',contentReview:'user-declared-only',semanticAssessment:'not-performed',modelAcceptance:'not-accepted'};
 const row={id:payload.id,created,text:review.text,vacancy:state.vacancy,evidence_ids:source.facts.map(f=>f.id),evidence_snapshot:state.facts.filter(f=>ids.includes(f.id)),profile_revision:state.revision,engine_version:REWRITE_VERSION_ENGINE,template_version:REWRITE_VERSION_TEMPLATE,...prepareRewriteVersionScore(state),ai_rewrite:archive};
 return{state,config,preview,previewReceipt,review,confirmation,receipt,payload,archive,row,result:{format:'jobmatch-ai-rewrite-save-result-v1',ownerId:state.ownerId!,workspaceRevision:state.revision+1,version:row}};
}
