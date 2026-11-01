import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {pdf} from './documents.mjs';
import {setTimeout as pause} from 'node:timers/promises';
if(process.env.JOBMATCH_ANTIVIRUS_CONTAINER_TEST!=='1')throw Error('Explicit synthetic test opt-in required');
const exec=promisify(execFile),prefix='jobmatch_av_'+randomBytes(6).toString('hex'),containers=[],networks=[],volumes=[],token=randomBytes(32).toString('hex');
const keys=generateKeyPairSync('ed25519'),publicKey=keys.publicKey.export({type:'spki',format:'pem'}),directory=await mkdtemp(join(tmpdir(),'jobmatch-av-'));
let failed=false,stage='setup',root='';
async function docker(args,timeout=30000){try{return(await exec('docker',args,{timeout,maxBuffer:1000000})).stdout.trim();}catch{throw Error('Synthetic container operation failed');}}
async function network(suffix,internal=true){const name=prefix+'_'+suffix;networks.push(name);await docker(['network','create',...(internal?['--internal']:[]),name]);return name;}
const emptyEnvironment=['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','NODE_OPTIONS'].flatMap(name=>['-e',name+'=']);
function limits(memory,pids='64',cpu='1'){return[...emptyEnvironment,'--memory',memory,'--memory-swap',memory,'--cpus',cpu,'--pids-limit',pids,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--ulimit','core=0','--tmpfs','/tmp:rw,noexec,nosuid,size=64m,mode=1777'];}
async function run(suffix,args){const name=prefix+'_'+suffix;containers.push(name);await docker(['run','-d','--name',name,...args]);return name;}
async function inspect(name){return JSON.parse(await docker(['inspect',name]))[0];}
async function ready(){const deadline=Date.now()+120000;while(Date.now()<deadline){try{const res=await fetch(root+'/health',{signal:AbortSignal.timeout(1500)});if(res.ok)return;}catch{}await pause(500);}throw Error('Synthetic readiness deadline');}
async function request(text,extension='txt'){const response=await fetch(root+'/extract',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream','X-File-Extension':extension},body:text,signal:AbortSignal.timeout(20000)});return{status:response.status,body:await response.json()};}
try{
 const scannerNet=await network('scanner'),parserNet=await network('parser'),observerNet=await network('observer'),ingress=await network('ingress',false),updates=await network('updates',false);
 const database=prefix+'_signatures';volumes.push(database);await docker(['volume','create',database]);
 const keyFile=join(directory,'observer-key');await writeFile(keyFile,keys.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o444});
 stage='real signature update';const updater=await run('updater',['--network',updates,...limits('4g','64','0.5').slice(emptyEnvironment.length),'--mount','type=volume,source='+database+',target=/var/lib/clamav','jobmatch-scanner:test','/usr/local/bin/jobmatch-freshclam','--stdout','--config-file=/etc/clamav/jobmatch-freshclam.conf']);assert.equal(Number(await docker(['wait',updater],180000)),0);
 stage='real scanner startup';const scanner=await run('scanner',['--network',scannerNet,'--network-alias','scanner',...limits('4g'),'--mount','type=volume,source='+database+',target=/var/lib/clamav,readonly','-e','TZ=UTC','jobmatch-scanner:test']);
 stage='observer startup';const observer=await run('observer',['--network',scannerNet,...limits('128m','32','0.25'),'--user','10001:10001','--mount','type=bind,source='+keyFile+',target=/run/secrets/scanner_observer_key,readonly','-e','SCANNER_TIMEZONE_UTC_CONFIRMED=true','-e','SCANNER_ALLOWED_ENGINES=1.4.6','jobmatch-parser:test','node','--disable-sigusr1','--max-old-space-size=64','compiled/worker/scanner-observer.cjs']);await docker(['network','connect','--alias','scanner-observer',observerNet,observer]);
 stage='gateway startup';const gateway=await run('gateway',['--network',ingress,...limits('128m','32','0.25'),'--user','10001:10001','-p','127.0.0.1::8080','-e','PARSER_WORKER_TOKEN='+token,'-e','PARSER_SCAN_MODE=required','-e','PARSER_SCANNER_PUBLIC_KEY='+publicKey,'-e','PARSER_SCANNER_ENGINES=1.4.6','jobmatch-parser:test','node','--disable-sigusr1','--max-old-space-size=64','compiled/worker/gateway.cjs']);await docker(['network','connect',parserNet,gateway]);await docker(['network','connect',scannerNet,gateway]);await docker(['network','connect',observerNet,gateway]);root='http://'+await docker(['port',gateway,'8080/tcp']);
 const parser=await run('parser',['--network',parserNet,'--network-alias','parser',...limits('512m'),'--user','10001:10001','jobmatch-parser:test']);
 stage='real signed scanner readiness';await ready();
 process.stdout.write('Loaded engine observation: '+await docker(['exec',observer,'node','-e',"require('./compiled/worker/scanner-measurement.js').measureLoadedVersion().then(value=>console.log(JSON.stringify(value)))"])+'\n');
 stage='scanner resource startup refusals';
 for(const [label,extra] of [['memory',['--memory','5g','--memory-swap','5g']],['swap',['--memory-swap','5g']],['cpu',['--cpus','2']],['pids',['--pids-limit','65']]]){
  const refused=await run('bad_'+label,['--network','none',...limits('4g'),...extra,'--mount','type=volume,source='+database+',target=/var/lib/clamav,readonly','jobmatch-scanner:test']);
  assert.equal(Number(await docker(['wait',refused])),1);
  const log=await exec('docker',['logs',refused],{timeout:5000,maxBuffer:2000});assert.match(log.stderr,/Required scanner isolation unavailable/);
 }
 stage='network and signature isolation';assert.deepEqual(Object.keys((await inspect(scanner)).NetworkSettings.Networks),[scannerNet]);assert.ok(!(await inspect(scanner)).Config.Env.some(value=>/TOKEN|PRIVATE_KEY/.test(value)));assert.equal((await inspect(scanner)).HostConfig.Binds?.length||0,0);assert.equal((await inspect(parser)).HostConfig.Binds?.length||0,0);assert.equal((await inspect(scanner)).Config.Volumes??null,null);const mounts=(await inspect(scanner)).Mounts;assert.equal(mounts.length,1);assert.equal(mounts[0].Name,database);assert.equal(mounts[0].RW,false);
 stage='real harmless antivirus test string is blocked before parsing';const marker=Buffer.from('WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=','base64').toString();assert.equal(marker.length,68);assert.deepEqual(await request(marker),{status:400,body:{ok:false,code:'INVALID'}});assert.equal((await inspect(parser)).State.Running,true);
 stage='real archive malware gate';const infected=new JSZip();infected.file('synthetic.txt',marker);assert.deepEqual(await request(await infected.generateAsync({type:'nodebuffer'}),'docx'),{status:400,body:{ok:false,code:'INVALID'}});assert.equal((await inspect(parser)).State.Running,true);
 stage='required local policy startup refusal';
 const missingPolicy=await run('missing_policy',['--network','none',...limits('64m','16','0.25'),'--tmpfs','/var/lib/clamav:rw,noexec,nosuid,size=1m,mode=1777','jobmatch-scanner:test']);assert.equal(Number(await docker(['wait',missingPolicy])),1);
 assert.match((await exec('docker',['logs',missingPolicy],{timeout:5000,maxBuffer:2000})).stderr,/Required scanner policy unavailable/);
 stage='real ZIP policy boundaries';
 // Query the actual engine: a parser-side INVALID cannot satisfy these assertions.
 const directScan=async bytes=>docker(['exec',observer,'node','-e',"require('./compiled/worker/clamav.js').scanStream(Buffer.from("+JSON.stringify(bytes.toString('base64'))+",'base64')).then(value=>console.log(value))"]);
 for(const [size,verdict] of [[4194304,'clean'],[4194305,'blocked']]){const zip=new JSZip();zip.file('boundary.txt','x'.repeat(size));const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});assert.equal(await directScan(bytes),verdict);}
 const nested=new JSZip(),inner=new JSZip();inner.file('oversized.txt','x'.repeat(5_000_000));nested.file('nested.zip',await inner.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));const nestedBytes=await nested.generateAsync({type:'nodebuffer',compression:'DEFLATE'});assert.equal(await directScan(nestedBytes),'blocked');assert.equal((await request(nestedBytes,'docx')).status,400);assert.equal((await inspect(parser)).State.Running,true);
 stage='real archive size limit gate';const large=new JSZip();large.file('oversized.txt','x'.repeat(5_000_000));const limited=await request(await large.generateAsync({type:'nodebuffer',compression:'DEFLATE'}),'docx');process.stdout.write(JSON.stringify({case:'archive-limit',status:limited.status,parserRunning:(await inspect(parser)).State.Running})+'\n');assert.equal(limited.status,400);assert.equal((await inspect(parser)).State.Running,true);
 stage='real encrypted archive gate';const plain=join(directory,'synthetic.txt'),encrypted=join(directory,'encrypted.zip');await writeFile(plain,'Synthetic encrypted fixture');await exec('zip',['-q','-j','-P','synthetic-fixture-password',encrypted,plain],{timeout:10000});const protectedResult=await request(await readFile(encrypted),'docx');assert.equal(protectedResult.status,400);assert.equal((await inspect(parser)).State.Running,true);
 stage='real encrypted PDF gate';const sourcePdf=join(directory,'synthetic.pdf'),protectedPdf=join(directory,'protected.pdf');await writeFile(sourcePdf,pdf());await exec('qpdf',['--encrypt','synthetic-user','synthetic-owner','256','--',sourcePdf,protectedPdf],{timeout:10000});assert.equal((await request(await readFile(protectedPdf),'pdf')).status,400);assert.equal((await inspect(parser)).State.Running,true);
 stage='live signature reload';const reloadMarker='JobMatch synthetic reload marker 8f2a90',rule='JobMatchSyntheticReload:0:*:'+Buffer.from(reloadMarker).toString('hex');
 const scanCode="require('./compiled/worker/clamav.js').scanStream(Buffer.from("+JSON.stringify(reloadMarker)+")).then(value=>console.log(value))";
 assert.equal(await docker(['exec',observer,'node','-e',scanCode]),'clean');
 const writer=await run('reload_fixture',['--network','none',...limits('64m','16','0.25'),'--mount','type=volume,source='+database+',target=/var/lib/clamav','jobmatch-scanner:test','/bin/sh','-c','printf \'%s\\n\' "$1" > /var/lib/clamav/jobmatch-fixture.ndb','fixture',rule]);assert.equal(Number(await docker(['wait',writer])),0);
 let reloaded=false;const reloadDeadline=Date.now()+60000;while(Date.now()<reloadDeadline){if(await docker(['exec',observer,'node','-e',scanCode])==='blocked'){reloaded=true;break;}await pause(1000);}assert.ok(reloaded);await ready();assert.equal((await request(reloadMarker)).status,400);assert.equal((await inspect(parser)).State.Running,true);
 stage='real clean bytes reach parser';assert.deepEqual(await request('Synthetic clean resume SQL'),{status:200,body:{ok:true,text:'Synthetic clean resume SQL'}});assert.equal(Number(await docker(['wait',parser])),0);
 const second=await run('parser_second',['--network',parserNet,'--network-alias','parser',...limits('512m'),'--user','10001:10001','jobmatch-parser:test']);await ready();
 stage='missing real observer blocks transmission';await docker(['stop','-t','1',observer]);assert.equal((await request('Synthetic withheld resume SQL')).status,503);assert.equal((await inspect(second)).State.Running,true);
 stage='restore observer before independent scanner failure';await docker(['start',observer]);await ready();
 stage='missing real scanner blocks readiness';await docker(['stop','-t','1',scanner]);assert.equal((await fetch(root+'/health',{signal:AbortSignal.timeout(1500)})).status,503);assert.equal((await request('Synthetic scanner unavailable fixture')).status,503);assert.equal((await inspect(second)).State.Running,true);
}catch(error){failed=true;process.stderr.write('FAIL: antivirus integration at '+stage+'; no file data or keys printed.\n');
 if(error?.code==='ERR_ASSERTION'&&['number','boolean'].includes(typeof error.actual)&&['number','boolean'].includes(typeof error.expected))process.stderr.write(JSON.stringify({actual:error.actual,expected:error.expected})+'\n');
 for(const suffix of ['scanner','observer','gateway','parser','parser_second'])try{const value=await inspect(prefix+'_'+suffix);process.stderr.write(JSON.stringify({service:suffix,status:value.State.Status,exit:value.State.ExitCode,oom:value.State.OOMKilled})+'\n');}catch{}

 if(['real signed scanner readiness','real signature update'].includes(stage))for(const suffix of ['updater','scanner','observer','gateway','parser']){
  const name=prefix+'_'+suffix;try{const value=await inspect(name);process.stderr.write(JSON.stringify({service:suffix,status:value.State.Status,exit:value.State.ExitCode,oom:value.State.OOMKilled})+'\n');}catch{}
  // Startup only: no upload has been transmitted at this stage. Never dump env/inspect or keys.
  if(suffix==='scanner'||suffix==='observer'||suffix==='updater')try{const log=await exec('docker',['logs','--tail','20',name],{timeout:5000,maxBuffer:10000});process.stderr.write((log.stdout+log.stderr).slice(-3000)+'\n');}catch{}
  if(suffix==='observer')try{const metadata=await docker(['exec',name,'node','-e',"require('./compiled/worker/scanner-measurement.js').measureLoadedVersion().then(value=>console.log(JSON.stringify(value)))"]);process.stderr.write('Loaded engine observation: '+metadata.slice(0,1024)+'\n');}catch{}
 }
}
finally{for(const name of containers)try{await docker(['rm','-f','-v',name]);}catch{failed=true;}for(const name of volumes)try{await docker(['volume','rm',name]);}catch{failed=true;}for(const name of networks)try{await docker(['network','rm',name]);}catch{failed=true;}await rm(directory,{recursive:true,force:true});}
if(!failed)process.stdout.write('PASS: real refreshed ClamAV database, required local ZIP policy/boundaries/nesting/startup refusal, signed observer, blocked harmless test string and archives/limits/encryption before parser, live signature reload, clean extraction, unavailable observer/scanner refusal, private network/secret separation; synthetic resources removed.\n');
process.exitCode=failed?1:0;
