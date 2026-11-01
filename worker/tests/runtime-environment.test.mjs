import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRuntimeEnvironment,EMPTY_RUNTIME_VARIABLES} from '../dist/worker/runtime-environment.js';
import {assertContainerLimits} from '../dist/worker/container-limits.js';
const clean={PWD:process.cwd(),PATH:'/usr/bin:/bin',NODE_VERSION:'24',HOSTNAME:'synthetic',HOME:'/tmp',NODE_ENV:'production',...Object.fromEntries(EMPTY_RUNTIME_VARIABLES.map(n=>[n,'']))};
test('parser accepts only the minimal image metadata and empty proxy/preload selectors',()=>{assert.doesNotThrow(()=>assertRuntimeEnvironment('parser',clean));});
for(const name of ['AWS_ACCESS_KEY_ID','DATABASE_PASSWORD','SENTRY_DSN','IMPORT_PARSER_TOKEN','PARSER_WORKER_TOKEN','UNRECOGNIZED_NAME'])test('parser refuses extra environment name '+name+' without echoing value',()=>{assert.throws(()=>assertRuntimeEnvironment('parser',{...clean,[name]:'PUBLIC_SYNTHETIC_CANARY'}),{message:'Invalid runtime environment'});});
for(const name of EMPTY_RUNTIME_VARIABLES)test('parser refuses nonempty outbound/preload selector '+name,()=>{assert.throws(()=>assertRuntimeEnvironment('parser',{...clean,[name]:'PUBLIC_SYNTHETIC_CANARY'}),{message:'Invalid runtime environment'});});
test('gateway permits exactly its independent credential and rejects extra app credentials',()=>{const gateway={...clean,PARSER_WORKER_TOKEN:'synthetic_gateway_token_000000000000'};assert.doesNotThrow(()=>assertRuntimeEnvironment('gateway',gateway));assert.throws(()=>assertRuntimeEnvironment('gateway',clean));assert.throws(()=>assertRuntimeEnvironment('gateway',{...gateway,JM_AUTH_KEY:'PUBLIC_CANARY'}));});
test('gateway startup enforces its own stricter kernel budgets',()=>{const values={'memory.max':String(128*1024*1024),'memory.swap.max':'0','pids.max':'32','cpu.max':'25000 100000'},read=p=>values[p.split('/').at(-1)];assert.doesNotThrow(()=>assertContainerLimits(read,'gateway'));for(const [name,value] of [['memory.max',String(129*1024*1024)],['pids.max','33'],['cpu.max','25001 100000']])assert.throws(()=>assertContainerLimits(p=>p.endsWith('/'+name)?value:read(p),'gateway'));});

test('entrypoint working directory is allowed only when it matches the actual process directory',()=>{assert.throws(()=>assertRuntimeEnvironment('parser',{...clean,PWD:'/PUBLIC_ENV_CANARY'}));});

test('only parser role accepts an exact nonsecret OCR boolean; invalid or gateway values refuse',()=>{for(const value of ['true','false'])assert.doesNotThrow(()=>assertRuntimeEnvironment('parser',{...clean,PARSER_WORKER_OCR:value}));for(const value of ['','1','yes','TRUE'])assert.throws(()=>assertRuntimeEnvironment('parser',{...clean,PARSER_WORKER_OCR:value}));assert.throws(()=>assertRuntimeEnvironment('gateway',{...clean,PARSER_WORKER_TOKEN:'synthetic_gateway_token_000000000000',PARSER_WORKER_OCR:'true'}));});

test('scanner settings belong only to required gateway mode and observer measurement role',()=>{
 const gateway={...clean,PARSER_WORKER_TOKEN:'synthetic_gateway_token_000000000000',PARSER_SCAN_MODE:'required',PARSER_SCANNER_PUBLIC_KEY:'public-placeholder',PARSER_SCANNER_ENGINES:'1.4.6'};
 assert.doesNotThrow(()=>assertRuntimeEnvironment('gateway',gateway));
 assert.throws(()=>assertRuntimeEnvironment('parser',{...clean,PARSER_SCAN_MODE:'required'}));
 assert.throws(()=>assertRuntimeEnvironment('gateway',{...gateway,PARSER_SCAN_MODE:'typo'}));
 assert.throws(()=>assertRuntimeEnvironment('gateway',{...gateway,PARSER_SCANNER_ENGINES:'1.4.6,private'}));
 const observer={...clean,SCANNER_ALLOWED_ENGINES:'1.4.6',SCANNER_TIMEZONE_UTC_CONFIRMED:'true'};assert.doesNotThrow(()=>assertRuntimeEnvironment('observer',observer));
 assert.throws(()=>assertRuntimeEnvironment('observer',{...observer,PARSER_WORKER_TOKEN:'public_secret_canary_000000000000'}));
 assert.throws(()=>assertRuntimeEnvironment('observer',{...observer,SCANNER_TIMEZONE_UTC_CONFIRMED:'false'}));
});
