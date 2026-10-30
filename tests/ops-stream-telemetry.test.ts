import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createOpsObserver,OPS_PREFIX,OpsStreamEventSchema,OpsObservationSchema,type OpsStreamOutcome} from '../lib/ops-telemetry';
import {historyStream} from '../lib/history-stream';
import {structuredVersionStream} from '../lib/structured-version-db';
import {reminderExportStream} from '../lib/reminders-db';
import {board,history} from './fixtures/reminders';
import {owner,versionFor} from './fixtures/structured-version';
import type {VersionList} from '../lib/structured-version';
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
 const done=observe.stream('reminders');expect(()=>done('cancelled')).not.toThrow();done('incomplete-enqueued');expect(emit).toHaveBeenCalledTimes(1);
});
it('disabled construction reads no clocks and cannot become enabled later',()=>{
 const mono=vi.fn(()=>{throw Error();}),emit=vi.fn();let enabled=false;
 const observe=createOpsObserver({enabled:()=>enabled,wallNow:mono,monotonicNow:mono,emit}),finish=observe.stream('fact-history');
 enabled=true;finish('cancelled');expect(mono).not.toHaveBeenCalled();expect(emit).not.toHaveBeenCalled();
});
it('midstream disable suppresses outcome without cancellation or later replay',()=>{
 const f=fixture(),finish=f.observe.stream('reminders');f.on(false);finish('completion-enqueued');f.on(true);finish('cancelled');expect(f.lines).toEqual([]);
});
it('headers and terminals share the 60 event budget and one marker, rollback does not reset it',async()=>{
 const f=fixture();
 for(let i=0;i<30;i++){await f.observe('service','GET',()=>new Response())();f.observe.stream('fact-history')('completion-enqueued');}
 f.observe.stream('reminders')('cancelled');await f.observe('service','GET',()=>new Response())();
 expect(f.lines).toHaveLength(61);expect(JSON.parse(f.lines[60].slice(OPS_PREFIX.length))).toMatchObject({format:'jobmatch-ops-stream-v1',kind:'coverage-capped',limit:60});
 f.wall(Date.parse(stamp)-60000);f.observe.stream('reminders')('cancelled');expect(f.lines).toHaveLength(61);
 f.wall(Date.parse(stamp)+60000);f.observe.stream('reminders')('cancelled');expect(f.lines).toHaveLength(62);
});
it('invalid labels, outcomes and failing clocks cannot introduce unbounded event fields',()=>{
 const f=fixture();f.observe.stream('private' as 'reminders')('cancelled');
 f.observe.stream('reminders')('secret' as OpsStreamOutcome);expect(f.lines).toEqual([]);
 const emit=vi.fn(),observe=createOpsObserver({enabled:()=>true,wallNow:()=>{throw Error('clock');},monotonicNow:()=>0,emit});
 expect(()=>observe.stream('reminders')('cancelled')).not.toThrow();expect(emit).not.toHaveBeenCalled();
});
describe('actual export source branches with native ReadableStream',()=>{
 let lines:string[]=[];
 beforeEach(()=>{
  lines=[];vi.stubEnv('JOBMATCH_OPS_TELEMETRY','stdout');
  const state=(globalThis as typeof globalThis&{__jobmatchOpsV1:{minute:number;count:number;capped:boolean}}).__jobmatchOpsV1;
  Object.assign(state,{minute:-Infinity,count:0,capped:false});
  vi.spyOn(console,'info').mockImplementation((value:unknown)=>{lines.push(String(value));});
 });
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
 function outcomes(){return lines.map(line=>OpsStreamEventSchema.parse(JSON.parse(line.slice(OPS_PREFIX.length)))).map(event=>event.kind==='terminal'?event.outcome:event.kind);}
 async function factories(){
  const v=await versionFor();const list:VersionList={format:'jobmatch-structured-version-list-v1',ownerId:owner,versions:[{id:v.id,created:v.created,template_version:v.template_version,profile_revision:2,workspace_revision:1,text_length:Array.from(v.text).length,preview_hash:v.preview_hash}]};
  return [
   {route:'fact-history',ok:()=>historyStream({rows:[row],next:null},async()=>({rows:[],next:null})),bad:()=>historyStream({rows:[row],next:1},async()=>{throw Error('private diagnostic');}),limit:()=>historyStream({rows:[row],next:null},vi.fn(),{rows:0,bytes:0}),empty:()=>historyStream({rows:[],next:null},vi.fn())},
   {route:'structured-versions',ok:()=>structuredVersionStream(list,async()=>v),bad:()=>structuredVersionStream(list,async()=>({...v,preview_hash:'a'.repeat(64)})),limit:()=>structuredVersionStream(list,async()=>v,1),empty:()=>structuredVersionStream({...list,versions:[]},vi.fn())},
   {route:'reminders',ok:()=>reminderExportStream(board,async()=>history,async()=>board),bad:()=>reminderExportStream(board,async()=>history,async()=>({...board,revision:board.revision+1})),limit:()=>reminderExportStream(board,async()=>history,async()=>board,1),empty:()=>reminderExportStream({...board,reminders:[]},vi.fn(),async()=>({...board,reminders:[]}))}
  ];
 }
 it('each full/empty export enqueues the original complete footer and exactly one terminal',async()=>{
  for(const f of await factories())for(const make of [f.ok,f.empty]){
   lines=[];const text=await new Response(make()).text();expect(text.trim().split('\n').map(line=>JSON.parse(line)).at(-1)).toMatchObject({complete:true});
   expect(outcomes()).toEqual(['completion-enqueued']);expect(lines[0]).not.toContain(owner);expect(JSON.parse(lines[0].slice(OPS_PREFIX.length)).route).toBe(f.route);
  }
 });
 it('detail/source mismatch, final revision change and byte/row bounds report incomplete after 200',async()=>{
  for(const f of await factories())for(const make of [f.bad,f.limit]){
   lines=[];const response=new Response(make());expect(response.status).toBe(200);const text=await response.text();
   expect(text).toContain('"complete":false');expect(text).not.toContain('"complete":true');expect(text).not.toContain('private diagnostic');expect(outcomes()).toEqual(['incomplete-enqueued']);
  }
 });
 it('cancellation before first pull inspects neither reason nor error properties',async()=>{
  const reason=new Proxy({},{get(){throw Error('reason inspected');}});
  for(const f of await factories()){lines=[];const stream=f.ok();await stream.cancel(reason);expect(outcomes()).toEqual(['cancelled']);}
 });
 it('cancellation of each held read discards late resolution/rejection without duplicate outcome',async()=>{
  const v=await versionFor();const list:VersionList={format:'jobmatch-structured-version-list-v1',ownerId:owner,versions:[{id:v.id,created:v.created,template_version:v.template_version,profile_revision:2,workspace_revision:1,text_length:Array.from(v.text).length,preview_hash:v.preview_hash}]};
  for(const reject of [false,true])for(const kind of ['history','version','reminder','recheck']){
   lines=[];let settle!:(value:never)=>void;
   const held=new Promise<never>((resolve,fail)=>{settle=reject?fail:resolve;});
   const read=vi.fn(()=>held),recheck=vi.fn(()=>held);
   const stream=kind==='history'?historyStream({rows:[],next:1},read):kind==='version'?structuredVersionStream(list,read):kind==='reminder'?reminderExportStream(board,read,async()=>board):reminderExportStream({...board,reminders:[]},vi.fn(),recheck);
   const reader=stream.getReader(),pending=reader.read();await Promise.resolve();await reader.cancel(new Proxy({},{get(){throw Error();}}));settle({} as never);
   expect((await pending).done).toBe(true);await Promise.resolve();expect(outcomes()).toEqual(['cancelled']);
  }
 });
 it('disabled telemetry preserves exact export bytes and logging failure cannot change footer',async()=>{
  for(const f of await factories()){
   vi.stubEnv('JOBMATCH_OPS_TELEMETRY','off');const before=await new Response(f.ok()).text();
   vi.stubEnv('JOBMATCH_OPS_TELEMETRY','stdout');vi.mocked(console.info).mockImplementation(()=>{throw Error('sink');});
   expect(await new Response(f.ok()).text()).toBe(before);
  }
 });
 it('native helper events pass the Python reader and failed-after-200 file check alerts',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'jobmatch-stream-'));
  try{
   const f=(await factories())[0];const response=new Response(f.bad());expect(response.status).toBe(200);await response.text();
   // Only bounded event lines cross the language boundary, never the export body.
   const path=join(dir,'events.jsonl');writeFileSync(path,lines.join('\n')+'\n',{mode:0o600});
   const result=spawnSync('python3',['scripts/ops_report.py','stream-check',path,'--min-streams','1','--max-incomplete-fraction','0','--max-cancelled-fraction','0','--max-age-seconds','120'],{encoding:'utf8',timeout:10000});
   expect(result.status).toBe(1);expect(result.stderr).toBe('');const report=JSON.parse(result.stdout);
   expect(report.breaches).toEqual(['observed-incomplete']);expect(report.clientDelivery).toBe('not-established');
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
});
