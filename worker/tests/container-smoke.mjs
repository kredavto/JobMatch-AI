import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {docx,pdf} from './documents.mjs';
if(process.env.JOBMATCH_PARSER_CONTAINER_TEST!=='1'){process.stderr.write('Enable the synthetic parser container test explicitly.\n');process.exit(2);}
const exec=promisify(execFile),image=process.env.PARSER_TEST_IMAGE||'jobmatch-parser:test';
const prefix='jobmatch_parser_'+randomBytes(6).toString('hex'),network=prefix+'_private',ingress=prefix+'_ingress',token=randomBytes(32).toString('hex');
const containers=[];let stage='network setup',failed=false,root='';
async function docker(args,timeout=30000){try{const result=await exec('docker',args,{timeout,maxBuffer:1_000_000});return(args[0]==='logs'?result.stdout+result.stderr:result.stdout).trim();}catch{throw new Error('Synthetic container operation failed');}}
const emptyEnvironment=['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','NODE_OPTIONS'].flatMap(k=>['-e',k+'=']);
function limits(memory=512,cpus='1',pids='64'){return [...emptyEnvironment,'--memory',memory+'m','--memory-swap',memory+'m','--cpus',cpus,'--pids-limit',pids,'--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=32m,mode=1777','--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','10001:10001','--ulimit','core=0'];}
async function inspect(name){return JSON.parse(await docker(['inspect',name]))[0];}
async function create(suffix,command=[],privateWorker=false,restart=false){const name=prefix+'_'+suffix;containers.push(name);await docker(['run','-d','--name',name,'--network',privateWorker?network:'none',...(privateWorker?['--network-alias','parser']:[]),...limits(),...(restart?['--restart','always']:[]),image,...command]);return name;}
async function createGateway(){const name=prefix+'_gateway';containers.push(name);await docker(['run','-d','--name',name,'--network',ingress,...limits(128,'0.25','32'),'-e','PARSER_WORKER_TOKEN='+token,'-p','127.0.0.1::8080',image,'node','--disable-sigusr1','--max-old-space-size=64','compiled/worker/gateway.cjs']);await docker(['network','connect',network,name]);const port=await docker(['port',name,'8080/tcp']);assert.match(port,/^127\.0\.0\.1:\d+$/);root='http://'+port;return name;}
async function ready(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const response=await fetch(root+'/health',{signal:AbortSignal.timeout(1000)});if(response.ok&&JSON.parse(await response.text()).ok===true)return;}catch{}await pause(100);}throw new Error('Synthetic parser did not become ready');}
async function wait(name){return Number(await docker(['wait',name],30000));}
async function settings(name){const value=await inspect(name),h=value.HostConfig;
 assert.equal(h.Memory,512*1024*1024);assert.equal(h.MemorySwap,h.Memory);assert.equal(h.NanoCpus,1_000_000_000);assert.equal(h.PidsLimit,64);assert.equal(h.ReadonlyRootfs,true);assert.equal(h.Privileged,false);assert.equal(value.Config.User,'10001:10001');assert.ok(h.CapDrop.includes('ALL'));assert.ok(h.SecurityOpt.some(v=>v.startsWith('no-new-privileges')));assert.ok(h.Tmpfs['/tmp'].includes('noexec'));assert.equal(Object.keys(value.NetworkSettings.Networks).length,1);assert.equal(h.PidMode,'');assert.equal(h.Binds?.length||0,0);
 assert.ok(!value.Config.Env.some(value=>/TOKEN|SECRET|SUPABASE|DATABASE_URL/i.test(value.split('=')[0])));
 await docker(['exec',name,'node','-e',"const fs=require('node:fs');const entries=fs.readFileSync('/proc/1/environ','utf8').split('\\0').filter(Boolean).map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)]});require('./compiled/worker/runtime-environment.js').assertRuntimeEnvironment('parser',Object.fromEntries(entries));"]);
 assert.equal(await docker(['network','inspect','--format','{{.Internal}}',network]),'true');
 await docker(['exec',name,'node','-e',"const s=require('node:fs').readFileSync('/proc/1/status','utf8');if(!/^NoNewPrivs:\\s+1$/m.test(s)||!/^Seccomp:\\s+2$/m.test(s)||!/^CapEff:\\s+0+$/m.test(s))process.exit(1);"]);
 await docker(['exec',name,'node','-e',"const f=require('node:fs');try{f.writeFileSync('/app/blocked','x');process.exit(1);}catch(e){if(!['EROFS','EACCES'].includes(e.code))process.exit(1)}"]);
 await docker(['exec',name,'node','-e',"fetch('https://example.com',{signal:AbortSignal.timeout(700)}).then(()=>process.exit(1),()=>process.exit(0))"]);
 await docker(['exec',name,'node','-e',"if(require('node:fs').readFileSync('/proc/1/environ','utf8').split('\\0').some(v=>/TOKEN|SECRET|SUPABASE|DATABASE_URL/i.test(v.split('=')[0])))process.exit(1)"]);
}
async function send(ext,body){await ready();const response=await fetch(root+'/extract',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream','X-File-Extension':ext,'Cookie':'synthetic_session=PUBLIC_CLIENT_CANARY','X-Jobmatch-Owner':'PUBLIC_CLIENT_CANARY','X-Original-Filename':'PUBLIC_CLIENT_CANARY.pdf'},body:new Uint8Array(body),signal:AbortSignal.timeout(20000)});const result=await response.json();assert.equal(response.headers.get('cache-control'),'no-store');return{status:response.status,result};}
async function extract(name,ext,body){const result=await send(ext,body);assert.equal(await wait(name),0);assert.equal((await inspect(name)).State.Running,false);return result;}
try{
 await docker(['network','create','--internal',network]);await docker(['network','create',ingress]);
 stage='gateway startup';const gateway=await createGateway();stage='parser startup';const text=await create('text',[],true);stage='gateway/backend readiness';await ready();stage='kernel/filesystem/PID/environment settings';await settings(text);
 const gatewayState=await inspect(gateway);assert.equal(gatewayState.HostConfig.Memory,128*1024*1024);assert.equal(Object.keys(gatewayState.NetworkSettings.Networks).length,2);
 const unauth=await fetch(root+'/extract',{method:'POST',body:'Synthetic text'});assert.equal(unauth.status,401);assert.equal((await inspect(text)).State.Running,true);
 const bad=await fetch(root+'/extract',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/octet-stream','X-File-Extension':'exe'},body:'Synthetic text'});assert.equal(bad.status,400);assert.deepEqual(await bad.json(),{ok:false,code:'INVALID'});assert.equal((await inspect(text)).State.Running,true);
 stage='strict startup environment and distinct gateway budgets';
 async function rejectStartup(suffix,env,role='parser',memory=role==='parser'?512:128,cpus=role==='parser'?'1':'0.25',pids=role==='parser'?'64':'32'){
  stage='refuse runtime startup '+suffix;const name=prefix+'_'+suffix;containers.push(name);
  await docker(['run','-d','--name',name,'--network','none',...limits(memory,cpus,pids),...(role==='gateway'?['-e','PARSER_WORKER_TOKEN='+token]:[]),...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),image,'node','--disable-sigusr1','compiled/worker/'+(role==='gateway'?'gateway':'server')+'.cjs']);
  assert.equal(await wait(name),1);
  const logs=await docker(['logs',name]);assert.match(logs,role==='parser'?/Required parser isolation configuration unavailable/:/Required container limits unavailable/);assert.ok(!logs.includes('PUBLIC_ENV_CANARY'));assert.ok(!logs.includes(token));
 }
 await rejectStartup('extra_env',{AWS_ACCESS_KEY_ID:'PUBLIC_ENV_CANARY'});
 await rejectStartup('proxy_env',{HTTP_PROXY:'https://PUBLIC_ENV_CANARY.invalid'});
 await rejectStartup('preload_env',{NODE_OPTIONS:'--no-warnings'});
 await rejectStartup('gateway_extra',{DATABASE_PASSWORD:'PUBLIC_ENV_CANARY'},'gateway');
 await rejectStartup('gateway_memory',{},'gateway',129);
 await rejectStartup('gateway_cpu',{},'gateway',128,'0.5');
 await rejectStartup('gateway_pids',{},'gateway',128,'0.25','33');
 stage='TXT job and retirement';assert.deepEqual(await extract(text,'txt',Buffer.from('Synthetic resume SQL')),{status:200,result:{ok:true,text:'Synthetic resume SQL'}});
 stage='DOCX job and retirement';const word=await extract(await create('word',[],true),'docx',await docx());assert.equal(word.status,200);assert.equal(word.result.ok,true);assert.match(word.result.text,/Synthetic resume SQL/);
 stage='PDF job and retirement';const document=await extract(await create('pdf',[],true),'pdf',pdf());assert.equal(document.status,200);assert.equal(document.result.ok,true);assert.match(document.result.text,/Synthetic resume SQL/);
 stage='private parser refuses credential headers and retires';const credentialProbe=await create('credential_probe',[],true);await ready();
 await docker(['exec',gateway,'node','-e',"fetch('http://parser:8080/extract',{method:'POST',headers:{Authorization:'Bearer PUBLIC_CLIENT_CANARY','Content-Type':'application/octet-stream','X-File-Extension':'txt'},body:'Synthetic resume SQL'}).then(async r=>{if(r.status!==503||JSON.stringify(await r.json())!==JSON.stringify({ok:false,code:'UNAVAILABLE'}))process.exit(1)},()=>process.exit(1))"]);assert.equal(await wait(credentialProbe),0);
 stage='unsupported DOCX rejection and retirement';assert.deepEqual(await extract(await create('badword',[],true),'docx',await docx('word/embeddings/oleObject1.bin')),{status:400,result:{ok:false,code:'INVALID'}});
 stage='restart policy and fresh tmpfs';const recycled=await create('recycle',[],true,true);await ready();const firstPid=(await inspect(recycled)).State.Pid;
 await docker(['exec',recycled,'node','-e',"require('node:fs').writeFileSync('/tmp/previous-job','synthetic')"]);
 assert.deepEqual(await send('txt',Buffer.from('First independent resume')),{status:200,result:{ok:true,text:'First independent resume'}});await ready();const restarted=await inspect(recycled);assert.ok(restarted.RestartCount>=1);assert.notEqual(restarted.State.Pid,firstPid);
 await docker(['exec',recycled,'node','-e',"if(require('node:fs').existsSync('/tmp/previous-job'))process.exit(1)"]);
 assert.deepEqual(await send('txt',Buffer.from('Second independent resume')),{status:200,result:{ok:true,text:'Second independent resume'}});await docker(['stop','-t','1',recycled]);
 assert.equal((await inspect(gateway)).State.Pid,gatewayState.State.Pid);
 stage='kernel CPU ceiling';const cpu=await create('cpu',['/usr/bin/prlimit','--cpu=1:1','--core=0','node','-e','for(;;){}']);assert.equal(await wait(cpu),137);assert.equal((await inspect(cpu)).State.OOMKilled,false);
 stage='kernel total RAM ceiling';const ram=await create('ram',['node','--max-old-space-size=128','-e','const a=[];for(;;)a.push(Buffer.alloc(16*1024*1024,1))']);assert.equal(await wait(ram),137);assert.equal((await inspect(ram)).State.OOMKilled,true);
}catch{for(const name of containers){try{const i=await inspect(name);process.stderr.write(JSON.stringify({probe:name.slice(prefix.length+1),running:i.State.Running,exit:i.State.ExitCode,oom:i.State.OOMKilled})+'\n');}catch{}}process.stderr.write('FAIL: synthetic parser container test at '+stage+'; no file data or credentials printed.\n');failed=true;}
finally{
 for(const name of containers){try{await docker(['rm','-f',name]);}catch{process.stderr.write('FAIL: synthetic parser container cleanup.\n');failed=true;}}
 for(const name of [network,ingress])try{await docker(['network','rm',name]);}catch{process.stderr.write('FAIL: synthetic parser network cleanup.\n');failed=true;}
}
if(!failed)process.stdout.write('PASS: allowlisted runtime environment and strict role budgets; credential gateway, real TXT/DOCX/PDF HTTP jobs, one-job retirement/restart with fresh tmpfs, private network/readonly/caps/PIDs, kernel CPU/RAM ceilings; all containers/networks removed.\n');
process.exitCode=failed?1:0;
