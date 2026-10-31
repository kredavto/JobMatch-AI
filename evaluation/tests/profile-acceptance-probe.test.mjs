import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('native provenance probe refuses missing CI/disposable scope and arguments before SQL or diagnostics',()=>{
 const approved={PATH:process.env.PATH,CI:'true',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'kredavto/JobMatch-AI',JOBMATCH_LOCAL_AI_PROFILE_TEST:'1',PGHOST:'127.0.0.1',PGUSER:'postgres',PGDATABASE:'jobmatch_ai_profile_full'};
 const cases=[{},...Object.keys(approved).filter(key=>key!=='PATH').map(key=>({...approved,[key]:'PRIVATE'})),{...approved,JOBMATCH_AI_PROFILE_NATIVE_MODE:'PRIVATE'}];
 for(const env of cases){const r=spawnSync(process.execPath,['evaluation/dist/evaluation/profile-acceptance-probe.cjs'],{env,encoding:'utf8',timeout:5000});assert.equal(r.status,2);assert.equal(r.stdout,'');assert.equal(r.stderr,'Native profile acceptance probe refused or incomplete; no credentials, SQL diagnostics or row data emitted.\n');}
 const argument=spawnSync(process.execPath,['evaluation/dist/evaluation/profile-acceptance-probe.cjs','PRIVATE'],{env:approved,encoding:'utf8',timeout:5000});assert.equal(argument.status,2);assert.equal(argument.stdout,'');assert.equal(argument.stderr.includes('PRIVATE'),false);
});
