import {z} from 'zod';
export const OPS_PREFIX='JOBMATCH_OPS_V1 ';
export const OPS_LIMIT=60;
export const OPS_ROUTES=['ai-review', 'ai-resume-adaptation', 'auth-email', 'fact-history', 'hh-vacancy', 'import', 'letter-versions', 'recovery', 'resume-export', 'service', 'source-profile'] as const;
export type OpsRoute=typeof OPS_ROUTES[number];
export const OPS_BUCKETS=['lt100ms','lt500ms','lt2s','lt10s','ge10s','unknown'] as const;
const minute=z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/).refine(value=>Number.isFinite(Date.parse(value))&&Date.parse(value)>=0&&new Date(value).toISOString().replace('.000Z','Z')===value);
const common={format:z.literal('jobmatch-ops-event-v1'),minute,scope:z.literal('route-handler')};
const route={route:z.enum(OPS_ROUTES),handler:z.enum(['GET','POST']),duration:z.enum(OPS_BUCKETS)};
export const OpsEventSchema=z.discriminatedUnion('kind',[
 z.object({...common,...route,kind:z.literal('returned'),status:z.number().int().min(100).max(599).nullable()}).strict(),
 z.object({...common,...route,kind:z.literal('unhandled'),status:z.null()}).strict(),
 z.object({...common,kind:z.literal('coverage-capped'),limit:z.literal(OPS_LIMIT)}).strict()
]);
export const OPS_STREAM_ROUTES=['fact-history','letter-versions'] as const;
export type OpsStreamRoute=typeof OPS_STREAM_ROUTES[number];
export const OPS_STREAM_OUTCOMES=['completion-enqueued','incomplete-enqueued','cancelled'] as const;
export type OpsStreamOutcome=typeof OPS_STREAM_OUTCOMES[number];
export const OpsStreamEventSchema=z.discriminatedUnion('kind',[
 z.object({format:z.literal('jobmatch-ops-stream-v1'),scope:z.literal('server-stream'),minute,kind:z.literal('terminal'),route:z.enum(OPS_STREAM_ROUTES),handler:z.literal('GET'),duration:z.enum(OPS_BUCKETS),outcome:z.enum(OPS_STREAM_OUTCOMES)}).strict(),
 z.object({format:z.literal('jobmatch-ops-stream-v1'),scope:z.literal('server-stream'),minute,kind:z.literal('coverage-capped'),limit:z.literal(OPS_LIMIT)}).strict()
]);
export const OpsObservationSchema=z.union([OpsEventSchema,OpsStreamEventSchema]);
type State={minute:number;count:number;capped:boolean};
type Options={enabled:()=>boolean;wallNow:()=>number;monotonicNow:()=>number;emit:(line:string)=>void;state?:State};
const fresh=():State=>({minute:-Infinity,count:0,capped:false});
export function durationBucket(value:number):typeof OPS_BUCKETS[number]{
 if(!Number.isFinite(value)||value<0)return 'unknown';
 return value<100?'lt100ms':value<500?'lt500ms':value<2000?'lt2s':value<10000?'lt10s':'ge10s';
}
/** Only trusted static labels and coarse response metadata. No request/error/body inspection. */
export function createOpsObserver(options:Options){
 const state=options.state??fresh();
 const enabled=()=>{try{return options.enabled()===true;}catch{return false;}};
 const clock=()=>{try{const value=options.monotonicNow();return Number.isFinite(value)?value:NaN;}catch{return NaN;}};
 function emitEvent(format:'jobmatch-ops-event-v1'|'jobmatch-ops-stream-v1',scope:'route-handler'|'server-stream',build:()=>object){
  try{
   if(!enabled())return;
   const wall=options.wallNow(),window=Math.floor(wall/60000);
   if(!Number.isFinite(wall)||window<0||window<state.minute)return;
   if(window===state.minute&&state.count>=OPS_LIMIT&&state.capped)return;
   const stamp=new Date(window*60000).toISOString().replace('.000Z','Z');
   if(!minute.safeParse(stamp).success)return;
   if(window>state.minute){state.minute=window;state.count=0;state.capped=false;}
   if(state.count>=OPS_LIMIT){
    if(!state.capped){state.capped=true;options.emit(OPS_PREFIX+JSON.stringify({format,scope,kind:'coverage-capped',minute:stamp,limit:OPS_LIMIT}));}
    return;
   }
   state.count++;
   options.emit(OPS_PREFIX+JSON.stringify({format,scope,minute:stamp,...build()}));
  }catch{/* Clock/sink failure must not alter business results or recursively log data. */}
 }
 function record(route:OpsRoute,handler:'GET'|'POST',kind:'returned'|'unhandled',response:Response|null,elapsed:number){
  if(!OPS_ROUTES.includes(route)||!['GET','POST'].includes(handler))return;
  emitEvent('jobmatch-ops-event-v1','route-handler',()=>{
   const rawStatus=kind==='returned'?response?.status:null;
   const status=typeof rawStatus==='number'&&Number.isInteger(rawStatus)&&rawStatus>=100&&rawStatus<=599?rawStatus:null;
   return {kind,route,handler,status,duration:durationBucket(elapsed)};
  });
 }
 function stream(route:OpsStreamRoute):(outcome:OpsStreamOutcome)=>void{
  if(!enabled()||!OPS_STREAM_ROUTES.includes(route))return ()=>{};
  const start=clock();let finished=false;
  return (outcome:OpsStreamOutcome)=>{
   // Finish before logging: no retries or duplicate terminal event even when capped or sink fails.
   if(finished)return;finished=true;
   if(!OPS_STREAM_OUTCOMES.includes(outcome))return;
   emitEvent('jobmatch-ops-stream-v1','server-stream',()=>({kind:'terminal',route,handler:'GET',outcome,duration:durationBucket(clock()-start)}));
  };
 }
 function observe<A extends unknown[],R extends Response>(route:OpsRoute,handler:'GET'|'POST',run:(...args:A)=>R|Promise<R>){
  return async(...args:A):Promise<R>=>{
   if(!enabled())return run(...args);
   const start=clock();
   try{const response=await run(...args);record(route,handler,'returned',response,clock()-start);return response;}
   catch(error){record(route,handler,'unhandled',null,clock()-start);throw error;}
  };
 };
 return Object.assign(observe,{stream});
}
// Shared best-effort cap in one JS realm. It is not a global/serverless deployment quota.
const storage=globalThis as typeof globalThis&{__jobmatchOpsV1?:State};
storage.__jobmatchOpsV1??=fresh();
export const observeRoute=createOpsObserver({
 enabled:()=>process.env.JOBMATCH_OPS_TELEMETRY==='stdout',
 wallNow:()=>Date.now(),monotonicNow:()=>performance.now(),
 emit:line=>console.info(line),state:storage.__jobmatchOpsV1
});

/** Queue/close or underlying-source cancellation only; never client delivery. */
export const observeStream=observeRoute.stream;
