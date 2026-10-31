import {spawn,spawnSync,type ChildProcess} from 'node:child_process';
import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {profilePreview} from '../lib/ai-profile-v2';
import {issueProfileReceipt,requiredProfileSigningConfig,verifyProfileReceipt} from '../lib/ai-profile-signing';
import {ProfileAcceptanceListSchema,validateProfileAcceptanceResult,validateProfileAcceptance,decodeProfileReceipt} from '../lib/ai-profile-acceptance';
import {validateStructuredProfile} from '../lib/structured-profile';

const OWNER='77777777-7777-4777-8777-777777777777',SESSION='99999999-9999-4999-8999-999999999999';
const OTHER='88888888-8888-4888-8888-888888888888',OTHER_SESSION='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const KEY='ab'.repeat(32); // Public synthetic fixture only; never reads a deployment key.
const SOURCE='😀 Engineer at Orbit.\r\n\r\nAnalyst at River.';
const owned=new Set<ChildProcess>();
const literal=(value:string)=>"'"+value.replace(/'/g,"''")+"'";
let database='';
function environment(){return {PATH:process.env.PATH,PGHOST:'127.0.0.1',PGPORT:'5432',PGUSER:'postgres',PGDATABASE:database,PGPASSWORD:'synthetic-ai-profile-only',PGCONNECT_TIMEOUT:'5',PGOPTIONS:'-c statement_timeout=5000 -c lock_timeout=2000'};}
const args=['-X','-qAt','-w','-v','ON_ERROR_STOP=1'];
function run(sql:string){const r=spawnSync('psql',args,{input:sql,env:environment(),encoding:'utf8',timeout:15000,maxBuffer:1024*1024});if(r.status!==0||r.error||r.stderr||r.stdout.length>512000)throw Error();return JSON.parse(r.stdout.trim());}
function asyncRun(sql:string){return new Promise<unknown>((resolve,reject)=>{
 const child=spawn('psql',args,{env:environment(),stdio:['pipe','pipe','pipe']});owned.add(child);let out='',bad=false;
 const timer=setTimeout(()=>{bad=true;child.kill('SIGKILL');},15000);
 child.stdout.on('data',chunk=>{out+=chunk;if(Buffer.byteLength(out)>512000){bad=true;child.kill('SIGKILL');}});child.stderr.on('data',()=>{bad=true;});
 child.on('error',()=>{bad=true;});child.on('close',code=>{clearTimeout(timer);owned.delete(child);if(code!==0||bad)return reject(Error());try{resolve(JSON.parse(out.trim()));}catch{reject(Error());}});child.stdin.end(sql);
 });}
function transaction(sql:string,owner=OWNER,session=SESSION,readOnly=false){return 'begin'+(readOnly?' read only':'')+';set local standard_conforming_strings=on;set local timezone=\'UTC\';set local request.jwt.claims='+literal(JSON.stringify({sub:owner,session_id:session}))+';set local role authenticated;'+sql+';commit;';}
function check(value:unknown){if(!value)throw Error();}
function call(receipt:{payload:string;signature:string},revision:number,indices=[0,1]){return 'public.accept_ai_profile_candidates(1,'+revision+','+literal(receipt.payload)+','+literal(receipt.signature)+',array['+indices.join(',')+']::integer[],\'SAVE_REVIEWED_AI_FIELDS\')';}
function denial(expression:string,tag:string,owner=OWNER,session=SESSION){
 const result=run(transaction('do $probe$begin begin perform '+expression+';raise exception \'UNEXPECTED_ACCEPT\';exception when others then if sqlerrm is distinct from '+literal(tag)+' then raise exception \'UNEXPECTED_DENIAL\';end if;end;end$probe$;select to_jsonb(true)',owner,session));check(result===true);
}
function phase(name:'guard'|'empty-fixture'|'fixture-create'|'import'|'source-check'|'preview'|'issue'|'native-save'|'rollback'|'concurrent'|'history'|'complete'){process.stdout.write('PROFILE_ACCEPTANCE_NATIVE_PHASE '+name+'\n');}
export async function main(){
 if(process.argv.length!==2||process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='kredavto/JobMatch-AI'||process.env.JOBMATCH_LOCAL_AI_PROFILE_TEST!=='1'||process.env.PGHOST!=='127.0.0.1'||process.env.PGUSER!=='postgres'||!['jobmatch_ai_profile_full','jobmatch_ai_profile_upgrade','jobmatch_ai_profile_restore'].includes(process.env.PGDATABASE??'')||process.platform!=='linux'||process.arch!=='x64'||!/^v24\./.test(process.version))throw Error();
 const mode=process.env.JOBMATCH_AI_PROFILE_NATIVE_MODE??'write-test';
 if(mode!=='write-test'&&mode!=='restore-check'||(mode==='restore-check')!==(process.env.PGDATABASE==='jobmatch_ai_profile_restore'))throw Error();
 database=process.env.PGDATABASE!;phase('guard');
 check(JSON.stringify(run("select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='auth' and table_name='users'"))==='["id"]');
 if(mode==='restore-check'){
  check(database==='jobmatch_ai_profile_restore');const key=Buffer.from(KEY,'hex'),keyId=createHash('sha256').update(key).digest('hex');let records=0,firstId='';
  for(const [owner,session,count]of [[OWNER,SESSION,2],['66666666-6666-4666-8666-666666666666','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1]] as const){
   check(run(transaction('select to_jsonb(public.ai_profile_signing_ready('+literal(keyId)+'))',owner,session,true))===true);
   const list=ProfileAcceptanceListSchema.parse(run(transaction('select public.list_ai_profile_acceptances()',owner,session,true)));check(list.ownerId===owner&&list.items.length===count);if(owner===OWNER)firstId=list.items[0].id;
   for(const item of list.items){const record=await validateProfileAcceptance(run(transaction("select coalesce(public.read_ai_profile_acceptance("+literal(item.id)+"),'null'::jsonb)",owner,session,true)),owner);const expected=createHmac('sha256',key).update('jobmatch-ai-profile-receipt-v1\n'+record.receipt.payload).digest();check(timingSafeEqual(expected,Buffer.from(record.receipt.signature,'hex')));records++;}
  }
  check(run(transaction("select coalesce(public.read_ai_profile_acceptance("+literal(firstId)+"),'null'::jsonb)",OTHER,OTHER_SESSION,true))===null);
  phase('complete');process.stdout.write('JOBMATCH_AI_PROFILE_NATIVE_RESTORE_V1 '+JSON.stringify({format:'jobmatch-ai-profile-native-restore-v1',runKind:'actual-native-postgres-dump-restore/synthetic-only',readOnly:true,verifiedHistoricalRecords:records,restoredSigningKeyReady:true,frozenSourceAndMacVerified:true,modelIdentityVerified:false,modelAcceptance:'not-accepted',providerAuth:'not-performed',providerRestore:'not-performed'})+'\n');return;
 }
 phase('empty-fixture');check(database!=='jobmatch_ai_profile_restore');
 check(run('select count(*) from private.ai_profile_signing_config')===0);check(run('select count(*) from auth.users where id in('+literal(OWNER)+','+literal(OTHER)+')')===0);
 phase('fixture-create');run("begin;insert into auth.users values("+literal(OWNER)+"),("+literal(OTHER)+");insert into auth.sessions(id,user_id) values("+literal(SESSION)+","+literal(OWNER)+"),("+literal(OTHER_SESSION)+","+literal(OTHER)+");insert into private.ai_profile_signing_config values(true,decode(repeat('ab',32),'hex'));select to_jsonb(true);commit;");
 phase('import');run(transaction('select public.apply_workspace_command(0,jsonb_build_object(\'action\',\'import\',\'text\','+('convert_from(decode('+literal(Buffer.from(SOURCE,'utf8').toString('hex'))+',\'hex\'),\'UTF8\')')+'))'));
 const current=()=>validateStructuredProfile(run(transaction('select public.read_structured_profile()')),OWNER,1);
 phase('source-check');const initial=current();check(initial.source_original===SOURCE&&initial.revision===0);
 Object.assign(process.env,{JOBMATCH_AI_PROFILE_ACCEPTANCE_ENABLED:'true',JOBMATCH_AI_PROFILE_SIGNING_SECRET:KEY});
 const config=requiredProfileSigningConfig(),fields=(title:string,organization:string)=>({title,organization,start:null,end:null,description:null,credential:null});
 phase('preview');const preview=profilePreview({entries:[{blockId:0,kind:'employment',fields:fields('Engineer','Orbit')},{blockId:1,kind:'employment',fields:fields('Analyst','River')}]},SOURCE,{model:'synthetic-native-fixture',operatorDeclaredModelDigest:'sha256:'+'c'.repeat(64),modelIdentityVerified:false});
 phase('issue');check(run(transaction('select to_jsonb(public.ai_profile_signing_ready('+literal(config.keyId)+'))'))===true);
 const receipt=issueProfileReceipt(initial,preview,config);verifyProfileReceipt(receipt,OWNER,config);
 denial(call({...receipt,signature:'0'.repeat(64)},0),'AI_PROFILE_RECEIPT_INVALID');check(current().revision===0);
 phase('native-save');const accepted=await validateProfileAcceptanceResult(run(transaction('select '+call(receipt,0))),OWNER,1,0,receipt,[0,1]);
 check(accepted.profile.revision===2&&accepted.profile.entries.length===2&&accepted.profile.entries.every(entry=>!entry.confirmed));
 verifyProfileReceipt(accepted.record.receipt,OWNER,config);check(run(transaction("select (public.read_workspace()->>'revision')::integer"))===1);
 denial(call(receipt,0),'CONFLICT');
 phase('rollback');const next=issueProfileReceipt(current(),preview,config),malformed=decodeProfileReceipt(next);malformed.preview.candidates[1].fields.title!.start=0;
 const payload=JSON.stringify(malformed),invalid={payload,signature:createHmac('sha256',config.key).update('jobmatch-ai-profile-receipt-v1\n'+payload).digest('hex')};
 denial(call(invalid,2),'INVALID_WRITE');check(current().revision===2&&current().entries.length===2);check(run(transaction('select count(*) from public.ai_profile_acceptances'))===1);
 phase('concurrent');const proposal=issueProfileReceipt(current(),preview,config);
 const sql=transaction('do $race$begin perform '+call(proposal,2,[0])+';perform set_config(\'jobmatch.probe_status\',\'saved\',true);exception when others then if sqlerrm=\'CONFLICT\' then perform set_config(\'jobmatch.probe_status\',\'conflict\',true);else raise exception \'PROBE_CONCURRENCY_FAILED\';end if;end$race$;select to_jsonb(current_setting(\'jobmatch.probe_status\'))');
 const results=await Promise.all(Array.from({length:20},()=>asyncRun(sql)));
 check(results.filter(x=>x==='saved').length===1&&results.filter(x=>x==='conflict').length===19);check(current().revision===3&&current().entries.length===3&&current().entries.every(entry=>!entry.confirmed));
 check(run(transaction('select count(*) from public.ai_profile_acceptances'))===2);
 phase('history');const read=run(transaction("select coalesce(public.read_ai_profile_acceptance("+literal(accepted.record.id)+"),'null'::jsonb)"));await validateProfileAcceptance(read,OWNER);
 check(run(transaction("select coalesce(public.read_ai_profile_acceptance("+literal(accepted.record.id)+"),'null'::jsonb)",OTHER,OTHER_SESSION))===null);
 const row=run('begin;update private.ai_profile_signing_config set signing_key=decode(repeat(\'cd\',32),\'hex\');select to_jsonb(true);commit;');check(row===true);
 await validateProfileAcceptance(run(transaction("select coalesce(public.read_ai_profile_acceptance("+literal(accepted.record.id)+"),'null'::jsonb)")),OWNER);
 denial(call(issueProfileReceipt(current(),preview,config),3),'AI_PROFILE_RECEIPT_INVALID');
 run("begin;update private.ai_profile_signing_config set signing_key=decode(repeat('ab',32),'hex');select to_jsonb(true);commit;");
 phase('complete');process.stdout.write('JOBMATCH_AI_PROFILE_NATIVE_V1 '+JSON.stringify({format:'jobmatch-ai-profile-native-v1',runKind:'actual-native-postgres/synthetic-auth-and-source-only',nodeIssuer:true,macVerifiedByPostgres:true,unicodeAndCrlfOffsets:true,batchRecords:2,concurrentWriters:20,concurrentCommits:1,concurrentConflicts:19,partialBatchRolledBack:true,replayRefused:true,crossOwnerReadRefused:true,keyRotationRefusedPending:true,historicalReadAfterRotation:true,profileRevision:3,unconfirmedRecords:3,workspaceRevision:1,modelIdentityVerified:false,modelAcceptance:'not-accepted',providerAuth:'not-performed',providerRestore:'not-performed',userData:'not-used'})+'\n');
}
if(require.main===module)main().catch(()=>{for(const child of owned)child.kill('SIGKILL');process.stderr.write('Native profile acceptance probe refused or incomplete; no credentials, SQL diagnostics or row data emitted.\n');process.exitCode=2;});
