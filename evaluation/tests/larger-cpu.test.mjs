import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {cpuModelSlot,cpuModelIdentity,cpuManifestPath,validateCpuPin,cpuServerArgs} from '../dist/evaluation/cpu-diagnostic.cjs';
import {createProfileCpuBridge} from '../dist/evaluation/profile-cpu-diagnostic.cjs';
import {aiProfileBody} from '../dist/lib/ai-profile-provider.js';
import {profileCorpus} from '../dist/evaluation/profile-corpus.js';

test('third reviewed slot preserves old defaults, exact model/resource pins and manifest separation',()=>{
 assert.equal(cpuModelSlot(undefined),'baseline');assert.equal(cpuModelSlot('larger'),'larger');assert.throws(()=>cpuModelSlot('PRIVATE'));
 for(const slot of ['baseline','candidate','larger']){
  const pin=JSON.parse(readFileSync(cpuManifestPath(slot),'utf8'));assert.deepEqual(validateCpuPin(pin,slot),pin);
  assert.equal(cpuModelIdentity(slot).sha256,pin.sha256);
  for(const other of ['baseline','candidate','larger'].filter(x=>x!==slot))assert.throws(()=>validateCpuPin(pin,other));
  for(const change of [{revision:'main'},{threads:8},{bytes:1},{endpoint:'https://PRIVATE'},{sha256:'0'.repeat(64)}])assert.throws(()=>validateCpuPin({...pin,...change},slot));
 }
 const args=cpuServerArgs('larger');assert.equal(args[args.indexOf('--alias')+1],cpuModelIdentity('larger').modelAlias);
 for(const [flag,value] of [['--ctx-size','4096'],['--threads','4'],['--host','127.0.0.1'],['--n-gpu-layers','0']])assert.equal(args[args.indexOf(flag)+1],value);
});

test('larger profile bridge allows only fixed corpus with its alias and forwards untouched actual text',async()=>{
 const calls=[];const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;calls.push(JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{role:'assistant',content:'UNMODIFIED SCRIPTED UPSTREAM'},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:5}}));});
 server.listen(0,'127.0.0.1');await once(server,'listening');const bridge=await createProfileCpuBridge('http://127.0.0.1:'+server.address().port+'/','larger');
 try{
  const alias=cpuModelIdentity('larger').modelAlias,body=aiProfileBody(profileCorpus[0].source,alias);
  const post=body=>fetch(bridge.endpoint,{method:'POST',body});
  assert.equal((await post(aiProfileBody(profileCorpus[0].source,cpuModelIdentity().modelAlias))).status,400);assert.equal(calls.length,0);
  assert.equal((await post(aiProfileBody('PRIVATE USER SOURCE',alias))).status,400);assert.equal(calls.length,0);
  const result=await post(body);assert.equal(result.status,200);assert.equal((await result.json()).message.content,'UNMODIFIED SCRIPTED UPSTREAM');
  assert.equal(calls[0].model,alias);assert.deepEqual(calls[0].messages,JSON.parse(body).messages);assert.equal((await post(body)).status,400);
 }finally{await bridge.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
