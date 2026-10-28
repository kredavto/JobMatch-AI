import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {verifiedScannerReady} from '../dist/worker/scanner-attestation.js';
const keys=generateKeyPairSync('ed25519'),publicKey=keys.publicKey.export({type:'spki',format:'pem'}),now=Date.parse('2026-10-28T12:00:00Z');
const policy={now,allowedEngines:['1.4.3'],maxDatabaseAgeMs:86400000,maxObservationAgeMs:30000};
const snapshot={format:'jobmatch-scanner-readiness-v1',ready:true,engine:'1.4.3',loadedDatabaseVersion:1,loadedDatabaseTime:'2026-10-28T11:00:00Z',observedAt:'2026-10-28T11:59:59Z',expiresAt:'2026-10-28T12:00:10Z'};
function envelope(value=snapshot){const bytes=Buffer.from(JSON.stringify(value));return{payload:bytes.toString('base64'),signature:sign(null,Buffer.concat([Buffer.from('jobmatch-scanner-readiness-v1\0'),bytes]),keys.privateKey).toString('base64')};}
test('authentic and fresh report is accepted',()=>assert.equal(verifiedScannerReady(envelope(),publicKey,policy),true));
test('tampered payload, signature, key and extra fields fail closed',()=>{const valid=envelope();for(const value of [{...valid,payload:Buffer.from('{}').toString('base64')},{...valid,signature:Buffer.alloc(64).toString('base64')},{...valid,extra:true},null,{}, {...valid,payload:valid.payload+'\n'}])assert.equal(verifiedScannerReady(value,publicKey,policy),false);const other=generateKeyPairSync('ed25519');assert.equal(verifiedScannerReady(valid,other.publicKey.export({type:'spki',format:'pem'}),policy),false);});
test('correctly signed expired or unsupported report is rejected',()=>{assert.equal(verifiedScannerReady(envelope({...snapshot,expiresAt:'2026-10-28T12:00:00Z'}),publicKey,policy),false);assert.equal(verifiedScannerReady(envelope({...snapshot,engine:'9.9.9'}),publicKey,policy),false);});
