import {createServer} from 'node:http';
import {createPrivateKey,sign} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {assertRuntimeEnvironment} from './runtime-environment.js';
import {assertContainerLimits} from './container-limits.js';
import {measureLoadedVersion} from './scanner-measurement.js';
import {scannerSnapshotReady} from './scanner-readiness.js';
// This service never receives documents. Mount this key only into the observer.
const keyPath='/run/secrets/scanner_observer_key';
let key:ReturnType<typeof createPrivateKey>;
try{assertRuntimeEnvironment('observer');assertContainerLimits(undefined,'observer');if(process.env.SCANNER_TIMEZONE_UTC_CONFIRMED!=='true')throw Error();key=createPrivateKey(readFileSync(keyPath));if(key.asymmetricKeyType!=='ed25519')throw Error();}catch{process.stderr.write('Invalid observer deployment\n');process.exit(1);}
const allowedEngines=(process.env.SCANNER_ALLOWED_ENGINES??'').split(',').filter(Boolean);
if(!allowedEngines.length||allowedEngines.some(value=>!/^\d+\.\d+\.\d+$/.test(value))){process.stderr.write('Invalid observer engine policy\n');process.exit(1);}
let active=false;
const server=createServer(async(req,res)=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Connection':'close'};
 if(req.method!=='GET'||req.url!=='/readiness'){res.writeHead(404,headers);res.end('{}');return;}
 if(active){res.writeHead(503,headers);res.end('{}');return;}active=true;
 try{
  const snapshot=await measureLoadedVersion();
  if(!scannerSnapshotReady(snapshot,{now:Date.now(),allowedEngines,maxDatabaseAgeMs:86400000,maxObservationAgeMs:30000}))throw Error();
  const bytes=Buffer.from(JSON.stringify(snapshot));const signature=sign(null,Buffer.concat([Buffer.from('jobmatch-scanner-readiness-v1\0'),bytes]),key).toString('base64');
  res.writeHead(200,headers);res.end(JSON.stringify({payload:bytes.toString('base64'),signature}));
 }catch{res.writeHead(503,headers);res.end('{}');}finally{active=false;}
});
server.headersTimeout=1000;server.requestTimeout=1000;server.maxConnections=8;server.maxRequestsPerSocket=1;
server.listen(8080,'0.0.0.0');
