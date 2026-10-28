import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {runParser} from '../dist/worker/supervisor.js';
import {assertContainerLimits} from '../dist/worker/container-limits.js';
import {docx,pdf} from './documents.mjs';
const fixture=name=>fileURLToPath(new URL('./fixtures/'+name+'.mjs',import.meta.url));
const entry=fileURLToPath(new URL('../dist/worker/job.cjs',import.meta.url));
const linux=process.platform==='linux'&&existsSync('/usr/bin/prlimit');
test('actual child receives bytes and returns the strict protocol',{skip:!linux},async()=>{assert.deepEqual(await runParser(Buffer.from('Resume SQL'),'txt',undefined,{entry:fixture('echo')}),{ok:true,text:'Resume SQL'});});
test('child does not inherit worker/app credentials',{skip:!linux},async()=>{
 const names=['PARSER_WORKER_TOKEN','SUPABASE_URL','SUPABASE_SECRET_KEY','IMPORT_PARSER_TOKEN'];const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 try{for(const key of names)process.env[key]='private-secret';const result=await runParser(Buffer.alloc(0),'txt',undefined,{entry:fixture('env')});assert.deepEqual(result,{ok:true,text:'Environment: {}'});}
 finally{for(const key of names){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
test('Linux enforces CPU/core/FD ceilings in the actual child',{skip:!linux},async()=>{const result=await runParser(Buffer.alloc(0),'txt',undefined,{entry:fixture('limits'),cpuSeconds:1});assert.equal(result.ok,true);assert.match(result.text,/Max cpu time\s+1\s+1\s+seconds/);assert.match(result.text,/Max open files\s+64\s+64/);assert.match(result.text,/Max core file size\s+0\s+0/);});
test('synchronous CPU loop is killed by RLIMIT_CPU',{skip:!linux,timeout:7000},async()=>{const start=performance.now();assert.deepEqual(await runParser(Buffer.alloc(0),'txt',undefined,{entry:fixture('cpu'),cpuSeconds:1,wallMs:5000}),{ok:false,code:'TIMEOUT'});assert.ok(performance.now()-start<4500);});
test('independent parent wall deadline kills a noncooperative child',{skip:!linux},async()=>{let ticks=0;const timer=setInterval(()=>ticks++,10);try{assert.deepEqual(await runParser(Buffer.alloc(0),'txt',undefined,{entry:fixture('stall'),wallMs:150}),{ok:false,code:'TIMEOUT'});assert.ok(ticks>0);}finally{clearInterval(timer);}});
test('caller cancellation terminates the job',{skip:!linux},async()=>{const controller=new AbortController();const task=runParser(Buffer.alloc(0),'txt',controller.signal,{entry:fixture('stall')});setTimeout(()=>controller.abort(),100);assert.deepEqual(await task,{ok:false,code:'TIMEOUT'});});
for(const name of ['crash','overflow','invalid','encoding'])test('rejects '+name+' without diagnostics',{skip:!linux},async()=>{assert.deepEqual(await runParser(Buffer.alloc(0),'txt',undefined,{entry:fixture(name)}),{ok:false,code:'UNAVAILABLE'});});
test('rejects oversized input and already cancelled work without starting a parser',async()=>{assert.deepEqual(await runParser(Buffer.alloc(4000001),'txt'),{ok:false,code:'TOO_LARGE'});const controller=new AbortController();controller.abort();assert.deepEqual(await runParser(Buffer.alloc(0),'txt',controller.signal),{ok:false,code:'TIMEOUT'});});
test('actual job extracts TXT/DOCX/PDF in a separate process',{skip:!linux,timeout:30000},async()=>{for(const [ext,bytes] of [['txt',Buffer.from('Synthetic resume SQL')],['docx',await docx()],['pdf',pdf()]]){const result=await runParser(bytes,ext,undefined,{entry});assert.equal(result.ok,true,ext);assert.match(result.text,/Synthetic resume SQL/);}});
test('actual job rejects unsupported DOCX payload before extraction',{skip:!linux},async()=>{assert.deepEqual(await runParser(await docx('word/embeddings/oleObject1.bin'),'docx',undefined,{entry}),{ok:false,code:'INVALID'});});

test('upload service accepts only bounded cgroup v2 settings',()=>{const limits={'memory.max':'536870912','memory.swap.max':'0','pids.max':'64','cpu.max':'100000 100000'};assert.doesNotThrow(()=>assertContainerLimits(path=>limits[path.split('/').at(-1)]));});
test('upload service refuses absent, unlimited or oversized kernel budgets',()=>{const limits={'memory.max':'536870912','memory.swap.max':'0','pids.max':'64','cpu.max':'100000 100000'};for(const [key,value] of [['memory.max','max'],['memory.max','1073741824'],['memory.max','0'],['memory.swap.max','1'],['pids.max','max'],['pids.max','65'],['cpu.max','max 100000'],['cpu.max','200000 100000'],['cpu.max','0 100000']])assert.throws(()=>assertContainerLimits(path=>path.endsWith('/'+key)?value:limits[path.split('/').at(-1)]));assert.throws(()=>assertContainerLimits(()=>{throw new Error('unavailable');}));});
