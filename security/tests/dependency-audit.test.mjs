import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {assessAudits,auditExit} from '../../scripts/dependency_audit.mjs';
const ids={runtime:'GHSA-gmq8-994r-jv83',dev:'GHSA-g3hv-75wg-m249'};
const lock={lockfileVersion:3,packages:{'node_modules/yauzl':{version:'3.2.0'},'node_modules/minimatch':{version:'3.1.5',dev:true}}};
function report(names=[]){
 const vulnerabilities=Object.fromEntries(names.map(name=>[name,{name,severity:'moderate',isDirect:name==='yauzl',nodes:['node_modules/'+name],via:[{name,severity:'moderate',url:'https://github.com/advisories/'+(name==='yauzl'?ids.runtime:ids.dev),title:'SENSITIVE provider title is not a report field'}]}]));
 return {auditReportVersion:2,vulnerabilities,metadata:{vulnerabilities:{info:0,low:0,moderate:names.length,high:0,critical:0,total:names.length}}};
}
test('catalog-empty reports pass both gates without independent acceptance claims',()=>{
 const result=assessAudits(report(),report(),lock);assert.equal(result.status,'catalog-clear');assert.equal(result.independentSecurityAcceptance,'not-performed');assert.equal(auditExit(result),0);assert.equal(auditExit(result,true),0);
});
test('remaining development findings are explicit and still fail the all-dependencies gate',()=>{
 const result=assessAudits(report(['minimatch']),report(),lock);assert.equal(result.status,'runtime-clear/full-findings-remain');assert.equal(result.full.packagesAffected,1);assert.deepEqual(result.full.advisoryIds,[ids.dev]);assert.equal(result.full.findings[0].runtime,false);assert.equal(auditExit(result),0);assert.equal(auditExit(result,true),1);
});
test('any runtime finding fails both gates',()=>{
 const result=assessAudits(report(['yauzl','minimatch']),report(['yauzl']),lock);assert.equal(result.status,'runtime-findings');assert.equal(auditExit(result),1);assert.equal(auditExit(result,true),1);
});
test('missing, network/error and unknown audit formats are never successful empty results',()=>{
 for(const raw of [null,{},[],{...report(),auditReportVersion:1},{...report(),error:{message:'SENSITIVE'}},{...report(),metadata:{}}])assert.throws(()=>assessAudits(raw,report(),lock));
});
test('incoherent count or severity totals refuse',()=>{
 for(const counts of [{info:0,low:0,moderate:0,high:0,critical:0,total:1},{info:0,low:0,moderate:1,high:0,critical:0,total:0},{info:0,low:0,moderate:-1,high:0,critical:0,total:1},{info:0,low:0,moderate:1,high:0,critical:0,total:1,private:1}]){
  const raw=report(['yauzl']);raw.metadata.vulnerabilities=counts;assert.throws(()=>assessAudits(raw,report(['yauzl']),lock));
 }
});
test('unknown installed paths, duplicate nodes and malformed names/versions refuse',()=>{
 const base=report(['yauzl']);for(const nodes of [[],['node_modules/missing'],['node_modules/yauzl','node_modules/yauzl'],['node_modules/../secret']]){const raw=structuredClone(base);raw.vulnerabilities.yauzl.nodes=nodes;assert.throws(()=>assessAudits(raw,base,lock));}
 assert.throws(()=>assessAudits(base,base,{...lock,lockfileVersion:2}));
 assert.throws(()=>assessAudits(base,base,{...lock,packages:{'node_modules/yauzl':{version:'SENSITIVE invalid'}}}));
 const raw=report(['yauzl']);raw.vulnerabilities.yauzl.name='foreign';assert.throws(()=>assessAudits(raw,base,lock));
});
test('inconsistent runtime/full inventories cannot hide a runtime finding',()=>{
 assert.throws(()=>assessAudits(report(['yauzl']),report(),lock));
 assert.throws(()=>assessAudits(report(),report(['yauzl']),lock));
 assert.throws(()=>assessAudits(report(['minimatch']),report(['minimatch']),lock));
});
test('untrusted advisory URLs, severity and references refuse without echoing payloads',()=>{
 for(const url of ['https://attacker.test/SENSITIVE','https://github.com/advisories/'+ids.runtime+'?token=SENSITIVE']){
  const raw=report(['yauzl']);raw.vulnerabilities.yauzl.via[0].url=url;assert.throws(()=>assessAudits(raw,report(['yauzl']),lock),error=>!error.message.includes('SENSITIVE'));
 }
 const raw=report(['yauzl']);raw.vulnerabilities.yauzl.via=['missing'];assert.throws(()=>assessAudits(raw,report(['yauzl']),lock));
 const severity=report(['yauzl']);severity.vulnerabilities.yauzl.via[0].severity='unknown';assert.throws(()=>assessAudits(severity,report(['yauzl']),lock));
});
test('summaries preserve public names/IDs/versions but omit provider titles and raw nodes',()=>{
 const result=assessAudits(report(['minimatch']),report(),lock),text=JSON.stringify(result);assert.equal(text.includes('SENSITIVE'),false);assert.equal(text.includes('node_modules/'),false);assert.deepEqual(result.full.findings[0].versions,['3.1.5']);
});

test('unknown CLI flags refuse before querying npm and do not echo supplied text',()=>{
 const result=spawnSync(process.execPath,['scripts/dependency_audit.mjs','SENSITIVE_ARGUMENT'],{encoding:'utf8',timeout:5000});
 assert.equal(result.status,2);assert.equal(result.stdout,'');assert.equal(result.stderr,'Dependency audit refused or unavailable; no provider diagnostics emitted.\n');
});
