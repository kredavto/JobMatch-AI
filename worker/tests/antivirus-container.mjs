import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {setTimeout as pause} from 'node:timers/promises';
if(process.env.JOBMATCH_ANTIVIRUS_CONTAINER_TEST!=='1')throw Error('Explicit synthetic test opt-in required');
const exec=promisify(execFile),prefix='jobmatch_av_'+randomBytes(6).toString('hex'),containers=[],networks=[],token=randomBytes(32).toString('hex');
const keys=generateKeyPairSync('ed25519'),publicKey=keys.publicKey.export({type:'spki',format:'pem'}),directory=await mkdtemp(join(tmpdir(),'jobmatch-av-'));
let failed=false,stage='setup',root='';
async function docker(args,timeout=30000){try{return(await exec('docker',args,{timeout,maxBuffer:1000000})).stdout.trim();}catch{throw Error('Synthetic container operation failed');}}
async function network(suffix,internal=true){const name=prefix+'_'+suffix;networks.push(name);await docker(['network','create',...(internal?['--internal']:[]),name]);return name;}
function limits(memory,pids='64',cpu='1'){return['--memory',memory,'--memory-swap',memory,'--cpus',cpu,'--pids-limit',pids,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--ulimit','core=0','--tmpfs','/tmp:rw,noexec,nosuid,size=64m,mode=1777'];}
async function run(suffix,args){const name=prefix+'_'+suffix;containers.push(name);await docker(['run','-d','--name',name,...args]);return name;}
async function inspect(name){return JSON.parse(await docker(['inspect',name]))[0];}
async function ready(){const deadline=Date.now()+120000;while(Date.now()<deadline){try{const res=await fetch(root+'/health',{signal:AbortSignal.timeout(1500)});if(res.ok)return;}catch{}await pause(500);}throw Error('Synthetic readiness deadline');}
async function request(text){const response=await fetch(root+'/extract',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream','X-File-Extension':'txt'},body:text,signal:AbortSignal.timeout(20000)});return{status:response.status,body:await response.json()};}
try{
 const scannerNet=await network('scanner'),parserNet=await network('parser'),observerNet=await network('observer'),ingress=await network('ingress',false);
 const keyFile=join(directory,'observer-key');await writeFile(keyFile,keys.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o444});
 stage='real scanner startup';const scanner=await run('scanner',['--network',scannerNet,'--network-alias','scanner',...limits('4g'),'-e','TZ=UTC','jobmatch-scanner:test']);
 stage='observer startup';const observer=await run('observer',['--network',scannerNet,...limits('128m','32','0.25'),'--user','10001:10001','--mount','type=bind,source='+keyFile+',target=/run/secrets/scanner_observer_key,readonly','-e','SCANNER_TIMEZONE_UTC_CONFIRMED=true','-e','SCANNER_ALLOWED_ENGINES=1.4.6','jobmatch-parser:test','node','--disable-sigusr1','--max-old-space-size=64','compiled/worker/scanner-observer.cjs']);await docker(['network','connect','--alias','scanner-observer',observerNet,observer]);
 stage='gateway startup';const gateway=await run('gateway',['--network',ingress,...limits('128m','32','0.25'),'--user','10001:10001','-p','127.0.0.1::8080','-e','PARSER_WORKER_TOKEN='+token,'-e','PARSER_SCAN_MODE=required','-e','PARSER_SCANNER_PUBLIC_KEY='+publicKey,'-e','PARSER_SCANNER_ENGINES=1.4.6','jobmatch-parser:test','node','--disable-sigusr1','--max-old-space-size=64','compiled/worker/gateway.cjs']);await docker(['network','connect',parserNet,gateway]);await docker(['network','connect',scannerNet,gateway]);await docker(['network','connect',observerNet,gateway]);root='http://'+await docker(['port',gateway,'8080/tcp']);
 const parser=await run('parser',['--network',parserNet,'--network-alias','parser',...limits('512m'),'--user','10001:10001','jobmatch-parser:test']);
 stage='real signed scanner readiness';await ready();
 stage='network and signature isolation';assert.deepEqual(Object.keys((await inspect(scanner)).NetworkSettings.Networks),[scannerNet]);assert.ok(!(await inspect(scanner)).Config.Env.some(value=>/TOKEN|PRIVATE_KEY/.test(value)));assert.equal((await inspect(scanner)).HostConfig.Binds?.length||0,0);assert.equal((await inspect(parser)).HostConfig.Binds?.length||0,0);assert.equal((await inspect(scanner)).Config.Volumes??null,null);
 stage='real harmless antivirus test string is blocked before parsing';const marker=Buffer.from('WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=','base64').toString();assert.equal(marker.length,68);assert.deepEqual(await request(marker),{status:400,body:{ok:false,code:'INVALID'}});assert.equal((await inspect(parser)).State.Running,true);
 stage='real clean bytes reach parser';assert.deepEqual(await request('Synthetic clean resume SQL'),{status:200,body:{ok:true,text:'Synthetic clean resume SQL'}});assert.equal(Number(await docker(['wait',parser])),0);
 const second=await run('parser_second',['--network',parserNet,'--network-alias','parser',...limits('512m'),'--user','10001:10001','jobmatch-parser:test']);await ready();
 stage='missing real observer blocks transmission';await docker(['stop','-t','1',observer]);assert.equal((await request('Synthetic withheld resume SQL')).status,503);assert.equal((await inspect(second)).State.Running,true);
 stage='missing real scanner blocks readiness';await docker(['stop','-t','1',scanner]);assert.equal((await fetch(root+'/health',{signal:AbortSignal.timeout(1500)})).status,503);
}catch{failed=true;process.stderr.write('FAIL: antivirus integration at '+stage+'; no file data or keys printed.\n');
 if(stage==='real signed scanner readiness')for(const suffix of ['scanner','observer','gateway','parser']){
  const name=prefix+'_'+suffix;try{const value=await inspect(name);process.stderr.write(JSON.stringify({service:suffix,status:value.State.Status,exit:value.State.ExitCode,oom:value.State.OOMKilled})+'\n');}catch{}
  // Startup only: no upload has been transmitted at this stage. Never dump env/inspect or keys.
  if(suffix==='scanner'||suffix==='observer')try{const log=await exec('docker',['logs','--tail','20',name],{timeout:5000,maxBuffer:10000});process.stderr.write((log.stdout+log.stderr).slice(-3000)+'\n');}catch{}
  if(suffix==='observer')try{const metadata=await docker(['exec',name,'node','-e',"require('./compiled/worker/scanner-measurement.js').measureLoadedVersion().then(value=>console.log(JSON.stringify(value)))"]);process.stderr.write('Loaded engine observation: '+metadata.slice(0,1024)+'\n');}catch{}
 }
}
finally{for(const name of containers)try{await docker(['rm','-f','-v',name]);}catch{failed=true;}for(const name of networks)try{await docker(['network','rm',name]);}catch{failed=true;}await rm(directory,{recursive:true,force:true});}
if(!failed)process.stdout.write('PASS: real ClamAV loaded database, signed observer, blocked harmless test string before parser, clean extraction, unavailable observer/scanner refusal, private network/secret separation; synthetic resources removed.\n');
process.exitCode=failed?1:0;
