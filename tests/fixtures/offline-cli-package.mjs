import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const pin=JSON.parse(fs.readFileSync('/recipe/pin.json','utf8'));
try{
 assert.match(pin.exactHead,/^[a-f0-9]{40}$/);
 assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');assert.match(process.version,/^v24\./);assert.equal(process.getuid(),1000);assert.equal(process.getgid(),1000);assert.equal(process.cwd(),'/work');assert.deepEqual(fs.readdirSync('/work'),[]);
 // Preserve the container's existing home, backed by a fresh private tmpfs.
 // No host environment or user configuration is inherited by the CLI child.
 assert.equal(process.env.HOME,'/home/node');assert.deepEqual(fs.readdirSync('/home/node'),[]);
 assert.deepEqual(Object.keys(os.networkInterfaces()),['lo']);
 const status=fs.readFileSync('/proc/self/status','utf8');assert.match(status,/^CapEff:\s+0+$/m);assert.match(status,/^NoNewPrivs:\s+1$/m);
 for(const key of ['SUPABASE_ACCESS_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL','PGPASSWORD','GITHUB_TOKEN'])assert.equal(process.env[key],undefined);
 assert.equal(sha(fs.readFileSync('/cli/supabase')),pin.binarySha256);
 const egressProbe=await new Promise(resolve=>{const socket=net.connect({host:'198.51.100.1',port:443});socket.setTimeout(500);socket.once('error',error=>{socket.destroy();resolve(error.code);});socket.once('connect',()=>{socket.destroy();resolve('UNEXPECTED_CONNECTED');});socket.once('timeout',()=>{socket.destroy();resolve('UNEXPECTED_TIMEOUT');});});
 assert.equal(egressProbe,'ENETUNREACH');
 const commands=[];
 function cli(args){
  const result=spawnSync('/cli/supabase',args,{cwd:'/work',env:{PATH:'/usr/local/bin:/usr/bin:/bin',DO_NOT_TRACK:'1',HOME:process.env.HOME},encoding:'utf8',timeout:20000,maxBuffer:128*1024});
  assert.equal(result.status,0);assert.equal(result.error,undefined);assert.ok(result.stdout.length<128*1024&&result.stderr.length<128*1024);commands.push({args,status:0,stdoutSha256:sha(result.stdout),stderrSha256:sha(result.stderr)});return result.stdout;
 }
 // Command discovery occurs inside the same closed namespace before the write.
 assert.match(cli(['--help']),/migration/);const version=cli(['--version']).trim();assert.equal(version,pin.version);
 assert.match(cli(['migration','--help']),/new/);assert.match(cli(['migration','new','--help']),/migration/);
 const directory='/work/supabase/migrations';if(fs.existsSync(directory))assert.deepEqual(fs.readdirSync(directory),[]);
 cli(['migration','new','reviewed_rewrite_versions']);
 const files=fs.readdirSync(directory);assert.equal(files.length,1);const filename=files[0];assert.match(filename,/^\d{14}_reviewed_rewrite_versions\.sql$/);
 const path=directory+'/'+filename;assert.equal(fs.lstatSync(path).isFile(),true);assert.equal(fs.lstatSync(path).isSymbolicLink(),false);assert.equal(fs.readFileSync(path,'utf8').trim(),'');
 const source=fs.readFileSync('/reviewed/rewrite_versions.sql');assert.equal(sha(source),pin.sourceSha256);const text=new TextDecoder('utf8',{fatal:true}).decode(source),start=text.indexOf('\nbegin;\n');assert.ok(start>0&&start<1024);
 const payload=Buffer.from('-- CLI-created migration shell; reviewed native rewrite source.\n-- Source SHA256: '+pin.sourceSha256+'\n'+text.slice(start+1));
 fs.writeFileSync(path,payload);
 const report={format:'jobmatch-offline-cli-package-v1',exactHead:pin.exactHead,cliVersion:version,cliArchiveSha256:pin.archiveSha256,cliBinarySha256:pin.binarySha256,sourceSha256:pin.sourceSha256,migrationFilename:filename,migrationSha256:sha(payload),migrationGitBlobSha1:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+payload.length+'\0'),payload])).digest('hex'),networkInterfaces:Object.keys(os.networkInterfaces()),egressProbe,uid:process.getuid(),capEff:'0',noNewPrivileges:true,commands};
 fs.writeFileSync('/work/manifest.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});process.stdout.write('JOBMATCH_OFFLINE_CLI_ARTIFACT_V1 '+JSON.stringify(report)+'\n');
}catch{process.stderr.write('OFFLINE_CLI_PACKAGE_REFUSED\n');process.exitCode=2;}
finally{
 // CLI-created directories belong to container uid1000, while the CI runner
 // may have a different uid. Permit cleanup of this fresh public-source tree
 // only; never follow symlinks or change an existing/host project directory.
 try{const release=path=>{const info=fs.lstatSync(path);if(!info.isDirectory()||info.isSymbolicLink())return;for(const name of fs.readdirSync(path))release(path+'/'+name);if(info.uid===process.getuid())fs.chmodSync(path,0o777);};release('/work');}
 catch{process.stderr.write('OFFLINE_CLI_CLEANUP_REFUSED\n');process.exitCode=2;}
}
