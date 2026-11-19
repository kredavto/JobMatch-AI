import {z} from 'zod';
import {FULL_POLICY,validateFullResume,resumeFacts} from './full-resume-consent';
import {prepareRewritePreview} from './rewrite-preview';
import {jsonBody,privateHeaders} from './http';
const Body=z.object({requestId:z.string().uuid(),resume:z.string().max(10000),consent:z.object({id:z.string().uuid(),policy:z.literal(FULL_POLICY),recipient:z.literal('groq')}).strict()}).strict();
export type FullRewriteDeps={enabled?:boolean;authorizeAndReserve?:(request:Request,requestId:string,consentId:string)=>Promise<boolean>;rewrite?:(resume:string,signal:AbortSignal)=>Promise<unknown>};
const fail=(state:string,status:number)=>Response.json({state,message:'Исходник и локальная адаптация не изменены.'},{status,headers:privateHeaders});
/** Inactive factory, no public route or network adapter. Default-deny authorization
 * MUST authenticate a restricted pilot and atomically deduplicate/reserve durable
 * per-user and global budget. Browser consent is not authentication or a budget.
 */
export function createFullResumeRewriteHandler(deps:FullRewriteDeps={}){
 return async(request:Request)=>{
  if(!deps.enabled||!deps.authorizeAndReserve||!deps.rewrite)return fail('disabled',503);
  if(request.method!=='POST'||request.headers.get('origin')!==new URL(request.url).origin)return fail('forbidden',403);
  let input;
  try{input=Body.parse(await jsonBody(request,50000));resumeFacts(validateFullResume(input.resume));}catch{return fail('invalid-or-sensitive-input',400);}
  try{
   if(request.signal.aborted)return fail('cancelled',408);
   if(!await deps.authorizeAndReserve(request,input.requestId,input.consent.id))return fail('not-authorized-or-budget',403);
   if(request.signal.aborted)return fail('cancelled',408);
   const signal=AbortSignal.any([request.signal,AbortSignal.timeout(15000)]);
   let abort=()=>{};
   const interrupted=new Promise<never>((_,reject)=>{abort=()=>reject(Error('ABORT'));signal.addEventListener('abort',abort,{once:true});});
   let output:unknown;
   try{output=await Promise.race([deps.rewrite(input.resume,signal),interrupted]);}finally{signal.removeEventListener('abort',abort);}
   if(signal.aborted)return fail('cancelled',408);
   const preview=prepareRewritePreview(resumeFacts(input.resume),output);
   if(preview.state!=='review')return fail(preview.state,422);
   return Response.json({state:'review',output:{suggestions:preview.draft.suggestions.map(({sourceId,sourceQuote,text})=>({sourceId,sourceQuote,text}))}},{headers:privateHeaders});
  }catch{return fail('unavailable',503);}
 };
}
