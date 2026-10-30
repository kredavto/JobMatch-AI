import {afterEach,it,expect,vi} from 'vitest';
import {createOpsObserver,observeRoute,OpsEventSchema,OPS_PREFIX,OPS_LIMIT,durationBucket,type OpsRoute} from '../lib/ops-telemetry';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
const fixture=()=>{
 let wall=Date.parse('2026-10-30T13:00:00Z'),tick=0,enabled=true;const lines:string[]=[];
 const observe=createOpsObserver({enabled:()=>enabled,wallNow:()=>wall,monotonicNow:()=>tick++,emit:line=>{lines.push(line);}});
 return {observe,lines,setWall:(value:number)=>{wall=value;},disable:()=>{enabled=false;},events:()=>lines.map(line=>OpsEventSchema.parse(JSON.parse(line.slice(OPS_PREFIX.length))))};
};
it.each([[NaN,'unknown'],[Infinity,'unknown'],[-1,'unknown'],[0,'lt100ms'],[99.99,'lt100ms'],[100,'lt500ms'],[499.99,'lt500ms'],[500,'lt2s'],[1999.99,'lt2s'],[2000,'lt10s'],[9999.99,'lt10s'],[10000,'ge10s']])('uses bounded duration bucket for %s', (value,expected)=>expect(durationBucket(value as number)).toBe(expected));
it('disabled observers do not inspect arguments, response, clocks or sink and invoke exactly once',async()=>{
 const clock=vi.fn(()=>{throw Error('must not read');}),emit=vi.fn();
 const observe=createOpsObserver({enabled:()=>false,wallNow:clock,monotonicNow:clock,emit});
 const request=new Proxy({},{get(){throw Error('PRIVATE_REQUEST');}}),response=new Response('body');
 Object.defineProperty(response,'status',{get(){throw Error('PRIVATE_STATUS');}});
 const run=vi.fn(async(_request:unknown)=>{void _request;return response;});
 expect(await observe('service','GET',run)(request)).toBe(response);expect(run).toHaveBeenCalledTimes(1);expect(clock).not.toHaveBeenCalled();expect(emit).not.toHaveBeenCalled();
});
it('emits only fixed metadata, preserves response/cookies/stream without reading private request or response content',async()=>{
 const f=fixture(),privateRequest=new Proxy({},{get(){throw Error('PRIVATE_REQUEST');}});
 const response=new Response('PRIVATE_RESPONSE',{status:409,headers:{'Set-Cookie':'secret=PRIVATE_COOKIE'}});
 const run=vi.fn(async(_request:unknown)=>{void _request;return response;});expect(await f.observe('service','POST',run)(privateRequest)).toBe(response);
 expect(response.bodyUsed).toBe(false);expect(response.headers.get('set-cookie')).toBe('secret=PRIVATE_COOKIE');expect(await response.text()).toBe('PRIVATE_RESPONSE');
 expect(f.events()).toEqual([{format:'jobmatch-ops-event-v1',scope:'route-handler',kind:'returned',minute:'2026-10-30T13:00:00Z',route:'service',handler:'POST',status:409,duration:'lt100ms'}]);
 expect(f.lines.join('')).not.toContain('PRIVATE');expect(run).toHaveBeenCalledTimes(1);
});
it('unhandled errors are rethrown by identity without reading name/message/stack/cause',async()=>{
 const f=fixture();let reads=0;
 const error=new Proxy({},{get(){reads++;throw Error('PRIVATE_ERROR');}});let caught:unknown;
 try{await f.observe('import','POST',async()=>{throw error;})();}catch(value){caught=value;}
 expect(caught).toBe(error);expect(reads).toBe(0);expect(f.events()[0]).toMatchObject({kind:'unhandled',status:null});expect(f.lines.join('')).not.toContain('PRIVATE');
});
it('stdout failure never changes a response or original thrown error and is not retried',async()=>{
 const emit=vi.fn(()=>{throw Error('PRIVATE_SINK');}),observe=createOpsObserver({enabled:()=>true,wallNow:()=>Date.parse('2026-10-30T13:00:00Z'),monotonicNow:()=>0,emit});
 const response=new Response('body');expect(await observe('service','GET',async()=>response)()).toBe(response);
 const original={secret:'PRIVATE_THROW'};let caught:unknown;try{await observe('service','POST',async()=>{throw original;})();}catch(value){caught=value;}
 expect(caught).toBe(original);expect(emit).toHaveBeenCalledTimes(2);
});
it('caps a realm minute at60 observations plus one explicit coverage marker; reset and clock rollback remain bounded',async()=>{
 const f=fixture(),run=f.observe('service','GET',async()=>new Response(null,{status:401}));
 for(let i=0;i<OPS_LIMIT+20;i++)expect((await run()).status).toBe(401);
 expect(f.events()).toHaveLength(OPS_LIMIT+1);expect(f.events().at(-1)).toMatchObject({kind:'coverage-capped',limit:60});
 f.setWall(Date.parse('2026-10-30T13:01:00Z'));await run();expect(f.events()).toHaveLength(OPS_LIMIT+2);
 f.setWall(Date.parse('2026-10-30T13:00:30Z'));await run();expect(f.events()).toHaveLength(OPS_LIMIT+2);
});
it('a mode change during an awaited request stops emission without claiming cancellation',async()=>{
 const f=fixture();let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 const response=new Response('saved'),pending=f.observe('service','POST',async()=>{await held;return response;})();
 f.disable();release();expect(await pending).toBe(response);expect(f.lines).toEqual([]);
});
it('does not consume or observe later stream failures as completed operations',async()=>{
 const f=fixture(),response=new Response(new ReadableStream({pull(){throw Error('PRIVATE_STREAM_FAILURE');}}));
 expect(await f.observe('fact-history','GET',async()=>response)()).toBe(response);expect(response.bodyUsed).toBe(false);
 expect(f.events()).toHaveLength(1);expect(f.events()[0]).toMatchObject({kind:'returned',status:200});
 await expect(response.text()).rejects.toThrow('PRIVATE_STREAM_FAILURE');expect(f.events()).toHaveLength(1);expect(f.lines.join('')).not.toContain('PRIVATE');
});
it.each(['off','STDOUT','true','1',''])('the production flag %j fails closed',async mode=>{
 vi.stubEnv('JOBMATCH_OPS_TELEMETRY',mode);const sink=vi.spyOn(console,'info').mockImplementation(()=>{});
 const response=new Response(null,{status:401});expect(await observeRoute('service','GET',async()=>response)()).toBe(response);expect(sink).not.toHaveBeenCalled();
});
it('the exact stdout production flag enables schema-valid output only',async()=>{
 vi.stubEnv('JOBMATCH_OPS_TELEMETRY','stdout');const sink=vi.spyOn(console,'info').mockImplementation(()=>{});
 await observeRoute('service','GET',async()=>new Response(null,{status:503}))();
 expect(sink).toHaveBeenCalledTimes(1);expect(OpsEventSchema.parse(JSON.parse(sink.mock.calls[0][0].slice(OPS_PREFIX.length)))).toMatchObject({kind:'returned',status:503});
});
it('invalid labels, broken wall clocks and broken clocks never fail the business call or serialize unknown input',async()=>{
 const lines:string[]=[],response=new Response(null,{status:200});
 const make=(wallNow:()=>number,monotonicNow=()=>0)=>createOpsObserver({enabled:()=>true,wallNow,monotonicNow,emit:line=>{lines.push(line);}});
 expect(await make(()=>Date.now())('PRIVATE_ROUTE' as OpsRoute,'GET',async()=>response)()).toBe(response);
 expect(await make(()=>{throw Error('PRIVATE_CLOCK');})('service','GET',async()=>response)()).toBe(response);
 expect(lines).toEqual([]);
 await make(()=>Date.parse('2026-10-30T13:00:00Z'),()=>{throw Error('PRIVATE_MONOTONIC');})('service','GET',async()=>response)();
 expect(JSON.parse(lines[0].slice(OPS_PREFIX.length)).duration).toBe('unknown');expect(lines.join('')).not.toContain('PRIVATE');
});
it('unknown response status is explicit and schemas reject extra fields or untrusted labels',async()=>{
 const f=fixture();await f.observe('service','GET',async()=>Response.error())();
 expect(f.events()[0]).toMatchObject({status:null});
 for(const event of [{...f.events()[0],email:'PRIVATE'},{...f.events()[0],route:'PRIVATE'},{...f.events()[0],handler:'PRIVATE'},{...f.events()[0],duration:'123ms'}])expect(OpsEventSchema.safeParse(event).success).toBe(false);
});
