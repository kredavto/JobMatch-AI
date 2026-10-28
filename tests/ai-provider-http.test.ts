import {createServer} from 'node:http';
import {afterEach,it,expect,vi} from 'vitest';
import {aiReview} from '../lib/ai-provider';
afterEach(()=>vi.unstubAllEnvs());
it('talks to a real local HTTP fixture using Ollama JSON protocol',async()=>{
 const bodies:unknown[]=[];
 const server=createServer((req,res)=>{let data='';req.on('data',chunk=>{data+=chunk;});req.on('end',()=>{bodies.push(JSON.parse(data));expect(req.method).toBe('POST');expect(req.url).toBe('/api/chat');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({done:true,done_reason:'stop',message:{role:'assistant',content:'{"requirements":[{"quote":"SQL","evidence_ids":["f1"]}]}'}}));});});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const address=server.address();if(!address||typeof address==='string')throw new Error('Fixture server unavailable');
  vi.stubEnv('JOBMATCH_AI_TOKEN','');vi.stubEnv('NODE_ENV','test');vi.stubEnv('JOBMATCH_AI_ENABLED','true');vi.stubEnv('JOBMATCH_AI_SELF_HOSTED','true');vi.stubEnv('JOBMATCH_AI_MODEL','fixture');vi.stubEnv('JOBMATCH_AI_ENDPOINT',`http://127.0.0.1:${address.port}/api/chat`);
  expect(await aiReview([{id:'f1',text:'SQL',verified:true,source:'fixture'}],'SQL',new AbortController().signal)).toEqual({requirements:[{quote:'SQL',evidence_ids:['f1']}]});expect(bodies).toHaveLength(1);
 }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
