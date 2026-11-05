import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {relative,resolve,sep} from 'node:path';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const packageName=/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const version=/^[0-9][a-zA-Z0-9.+-]{0,99}$/;
function refuse(){throw Error('Dependency graph unavailable or inconsistent');}
/** npm may install an invalid peer graph with warnings and exit zero. Check its
 * installed graph separately; never reproduce npm paths, ranges or diagnostics. */
export function assessDependencyGraph(raw,exitCode,context){
 if(!record(raw)||typeof raw.name!=='string'||!packageName.test(raw.name)||typeof raw.version!=='string'||!version.test(raw.version)||!record(raw.dependencies)||![0,1].includes(exitCode))refuse();
 const pending=[{node:raw,depth:0,name:raw.name}],seen=new Set(),messages=[],optionalMessages=new Set(),optionalPaths=new Set();let nodes=0,emptySlots=0,problemSignals=0;
 function lockedOptional(node,name){
  if(!record(context)||!record(context.lock)||context.lock.lockfileVersion!==3||!record(context.lock.packages)||typeof context.rootPath!=='string'||resolve(context.rootPath)!==context.rootPath||typeof node.path!=='string'||typeof node.version!=='string'||node.name!==name||node.optional!==true)return false;
  const path=relative(context.rootPath,node.path).split(sep).join('/');
  if(!path.startsWith('node_modules/')||path.split('/').includes('..')||resolve(context.rootPath,path)!==node.path)return false;
  const entry=context.lock.packages[path];if(!record(entry)||entry.optional!==true||entry.link===true||entry.version!==node.version)return false;
  optionalPaths.add(path);optionalMessages.add('extraneous: '+name+'@'+node.version+' '+node.path);return true;
 }
 while(pending.length){
  const {node,depth,name}=pending.pop();if(!record(node)||seen.has(node)||depth>128||++nodes>25000)refuse();seen.add(node);
  if(Object.keys(node).length===0){emptySlots++;continue;} // npm's uninstalled optional slots
  if(node.version!==undefined&&(typeof node.version!=='string'||!version.test(node.version)))refuse();
  if(node.problems!==undefined){if(!Array.isArray(node.problems)||node.problems.length>25000||node.problems.some(v=>typeof v!=='string'||v.length>16000))refuse();messages.push(...node.problems);}
  if(node.error!==undefined){if(!record(node.error)||node.error.code!=='ELSPROBLEMS')refuse();problemSignals++;}
  if(node.missing!==undefined){if(typeof node.missing!=='boolean')refuse();if(node.missing)problemSignals++;}
  if(node.extraneous!==undefined){if(typeof node.extraneous!=='boolean')refuse();if(node.extraneous&&!lockedOptional(node,name))problemSignals++;}
  if(node.invalid!==undefined){if(typeof node.invalid!=='boolean'&&typeof node.invalid!=='string'||typeof node.invalid==='string'&&!node.invalid.length)refuse();if(node.invalid)problemSignals++;}
  if(node.dependencies!==undefined){if(!record(node.dependencies))refuse();for(const [name,value] of Object.entries(node.dependencies)){if(!packageName.test(name))refuse();pending.push({node:value,depth:depth+1,name});}}
 }
 for(const message of messages)if(!optionalMessages.has(message))problemSignals++;
 // npm ls can exit zero for an extraneous installation. Its explicit problem
 // markers still fail this gate; a nonzero exit without markers is unavailable.
 if(exitCode===1&&!problemSignals)refuse();
 return {format:'jobmatch-dependency-graph-v1',assessment:'installed-npm-graph-only',supportPolicyAcceptance:'not-assessed',independentSecurityAcceptance:'not-performed',status:problemSignals?'invalid':'valid',nodes,emptySlots,optionalArtifacts:optionalPaths.size,problemSignals};
}
function query(){return new Promise((resolve,reject)=>execFile('npm',['ls','--all','--json','--long'],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024},(error,stdout)=>{
 if(error&&error.code!==1){reject(Error('Graph unavailable'));return;}
 try{resolve({raw:JSON.parse(stdout),exitCode:error?1:0});}catch{reject(Error('Graph unavailable'));}
}));}
export async function main(){
 if(process.argv.length!==2)refuse();
 const [lock,manifest]=await Promise.all([readFile('package-lock.json'),readFile('package.json')]);
 const parsed=JSON.parse(lock.toString('utf8'));if(!record(parsed)||parsed.lockfileVersion!==3||!record(parsed.packages))refuse();
 const {raw,exitCode}=await query(),assessment=assessDependencyGraph(raw,exitCode,{lock:parsed,rootPath:process.cwd()});
 const [afterLock,afterManifest]=await Promise.all([readFile('package-lock.json'),readFile('package.json')]);
 if(!lock.equals(afterLock)||!manifest.equals(afterManifest))refuse();
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 process.stdout.write(JSON.stringify({...assessment,observedAt:new Date().toISOString(),lockSha256:sha(lock),manifestSha256:sha(manifest)})+'\n');
 process.exitCode=assessment.status==='valid'?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{process.stderr.write('Dependency graph refused or unavailable; no npm diagnostics emitted.\n');process.exitCode=2;});
