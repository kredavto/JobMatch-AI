import {z} from 'zod';
export const OPS_PREFIX='JOBMATCH_OPS_V1 ';
export const OPS_LIMIT=60;
export const OPS_ROUTES=['ai-review','auth-email','consent-receipts','fact-history','import','recovery','reminders','resume-export','service','structured-profile','structured-versions'] as const;
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
 function record(route:OpsRoute,handler:'GET'|'POST',kind:'returned'|'unhandled',response:Response|null,elapsed:number){
  try{
   if(!enabled()||!OPS_ROUTES.includes(route)||!['GET','POST'].includes(handler))return;
   const wall=options.wallNow(),window=Math.floor(wall/60000);
   if(!Number.isFinite(wall)||window<0||window<state.minute)return;
   if(window===state.minute&&state.count>=OPS_LIMIT&&state.capped)return;
   const stamp=new Date(window*60000).toISOString().replace('.000Z','Z');
   if(!minute.safeParse(stamp).success)return;
   if(window>state.minute){state.minute=window;state.count=0;state.capped=false;}
   if(state.count>=OPS_LIMIT){
    if(!state.capped){state.capped=true;options.emit(OPS_PREFIX+JSON.stringify({format:'jobmatch-ops-event-v1',scope:'route-handler',kind:'coverage-capped',minute:stamp,limit:OPS_LIMIT}));}
    return;
   }
   state.count++;
   const rawStatus=kind==='returned'?response?.status:null;
   const status=typeof rawStatus==='number'&&Number.isInteger(rawStatus)&&rawStatus>=100&&rawStatus<=599?rawStatus:null;
   const event={format:'jobmatch-ops-event-v1',scope:'route-handler',kind,minute:stamp,route,handler,status,duration:durationBucket(elapsed)};
   options.emit(OPS_PREFIX+JSON.stringify(event));
  }catch{/* Logging/clock/sink failures must not alter business results or recursively log data. */}
 }
 return function observe<A extends unknown[],R extends Response>(route:OpsRoute,handler:'GET'|'POST',run:(...args:A)=>R|Promise<R>){
  return async(...args:A):Promise<R>=>{
   if(!enabled())return run(...args);
   const start=clock();
   try{const response=await run(...args);record(route,handler,'returned',response,clock()-start);return response;}
   catch(error){record(route,handler,'unhandled',null,clock()-start);throw error;}
  };
 };
}
// Shared best-effort cap in one JS realm. It is not a global/serverless deployment quota.
const storage=globalThis as typeof globalThis&{__jobmatchOpsV1?:State};
storage.__jobmatchOpsV1??=fresh();
export const observeRoute=createOpsObserver({
 enabled:()=>process.env.JOBMATCH_OPS_TELEMETRY==='stdout',
 wallNow:()=>Date.now(),monotonicNow:()=>performance.now(),
 emit:line=>console.info(line),state:storage.__jobmatchOpsV1
});
