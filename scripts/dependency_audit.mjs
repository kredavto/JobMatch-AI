import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const severities=['info','low','moderate','high','critical'];
const packageName=/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const advisoryUrl=/^https:\/\/github\.com\/advisories\/(GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})$/;
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const count=value=>Number.isSafeInteger(value)&&value>=0;
function refuse(){throw Error('Invalid audit or lock report');}
export function normalizeAudit(raw,lock){
 if(!record(raw)||'error'in raw||raw.auditReportVersion!==2||!record(raw.vulnerabilities)||!record(raw.metadata)||!record(raw.metadata.vulnerabilities)||!record(lock)||lock.lockfileVersion!==3||!record(lock.packages))refuse();
 const totals=raw.metadata.vulnerabilities,keys=Object.keys(totals);
 if(keys.length!==6||![...severities,'total'].every(key=>count(totals[key])))refuse();
 const entries=Object.entries(raw.vulnerabilities);
 if(entries.length!==totals.total||severities.some(level=>entries.filter(([,row])=>row?.severity===level).length!==totals[level]))refuse();
 const seenAdvisories=new Set(),findings=[];
 for(const [name,row] of entries){
  if(!packageName.test(name)||!record(row)||row.name!==name||!severities.includes(row.severity)||typeof row.isDirect!=='boolean'||!Array.isArray(row.nodes)||!row.nodes.length||!Array.isArray(row.via)||!row.via.length)refuse();
  const nodes=new Set(),versions=new Set(),ids=new Set(),viaPackages=new Set();let runtime=false;
  for(const node of row.nodes){
   if(typeof node!=='string'||node.length>4096||!node.startsWith('node_modules/')||node.split('/').includes('..')||nodes.has(node)||!record(lock.packages[node]))refuse();
   const pkg=lock.packages[node];if(typeof pkg.version!=='string'||pkg.version.length>100||!(/^[0-9][a-zA-Z0-9.+-]*$/).test(pkg.version))refuse();
   nodes.add(node);versions.add(pkg.version);if(pkg.dev!==true)runtime=true;
  }
  for(const via of row.via){
   if(typeof via==='string'){if(!packageName.test(via)||!Object.hasOwn(raw.vulnerabilities,via))refuse();viaPackages.add(via);}
   else{
    if(!record(via)||via.name!==name||!severities.includes(via.severity)||typeof via.url!=='string')refuse();
    const match=advisoryUrl.exec(via.url);if(!match)refuse();ids.add(match[1]);seenAdvisories.add(match[1]);
   }
  }
  findings.push({package:name,severity:row.severity,direct:row.isDirect,versions:[...versions].sort(),instances:nodes.size,runtime,advisories:[...ids].sort(),viaPackages:[...viaPackages].sort()});
 }
 return {packagesAffected:entries.length,counts:Object.fromEntries([...severities,'total'].map(key=>[key,totals[key]])),advisoryIds:[...seenAdvisories].sort(),findings:findings.sort((a,b)=>a.package.localeCompare(b.package))};
}
export function assessAudits(fullRaw,runtimeRaw,lock){
 const full=normalizeAudit(fullRaw,lock),runtime=normalizeAudit(runtimeRaw,lock),fullByName=new Map(full.findings.map(row=>[row.package,row])),runtimeByName=new Map(runtime.findings.map(row=>[row.package,row]));
 for(const row of runtime.findings){const all=fullByName.get(row.package);if(!row.runtime||!all||row.advisories.some(id=>!all.advisories.includes(id)))refuse();}
 for(const row of full.findings)if(row.runtime&&!runtimeByName.has(row.package))refuse();
 return {format:'jobmatch-dependency-audit-v1',assessment:'catalog-snapshot-only',independentSecurityAcceptance:'not-performed',status:runtime.packagesAffected?'runtime-findings':full.packagesAffected?'runtime-clear/full-findings-remain':'catalog-clear',runtime,full};
}
export function auditExit(assessment,requireAll=false){return assessment.runtime.packagesAffected!==0||requireAll&&assessment.full.packagesAffected!==0?1:0;}
function query(runtime){
 const args=['audit','--json','--ignore-scripts','--fetch-retries=0','--fetch-timeout=20000',...(runtime?['--omit=dev']:[])];
 return new Promise((resolve,reject)=>execFile('npm',args,{encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024},(error,stdout)=>{
  if(error&&error.code!==1){reject(Error('Audit unavailable'));return;}
  try{resolve(JSON.parse(stdout));}catch{reject(Error('Audit unavailable'));}
 }));
}
export async function main(){
 const args=process.argv.slice(2);if(args.length>1||args.length===1&&args[0]!=='--require-all')refuse();
 const bytes=await readFile('package-lock.json'),lock=JSON.parse(bytes.toString('utf8'));
 const [full,runtime]=await Promise.all([query(false),query(true)]);
 if(!bytes.equals(await readFile('package-lock.json')))refuse();
 const assessment=assessAudits(full,runtime,lock);
 process.stdout.write(JSON.stringify({...assessment,observedAt:new Date().toISOString(),lockSha256:createHash('sha256').update(bytes).digest('hex'),gate:args.length?'all-dependencies':'runtime-dependencies'})+'\n');
 process.exitCode=auditExit(assessment,args.length===1);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{process.stderr.write('Dependency audit refused or unavailable; no provider diagnostics emitted.\n');process.exitCode=2;});
