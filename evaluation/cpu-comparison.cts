import {createHash} from 'node:crypto';
import {constants,openSync,closeSync,readSync,fstatSync,lstatSync,realpathSync} from 'node:fs';
import {isAbsolute,join,basename,dirname} from 'node:path';
import {z} from 'zod';
import {AI_FAILURE_STAGES} from '../lib/ai-diagnostics';
import {AI_LINK_AUDIT_VERSION} from '../lib/ai-link-audit';
import {aiPromptForQuoteContract} from '../lib/ai-prompt';
import {CORPUS_VERSION,evaluationCorpus} from './corpus';
import {approvedCpuEnvironment,validateCpuPin,validateCpuEvaluationDiagnostics,CPU_LICENSE_SHA,type CpuModelSlot} from './cpu-diagnostic.cjs';

const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const digest=z.string().regex(/^[a-f0-9]{64}$/),image=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const count=z.number().int().min(0).max(28),amount=z.number().int().min(0).max(100000);
const prompt=aiPromptForQuoteContract('source-lines-v1');
const sourceCases=new Map(evaluationCorpus.map(row=>[row.id,row]));
const rowCommon={id:z.string().max(100),language:z.enum(['ru','en']),category:z.string().max(100),durationMs:z.number().int().min(0).max(750000)};
const row=z.discriminatedUnion('status',[
 z.object({...rowCommon,status:z.literal('graded'),passed:z.boolean(),missingRequirements:amount,unexpectedRequirements:amount,missingLinks:amount,unsupportedLinks:amount}).strict(),
 z.object({...rowCommon,status:z.literal('error'),passed:z.literal(false),failureStage:z.enum(AI_FAILURE_STAGES)}).strict(),
]);
const evaluation=z.object({
 schemaVersion:z.literal(4),linkAudit:z.unknown(),quoteContractVersion:z.literal('source-lines-v1'),diagnosticFormat:z.literal('ai-failure-stages-v1'),
 failureStageCounts:z.record(z.enum(AI_FAILURE_STAGES),count),runKind:z.literal('operator-configured-endpoint'),
 startedAt:z.iso.datetime(),finishedAt:z.iso.datetime(),corpusVersion:z.literal(CORPUS_VERSION),corpusSha256:z.literal(hash(JSON.stringify(evaluationCorpus))),
 promptVersion:z.literal(prompt.version),promptSha256:z.literal(hash(prompt.text)),model:z.string().max(100),operatorDeclaredModelDigest:z.string().max(100),
 modelIdentityVerified:z.literal(false),semanticAcceptance:z.literal('synthetic-exact-gold-only'),complete:z.literal(true),passed:z.boolean(),planned:z.literal(28),completed:z.literal(28),errors:count,rows:z.array(row).length(28),
}).strict();
const outer=z.object({
 format:z.literal('jobmatch-cpu-diagnostic-v4'),linkAuditVersion:z.literal(AI_LINK_AUDIT_VERSION),quoteContractVersion:z.literal('source-lines-v1'),
 runKind:z.literal('actual-local-cpu-inference/synthetic-only'),startedAt:z.iso.datetime(),finishedAt:z.iso.datetime(),pin:z.unknown(),
 weightsFileVerified:z.literal(true),executionBinding:z.literal('readonly-file-and-owned-local-process'),deploymentIdentityVerified:z.literal(false),acceptance:z.literal('not-accepted'),
 containerImageId:image,llamaBinarySha256:digest,licenseFileSha256:z.literal(CPU_LICENSE_SHA),
 runtime:z.object({node:z.string().regex(/^v24\.\d+\.\d+$/),architecture:z.literal('x64'),cpu:z.string().min(1).max(200)}).strict(),
 bridge:z.object({acceptedRequests:z.literal(28),backendResponses:z.literal(28),generatedTokens:z.number().int().min(1).max(28*2056),stopped:count,limited:count,transportFailures:z.literal(0),rejectedRequests:z.literal(0)}).strict(),
 diagnosticQuality:z.enum(['synthetic-exact-gold-passed','synthetic-provider-or-contract-errors','synthetic-quality-mismatch']),evaluatorExitCode:z.union([z.literal(0),z.literal(1),z.literal(2)]),evaluation,
}).strict();
// A completed evaluator can contain a real failed backend request. Validate that
// outcome separately; it must never receive the complete comparison envelope.
const attempt=outer.extend({bridge:z.object({acceptedRequests:z.literal(28),backendResponses:count.refine(n=>n>0),generatedTokens:z.number().int().min(1).max(28*2056),stopped:count,limited:count,transportFailures:count,rejectedRequests:z.literal(0)}).strict()});

function normalize(value:unknown,slot:CpuModelSlot,complete=true){
 const report=(complete?outer:attempt).parse(value),pin=validateCpuPin(report.pin,slot),result=report.evaluation;
 validateCpuEvaluationDiagnostics(result,'source-lines-v1',true);
 if(result.model!==pin.modelAlias||result.operatorDeclaredModelDigest!=='sha256:'+pin.sha256
  ||report.bridge.stopped+report.bridge.limited!==report.bridge.backendResponses
  ||report.bridge.backendResponses+report.bridge.transportFailures!==28
  ||report.bridge.generatedTokens<report.bridge.backendResponses||report.bridge.generatedTokens>report.bridge.backendResponses*2056)throw Error();
 if(new Set(result.rows.map(row=>row.id)).size!==28)throw Error();
 if(result.rows.some((row,index)=>row.id!==evaluationCorpus[index].id))throw Error();
 for(const row of result.rows){
  const source=sourceCases.get(row.id);if(!source||source.language!==row.language||source.category!==row.category)throw Error();
  if(row.status==='graded'&&row.passed!==(row.missingRequirements+row.unexpectedRequirements+row.missingLinks+row.unsupportedLinks===0))throw Error();
 }
 const passed=result.rows.filter(row=>row.passed).length,errors=result.rows.filter(row=>row.status==='error').length,mismatches=28-passed-errors;
 const operationalErrors=result.rows.filter(row=>row.status==='error'&&['transport','http-status-or-type','body-read','cancelled','timeout'].includes(row.failureStage)).length;
 if(operationalErrors<report.bridge.transportFailures)throw Error();
 if(errors!==result.errors||errors<report.bridge.transportFailures||result.passed!==(passed===28)||report.evaluatorExitCode!==(errors?2:passed===28?0:1))throw Error();
 if(report.diagnosticQuality!==(passed===28?'synthetic-exact-gold-passed':errors?'synthetic-provider-or-contract-errors':'synthetic-quality-mismatch'))throw Error();
 const start=Date.parse(report.startedAt),finish=Date.parse(report.finishedAt),evalStart=Date.parse(result.startedAt),evalFinish=Date.parse(result.finishedAt);
 if(![start,finish,evalStart,evalFinish].every(Number.isFinite)||finish<start||finish-start>900000||evalStart<start||evalFinish>finish||evalFinish<evalStart)throw Error();
 const byLanguage=Object.fromEntries(['ru','en'].map(language=>{
  const rows=result.rows.filter(row=>row.language===language);return [language,{cases:rows.length,passed:rows.filter(row=>row.passed).length,errors:rows.filter(row=>row.status==='error').length,mismatches:rows.filter(row=>row.status==='graded'&&!row.passed).length}];
 }));
 // Only fixed corpus labels, validated counters and reviewed public pins survive normalization.
 const safe={slot,pin,startedAt:report.startedAt,finishedAt:report.finishedAt,counts:{cases:28,passed,errors,mismatches},byLanguage,
  bridge:report.bridge,evaluatorExitCode:report.evaluatorExitCode,diagnosticQuality:report.diagnosticQuality,
  failureStageCounts:result.failureStageCounts,cases:evaluationCorpus.map(source=>result.rows.find(row=>row.id===source.id)!),
 };
 return {report,safe,start,finish};
}

function sameControls(a:ReturnType<typeof normalize>,b:ReturnType<typeof normalize>){
 if(a.report.containerImageId!==b.report.containerImageId||a.report.llamaBinarySha256!==b.report.llamaBinarySha256
  ||a.report.runtime.node!==b.report.runtime.node||a.report.runtime.architecture!==b.report.runtime.architecture||a.report.runtime.cpu!==b.report.runtime.cpu||a.finish>b.start)throw Error();
}

/** Validate agreement of two reports, not remote attestation or independent model acceptance. */
export function compareCpuReports(baseline:unknown,candidate:unknown){
 try{
  const a=normalize(baseline,'baseline'),b=normalize(candidate,'candidate');
  sameControls(a,b);
  return {format:'jobmatch-cpu-comparison-v1',runKind:'two-actual-local-cpu-diagnostics/synthetic-only',acceptance:'not-accepted',independentHeldOut:'not-performed',deploymentIdentityVerified:false,
   executionBinding:'one-job-workflow-and-equal-reported-image-binary-runtime',remoteAttestation:'not-performed',
   control:{containerImageId:a.report.containerImageId,llamaBinarySha256:a.report.llamaBinarySha256,licenseFileSha256:CPU_LICENSE_SHA,node:a.report.runtime.node,architecture:a.report.runtime.architecture,cpuDescriptionSha256:hash(a.report.runtime.cpu),
    corpusVersion:CORPUS_VERSION,corpusSha256:hash(JSON.stringify(evaluationCorpus)),promptVersion:prompt.version,promptSha256:hash(prompt.text),quoteContractVersion:'source-lines-v1',linkAuditVersion:AI_LINK_AUDIT_VERSION,context:4096,threads:4,temperature:0,maxTokens:2048,seed:42},
   baseline:a.safe,candidate:b.safe,deltas:{passed:b.safe.counts.passed-a.safe.counts.passed,errors:b.safe.counts.errors-a.safe.counts.errors,mismatches:b.safe.counts.mismatches-a.safe.counts.mismatches,generatedTokens:b.safe.bridge.generatedTokens-a.safe.bridge.generatedTokens},
   limitations:['known-synthetic-gold','one-sequential-run-per-model','no-semantic-adjudication','no-representative-held-out','no-production-deployment-acceptance'],
  };
 }catch{throw Error('CPU comparison refused or inconsistent');}
}

/** A coherent unsuccessful experiment is evidence of a limitation, not a comparison. */
export function assessCpuComparison(baseline:unknown,candidate:unknown){
 try{
  const a=normalize(baseline,'baseline',false),b=normalize(candidate,'candidate',false);sameControls(a,b);
  if(a.report.bridge.backendResponses===28&&b.report.bridge.backendResponses===28)return compareCpuReports(baseline,candidate);
  return {format:'jobmatch-cpu-comparison-attempt-v1',runKind:'two-actual-local-cpu-attempts/synthetic-only',comparisonStatus:'not-comparable',reason:'incomplete-backend-responses',operationalComparisonComplete:false,
   acceptance:'not-accepted',independentHeldOut:'not-performed',deploymentIdentityVerified:false,remoteAttestation:'not-performed',
   executionBinding:'one-job-workflow-and-equal-reported-image-binary-runtime',
   control:{containerImageId:a.report.containerImageId,llamaBinarySha256:a.report.llamaBinarySha256,licenseFileSha256:CPU_LICENSE_SHA,node:a.report.runtime.node,architecture:a.report.runtime.architecture,cpuDescriptionSha256:hash(a.report.runtime.cpu),
    corpusVersion:CORPUS_VERSION,corpusSha256:hash(JSON.stringify(evaluationCorpus)),promptVersion:prompt.version,promptSha256:hash(prompt.text),quoteContractVersion:'source-lines-v1',linkAuditVersion:AI_LINK_AUDIT_VERSION,context:4096,threads:4,temperature:0,maxTokens:2048,seed:42},
   baseline:a.safe,candidate:b.safe,
   limitations:['incomplete-backend-responses','no-quality-delta','known-synthetic-gold','one-sequential-run-per-model','no-semantic-adjudication','no-representative-held-out','no-production-deployment-acceptance'],
  };
 }catch{throw Error('CPU comparison refused or inconsistent');}
}

const phases=['pin','weights','binary','server-start','server-ready','evaluate','evaluation-returned','report'];
export function parseCpuTranscript(text:string){
 try{
  if(Buffer.byteLength(text)>4*1024*1024||!text.endsWith('\n'))throw Error();
  const lines=text.split('\n');lines.pop();
  if(lines.length!==9||phases.some((phase,i)=>lines[i]!=='CPU_DIAGNOSTIC_PHASE '+phase)||!lines[8].startsWith('JOBMATCH_CPU_DIAGNOSTIC_V4 '))throw Error();
  return JSON.parse(lines[8].slice('JOBMATCH_CPU_DIAGNOSTIC_V4 '.length));
 }catch{throw Error('CPU transcript refused or incomplete');}
}

function readOwnedReport(path:string){
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{
  const before=fstatSync(fd),limit=4*1024*1024;
  if(!before.isFile()||before.nlink!==1||before.uid!==process.getuid?.()||(before.mode&0o077)!==0||before.size>limit)throw Error();
  const buffer=Buffer.alloc(limit+1);let size=0;
  while(size<buffer.length){const n=readSync(fd,buffer,size,buffer.length-size,null);if(!n)break;size+=n;}
  const after=fstatSync(fd);
  if(size!==before.size||size>limit||after.size!==before.size||after.mtimeMs!==before.mtimeMs)throw Error();
  return parseCpuTranscript(new TextDecoder('utf8',{fatal:true}).decode(buffer.subarray(0,size)));
 }finally{closeSync(fd);}
}

export function main(){
 try{
  if(!approvedCpuEnvironment(process.env)||process.platform!=='linux'||process.argv.length!==2
   ||!process.env.RUNNER_TEMP||!isAbsolute(process.env.RUNNER_TEMP)||!/^\d{1,20}$/.test(process.env.GITHUB_RUN_ID??'')
   ||!process.env.JOBMATCH_CPU_COMPARISON_ROOT||!isAbsolute(process.env.JOBMATCH_CPU_COMPARISON_ROOT))throw Error();
  const root=process.env.JOBMATCH_CPU_COMPARISON_ROOT,stat=lstatSync(root);
  if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid?.()||(stat.mode&0o077)!==0
   ||realpathSync(root)!==root||dirname(root)!==realpathSync(process.env.RUNNER_TEMP)||!/^jobmatch-cpu-comparison\.[A-Za-z0-9]{8}$/.test(basename(root)))throw Error();
  const baseline=readOwnedReport(join(root,'baseline.log'));
  const candidate=readOwnedReport(join(root,'candidate.log'));
  const report=assessCpuComparison(baseline,candidate);
  const prefix=report.format==='jobmatch-cpu-comparison-v1'?'JOBMATCH_CPU_COMPARISON_V1 ':'JOBMATCH_CPU_COMPARISON_ATTEMPT_V1 ';
  process.stdout.write(prefix+JSON.stringify({...report,workflow:{repository:'kredavto/JobMatch-AI',runId:process.env.GITHUB_RUN_ID}})+'\n');
  return 0;
 }catch{process.stderr.write('CPU comparison refused or incomplete; no input paths or diagnostics emitted.\n');return 2;}
}
if(require.main===module)process.exitCode=main();
