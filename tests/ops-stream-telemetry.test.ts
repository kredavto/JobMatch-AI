import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createOpsObserver,observeRoute,OPS_PREFIX,OpsStreamEventSchema,OpsObservationSchema,type OpsStreamOutcome} from '../lib/ops-telemetry';
import {historyStream} from '../lib/history-stream';
import {savedLetterStream} from '../lib/saved-letter-stream';
import {owner,savedFixture,emptyState} from './saved-letter-fixture';
const row={id:1,workspace_revision:1,kind:'change' as const,captured_at:'2026-10-25T00:00:00Z',facts:[]};
const stamp='2026-10-30T14:00:00Z';
function fixture(){
 const lines:string[]=[];let on=true,wall=Date.parse(stamp),mono=0;
 const observe=createOpsObserver({enabled:()=>on,wallNow:()=>wall,monotonicNow:()=>mono,emit:line=>{lines.push(line);}});
 return {lines,observe,on:(value:boolean)=>{on=value;},tick:(value:number)=>{mono=value;},wall:(value:number)=>{wall=value;}};
}
it('strict stream schema refuses identifiers, status, foreign route and false delivery labels',()=>{
 const base={format:'jobmatch-ops-stream-v1',scope:'server-stream',minute:stamp,kind:'terminal',route:'fact-history',handler:'GET',duration:'lt100ms',outcome:'completion-enqueued'};
 expect(OpsStreamEventSchema.parse(base)).toEqual(base);expect(OpsObservationSchema.parse(base)).toEqual(base);
 for(const bad of [{...base,status:200},{...base,ownerId:owner},{...base,route:'auth-email'},{...base,handler:'POST'},{...base,outcome:'delivered'},{...base,minute:'2026-02-30T14:00:00Z'}])expect(OpsStreamEventSchema.safeParse(bad).success).toBe(false);
});
it('one terminal per stream, including capped/failed sinks; duration starts at construction',()=>{
 const f=fixture(),finish=f.observe.stream('fact-history');f.tick(2000);finish('incomplete-enqueued');finish('cancelled');
 expect(f.lines).toHaveLength(1);expect(JSON.parse(f.lines[0].slice(OPS_PREFIX.length))).toMatchObject({duration:'lt10s',outcome:'incomplete-enqueued'});
 const emit=vi.fn(()=>{throw Error('private sink');}),observe=createOpsObserver({enabled:()=>true,wallNow:()=>Date.parse(stamp),monotonicNow:()=>0,emit});
 const done=observe.stream('letter-versions');expect(()=>done('cancelled')).not.toThrow();done('incomplete-enqueued');expect(emit).toHaveBeenCalledTimes(1);
});
it('disabled construction reads no clocks and cannot become enabled later',()=>{
 const mono=vi.fn(()=>{throw Error();}),emit=vi.fn();let enabled=false;
 const observe=createOpsObserver({enabled:()=>enabled,wallNow:mono,monotonicNow:mono,emit}),finish=observe.stream('fact-history');
 enabled=true;finish('cancelled');expect(mono).not.toHaveBeenCalled();expect(emit).not.toHaveBeenCalled();
});
it('midstream disable suppresses outcome without cancellation or later replay',()=>{
 const f=fixture(),finish=f.observe.stream('letter-versions');f.on(false);finish('completion-enqueued');f.on(true);finish('cancelled');expect(f.lines).toEqual([]);
});
it('headers and terminals share the 60 event budget and one marker, rollback does not reset it',async()=>{
 const f=fixture();
 for(let i=0;i<30;i++){await f.observe('service','GET',()=>new Response())();f.observe.stream('fact-history')('completion-enqueued');}
 f.observe.stream('letter-versions')('cancelled');await f.observe('service','GET',()=>new Response())();
 expect(f.lines).toHaveLength(61);expect(JSON.parse(f.lines[60].slice(OPS_PREFIX.length))).toMatchObject({format:'jobmatch-ops-stream-v1',kind:'coverage-capped',limit:60});
 f.wall(Date.parse(stamp)-60000);f.observe.stream('letter-versions')('cancelled');expect(f.lines).toHaveLength(61);
 f.wall(Date.parse(stamp)+60000);f.observe.stream('letter-versions')('cancelled');expect(f.lines).toHaveLength(62);
});
it('invalid labels, outcomes and failing clocks cannot introduce unbounded event fields',()=>{
 const f=fixture();f.observe.stream('private' as 'letter-versions')('cancelled');
 f.observe.stream('letter-versions')('secret' as OpsStreamOutcome);expect(f.lines).toEqual([]);
 const emit=vi.fn(),observe=createOpsObserver({enabled:()=>true,wallNow:()=>{throw Error('clock');},monotonicNow:()=>0,emit});
 expect(()=>observe.stream('letter-versions')('cancelled')).not.toThrow();expect(emit).not.toHaveBeenCalled();
});

describe('current history and saved-letter source branches',()=>{
 let lines:string[]=[];
 beforeEach(()=>{
  lines=[];vi.stubEnv('JOBMATCH_OPS_TELEMETRY','stdout');
  const state=(globalThis as typeof globalThis&{__jobmatchOpsV1:{minute:number;count:number;capped:boolean}}).__jobmatchOpsV1;
  Object.assign(state,{minute:-Infinity,count:0,capped:false});vi.spyOn(console,'info').mockImplementation(value=>{lines.push(String(value));});
 });
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
 function outcomes(){return lines.map(line=>OpsStreamEventSchema.parse(JSON.parse(line.slice(OPS_PREFIX.length)))).map(e=>e.kind==='terminal'?e.outcome:e.kind);}
 async function factories(){
  const {record,state}=await savedFixture();
  return [
   {route:'fact-history',ok:()=>historyStream({rows:[row],next:null},vi.fn()),empty:()=>historyStream({rows:[],next:null},vi.fn()),bad:()=>historyStream({rows:[row],next:1},async()=>{throw Error('PRIVATE_READ');}),limit:()=>historyStream({rows:[row],next:null},vi.fn(),{rows:0,bytes:0})},
   {route:'letter-versions',ok:()=>savedLetterStream(state,async()=>record),empty:()=>savedLetterStream(emptyState,vi.fn()),bad:()=>savedLetterStream(state,async()=>{throw Error('PRIVATE_READ');}),limit:()=>savedLetterStream(state,async()=>({...record,payloadSha256:'0'.repeat(64)}))}
  ];
 }
 it('full and empty archives preserve complete footer and produce one terminal only',async()=>{
  for(const f of await factories())for(const make of [f.ok,f.empty]){
   lines=[];const text=await new Response(make()).text();expect(JSON.parse(text.trim().split('\n').at(-1)!)).toMatchObject({complete:true});
   expect(outcomes()).toEqual(['completion-enqueued']);expect(JSON.parse(lines[0].slice(OPS_PREFIX.length)).route).toBe(f.route);expect(lines.join('')).not.toContain(owner);
  }
 });
 it('read/hash mismatch and row/byte limits report incomplete after HTTP200 without raw diagnostics',async()=>{
  for(const f of await factories())for(const make of [f.bad,f.limit]){
   lines=[];const response=new Response(make());expect(response.status).toBe(200);const text=await response.text();
   expect(text).toContain('"complete":false');expect(text).not.toContain('"complete":true');expect(text).not.toContain('PRIVATE');expect(outcomes()).toEqual(['incomplete-enqueued']);
  }
 });
 it('source cancellation never inspects a private reason and is terminal exactly once',async()=>{
  const reason=new Proxy({},{get(){throw Error('PRIVATE_REASON');}});
  for(const f of await factories()){lines=[];await f.ok().cancel(reason);expect(outcomes()).toEqual(['cancelled']);}
 });
 it.each([false,true])('held reads discard late reply/rejection after cancellation: %s',async reject=>{
  const {state,record}=await savedFixture();
  for(const kind of ['history','letter']){
   lines=[];let settle!:(value:unknown)=>void;const read=vi.fn(()=>new Promise<never>((resolve,rejectPromise)=>{settle=value=>{if(reject)rejectPromise(value);else resolve(value as never);};}));
   const stream=kind==='history'?historyStream({rows:[row],next:1},read):savedLetterStream(state,read),reader=stream.getReader();
   await reader.read();const pending=reader.read();await vi.waitFor(()=>expect(read).toHaveBeenCalledTimes(1));
   await reader.cancel(new Proxy({},{get(){throw Error('PRIVATE_REASON');}}));settle(reject?Error('PRIVATE_LATE'):kind==='history'?{rows:[],next:null}:record);
   expect((await pending).done).toBe(true);expect((await reader.read()).done).toBe(true);expect(read).toHaveBeenCalledTimes(1);expect(outcomes()).toEqual(['cancelled']);
  }
 });
 it('request abort before pull or during held letter read never becomes completion',async()=>{
  const {state,record}=await savedFixture();
  for(const held of [false,true]){
   lines=[];const controller=new AbortController();let resolve!:(value:unknown)=>void;
   const read=vi.fn(()=>new Promise(r=>{resolve=r;}));if(!held)controller.abort(new Proxy({},{get(){throw Error('PRIVATE_ABORT');}}));
   const stream=savedLetterStream(state,read,controller.signal),reader=stream.getReader();
   if(held){await reader.read();const pending=reader.read();await vi.waitFor(()=>expect(read).toHaveBeenCalledTimes(1));controller.abort();resolve(record);expect((await pending).done).toBe(true);}else expect((await reader.read()).done).toBe(true);
   expect(outcomes()).toEqual(['cancelled']);
  }
 });
 it('off mode and throwing sink preserve exact current archive bytes',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date(stamp));
  try{for(const f of await factories()){
   vi.stubEnv('JOBMATCH_OPS_TELEMETRY','off');const original=await new Response(f.ok()).text();
   vi.stubEnv('JOBMATCH_OPS_TELEMETRY','stdout');vi.mocked(console.info).mockImplementation(()=>{throw Error('PRIVATE_SINK');});
   expect(await new Response(f.ok()).text()).toBe(original);
  }}finally{vi.useRealTimers();}
 });
 it('actual native stream failure after200 is observed-alert in real file-only CLI, not delivery proof',async()=>{
  const f=(await factories())[0];await observeRoute('fact-history','GET',()=>new Response(f.bad()))().then(r=>r.text());
  const dir=mkdtempSync(join(tmpdir(),'jobmatch-ops-current-'));
  try{
   const file=join(dir,'events.log');writeFileSync(file,lines.join('\n')+'\n');
   const result=spawnSync('python3',['scripts/ops_report.py','stream-check',file,'--route','fact-history','--min-streams','1','--max-incomplete-fraction','0','--max-cancelled-fraction','0','--max-age-seconds','120'],{encoding:'utf8'});
   expect(result.status).toBe(1);const report=JSON.parse(result.stdout);expect(report.verdict).toBe('observed-alert');expect(report.clientDelivery).toBe('not-established');expect(result.stdout+result.stderr).not.toContain('PRIVATE');
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
});
