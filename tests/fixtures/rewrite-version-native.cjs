/* Owned synthetic signature/codec bridge. No Auth/model/database network call. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
if(process.env.JOBMATCH_LOCAL_REWRITE_VERSIONS!=='1'||process.env.JOBMATCH_LOCAL_SOURCE_VERSIONS!=='1'||!['127.0.0.1','::1'].includes(process.env.PGHOST)||!/^jobmatch_source_versions_[a-f0-9]{32}$/.test(process.env.PGDATABASE??'')||['PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS'].some(k=>process.env[k]))throw Error('OWNED_REWRITE_FIXTURE_REQUIRED');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText,file);
const {reviewedVersionFixture}=require('./rewrite-version.ts'),{validateReviewedRewriteVersion,validateRewriteVersionCollection,validateRewriteVersionSaveResult}=require('../../lib/ai-rewrite-version.ts'),{verifyRewriteReviewReceipt}=require('../../lib/ai-rewrite-review-signing.ts');
(async()=>{const [input,output]=process.argv.slice(2);let operation='startup';try{
 const stat=fs.statSync(input);assert.ok(stat.isFile()&&stat.size<=20*1024*1024);const value=JSON.parse(fs.readFileSync(input,'utf8'));let result;
 if(['issue','verify-current','record','collection','ack'].includes(value.op))operation=value.op;
 if(value.op==='issue'){
  const now=Date.now;assert.ok(Number.isSafeInteger(value.clockOffset??0)&&Math.abs(value.clockOffset??0)<=601);const fixed=now()+(value.clockOffset??0)*1000;Date.now=()=>fixed;
  try{const f=await reviewedVersionFixture(value.state,value.options);await verifyRewriteReviewReceipt(f.state.ownerId,f.state,f.receipt,f.config);result={receipt:f.receipt,keyId:f.config.signing.keyId,configurationId:f.config.configurationId,score:f.row.score,match_metadata:f.row.match_metadata,review:f.review};}finally{Date.now=now;}
 }else if(value.op==='verify-current'){
  const key=Buffer.from('ab'.repeat(32),'hex');await verifyRewriteReviewReceipt(value.state.ownerId,value.state,value.receipt,{signing:{key,keyId:createHash('sha256').update(key).digest('hex')},configurationId:'34'.repeat(32)});result={valid:true};
 }else if(value.op==='record'){
  const checked=await validateReviewedRewriteVersion(value.record,value.ownerId);result={valid:true,text:checked.version.text,acceptedAt:checked.archive.acceptedAt};
 }else if(value.op==='collection'){await validateRewriteVersionCollection(value.versions,value.ownerId);result={valid:true,count:value.versions.length};}
 else if(value.op==='ack'){await validateRewriteVersionSaveResult(value.result,value.previous,value.receipt,value.ownerId);result={valid:true};}
 else throw Error('UNSUPPORTED_FIXTURE_OPERATION');
 fs.writeFileSync(output,JSON.stringify(result),{flag:'wx',mode:0o600});
 }catch(error){process.exitCode=2;const known=['INVALID_REWRITE_SAVE_RESULT','INVALID_REWRITE_VERSION','INVALID_REWRITE_ARCHIVE','INVALID_REWRITE_REVIEW_RECEIPT','REWRITE_SOURCE_INVALID','REWRITE_PREVIEW_INVALID','REWRITE_REVIEW_INVALID','REWRITE_CLAIMS_INVALID','REWRITE_REVIEW_LIMIT'];const code=known.includes(error?.message)?error.message:error?.name==='ZodError'?'ZOD_STRUCTURE':'FIXTURE_OPERATION_REFUSED';console.error('FAIL: owned rewrite fixture op='+operation+' code='+code);}
})();
