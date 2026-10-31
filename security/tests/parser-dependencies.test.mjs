import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{Entry}=require('yauzl'),redirects=require('follow-redirects');
function entry(data){
 const e=new Entry();e.lastModFileDate=((2024-1980)<<9)|(1<<5)|2;e.lastModFileTime=0;e.extraFields=[{id:0x000a,data}];return e;
}
test('malformed NTFS timestamp lengths do not read outside their buffers',()=>{
 for(let length=0;length<=40;length++)assert.equal(entry(Buffer.alloc(length)).getLastModDate({timezone:'UTC'}).toISOString(),'2024-01-02T00:00:00.000Z');
});
test('well-formed NTFS timestamp remains correctly decoded',()=>{
 const data=Buffer.alloc(32);data.writeUInt16LE(1,4);data.writeUInt16LE(24,6);data.writeBigInt64LE((BigInt(Date.UTC(2024,0,2))+11644473600000n)*10000n,8);
 assert.equal(entry(data).getLastModDate({timezone:'UTC'}).toISOString(),'2024-01-02T00:00:00.000Z');
});
test('same-realm and cross-realm sensitiveHeaders strip synthetic credentials on a cross-origin redirect',async()=>{
 const received=[];
 const target=createServer((request,response)=>{received.push(request.headers);response.end('ok');});
 target.listen(0,'127.0.0.1');await once(target,'listening');
 const source=createServer((request,response)=>{response.writeHead(302,{location:'http://127.0.0.1:'+target.address().port+'/'});response.end();});
 source.listen(0,'127.0.0.1');await once(source,'listening');
 try{
  for(const sensitiveHeaders of [['X-API-Key'],runInNewContext("['X-API-Key']")]){
   await new Promise((resolve,reject)=>{
    const request=redirects.http.get('http://127.0.0.1:'+source.address().port+'/',{headers:{'X-API-Key':'SYNTHETIC_ONLY','X-Harmless':'kept'},sensitiveHeaders},response=>{response.resume();response.once('end',resolve);});
    request.once('error',reject);request.setTimeout(2000,()=>request.destroy(Error('Loopback fixture timeout')));
   });
  }
  assert.equal(received.length,2);for(const headers of received){assert.equal(headers['x-api-key'],undefined);assert.equal(headers['x-harmless'],'kept');}
 }finally{source.closeAllConnections();target.closeAllConnections();await Promise.all([new Promise(resolve=>source.close(resolve)),new Promise(resolve=>target.close(resolve))]);}
});
