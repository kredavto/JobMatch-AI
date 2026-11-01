import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {parseLoadedVersion,measureLoadedVersion} from '../dist/worker/scanner-measurement.js';
const now=Date.parse('2026-10-28T12:00:00Z'),valid='ClamAV 1.4.6/28000/Wed Oct 28 11:00:00 2026\0';
test('loaded engine version produces a short-lived UTC observation',()=>{const value=parseLoadedVersion(valid,now);assert.equal(value.engine,'1.4.6');assert.equal(value.loadedDatabaseVersion,28000);assert.equal(value.loadedDatabaseTime,'2026-10-28T11:00:00.000Z');assert.equal(Date.parse(value.expiresAt)-now,10000);});
for(const response of ['ClamAV 1.4.6\0',valid+'extra',valid.replace('Wed','Thu'),valid.replace('Oct 28','Feb 31'),valid.replace('11:00','99:00'),valid.replace('/28000/','/0/'),valid.replace('11:00','13:00')])test('rejects incomplete/invalid measurement '+response.length,()=>assert.equal(parseLoadedVersion(response,now),null));
test('queries actual TCP VERSION endpoint with bounded framing',async()=>{const server=createServer(socket=>{socket.on('error',()=>{});socket.once('data',bytes=>{assert.equal(bytes.toString(),'zVERSION\0');socket.end(valid);});});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{const value=await measureLoadedVersion({host:'127.0.0.1',port:server.address().port,now:()=>now});assert.equal(value.loadedDatabaseVersion,28000);}finally{await new Promise(resolve=>server.close(resolve));}});
