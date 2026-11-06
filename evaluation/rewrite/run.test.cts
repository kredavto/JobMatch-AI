import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {evaluateCase,RewriteCorpus} from './harness.js';
import {readFileSync} from 'node:fs';
import {totals} from './run.cjs';
test('runner default gate refuses before accessing model files or spawning server',()=>{
 const r=spawnSync(process.execPath,['evaluation/dist/evaluation/rewrite/run.cjs'],{env:{PATH:process.env.PATH},encoding:'utf8',timeout:3000});
 assert.equal(r.status,2);assert.equal(r.stdout,'');assert.match(r.stderr,/^REWRITE_DIAGNOSTIC_REFUSED_OR_INCOMPLETE\n$/);
});
test('completed fixture transport cannot produce semantic/model acceptance',async()=>{
 const c=RewriteCorpus.parse(JSON.parse(readFileSync('evaluation/rewrite/corpus-v1.json','utf8'))).cases[0];
 const row=await evaluateCase(c,async()=>Response.json({choices:[{message:{role:'assistant',content:'{"claims":[]}'},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:10}}),new AbortController().signal);
 assert.equal(row.status,'refused');assert.equal(row.backendResponse,true);
 const rows=Array.from({length:6},()=>row),result=totals(rows,false,true);
 assert.equal(result.runtimeSuccess,true);assert.equal(result.contractValid,0);assert.equal(result.acceptance,'not-accepted');assert.equal(result.semanticAssessment,'not-performed');assert.equal(result.independentHeldOut,'not-performed');assert.equal(result.generatedTokens,60);
 for(const r of [totals(rows,true,true),totals(rows,false,false),totals(rows.slice(1),false,true),totals([...rows,{...row}],false,true),totals(rows.map(x=>({...x,finish:'length'})),false,true),totals(rows.map(x=>({...x,backendRequests:2})),false,true),totals(rows.map(x=>({...x,tokens:0})),false,true)])assert.equal(r.runtimeSuccess,false);
});
