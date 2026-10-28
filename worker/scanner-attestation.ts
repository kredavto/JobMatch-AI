import {createPublicKey,verify} from 'node:crypto';
import {scannerSnapshotReady} from './scanner-readiness.js';
type Policy=Parameters<typeof scannerSnapshotReady>[1];
/** Verify bytes before JSON parsing. Public key is operator configuration, never request data. */
export function verifiedScannerReady(envelope:unknown,publicKey:string,policy:Policy):boolean{
 try{
  if(typeof envelope!=='object'||envelope===null||Array.isArray(envelope))return false;
  const fields=Object.keys(envelope).sort();if(fields.join(',')!=='payload,signature')return false;
  const {payload,signature}=envelope as {payload:unknown;signature:unknown};
  if(typeof payload!=='string'||typeof signature!=='string'||payload.length>8192||!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)||!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))return false;
  const bytes=Buffer.from(payload,'base64'),signed=Buffer.from(signature,'base64');
  if(bytes.toString('base64')!==payload||signed.toString('base64')!==signature||signed.length!==64)return false;
  const key=createPublicKey(publicKey);if(key.asymmetricKeyType!=='ed25519')return false;
  const message=Buffer.concat([Buffer.from('jobmatch-scanner-readiness-v1\0'),bytes]);
  if(!verify(null,message,key,signed))return false;
  return scannerSnapshotReady(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),policy);
 }catch{return false;}
}
