import test from 'node:test';
import assert from 'node:assert/strict';
import {scannerSnapshotReady} from '../dist/worker/scanner-readiness.js';
const now=Date.parse('2026-10-28T12:00:00Z'),iso=n=>new Date(n).toISOString();
const policy={now,allowedEngines:['1.4.3'],maxDatabaseAgeMs:86400000,maxObservationAgeMs:30000};
const snapshot={format:'jobmatch-scanner-readiness-v1',ready:true,engine:'1.4.3',loadedDatabaseVersion:1,loadedDatabaseTime:iso(now-3600000),observedAt:iso(now-1000),expiresAt:iso(now+10000)};
test('explicitly allowed engine with fresh loaded database and observation is ready',()=>assert.equal(scannerSnapshotReady(snapshot,policy),true));
for(const patch of [{ready:false},{engine:'9.9.9'},{loadedDatabaseVersion:0},{loadedDatabaseTime:iso(now-86400001)},{loadedDatabaseTime:iso(now+1)},{observedAt:iso(now+1)},{observedAt:iso(now-30001)},{expiresAt:iso(now)},{expiresAt:iso(now+60000)},{downloadedAt:iso(now)},{loadedDatabaseTime:'invalid'}])test('rejects untrusted/stale state '+JSON.stringify(patch),()=>assert.equal(scannerSnapshotReady({...snapshot,...patch},policy),false));
test('missing snapshot and invalid policy never grant readiness',()=>{for(const value of [null,{},undefined,'ready'])assert.equal(scannerSnapshotReady(value,policy),false);for(const patch of [{now:NaN},{maxDatabaseAgeMs:0},{maxObservationAgeMs:-1},{allowedEngines:[]}])assert.equal(scannerSnapshotReady(snapshot,{...policy,...patch}),false);});
