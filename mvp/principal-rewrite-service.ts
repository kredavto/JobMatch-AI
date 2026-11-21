import {z} from 'zod';
import {ACCOUNT_FULL_POLICY,resumeFacts,validateFullResume} from './full-resume-consent';
import {prepareRewritePreview} from './rewrite-preview';
import {jsonBody,privateHeaders} from './http';
export type PilotPrincipal={id:string;token:string};
export type PilotConsent={id:string;policy:typeof ACCOUNT_FULL_POLICY;granted:boolean;revision:number};
export type PilotReservation={id:string;consentId:string;consentRevision:number};
/** Durable implementations must derive owner from authenticated token, never hints.
 * No resume, vacancy, output or content hash is accepted by this storage contract.
 */
export interface PilotStore{
 status(principal:PilotPrincipal):Promise<PilotConsent|null>;
 consent(principal:PilotPrincipal,input:{grant:boolean;expectedRevision:number;policy:typeof ACCOUNT_FULL_POLICY}):Promise<PilotConsent>;
 reserve(principal:PilotPrincipal,input:{requestId:string;consentId:string;consentRevision:number;policy:typeof ACCOUNT_FULL_POLICY}):Promise<PilotReservation|null>;
 canDeliver(principal:PilotPrincipal,reservation:PilotReservation):Promise<boolean>;
}
const ConsentCommand=z.object({action:z.enum(['grant','revoke']),expectedSubject:z.string().uuid(),expectedRevision:z.number().int().min(0),policy:z.literal(ACCOUNT_FULL_POLICY)}).strict();
const RewriteCommand=z.object({action:z.literal('rewrite'),expectedSubject:z.string().uuid(),requestId:z.string().uuid(),consentId:z.string().uuid(),consentRevision:z.number().int().positive(),policy:z.literal(ACCOUNT_FULL_POLICY),resume:z.string().max(10000)}).strict();
const Command=z.union([ConsentCommand,RewriteCommand]);
export type PilotDependencies={enabled?:boolean;authenticate?:(request:Request)=>Promise<PilotPrincipal|null>;store?:PilotStore;rewrite?:(text:string,signal:AbortSignal)=>Promise<unknown>};
const fail=(state:string,status:number)=>Response.json({state,message:'ИИ недоступен для этого действия. Локальная адаптация и исходник не изменены.'},{status,headers:privateHeaders});
const publicConsent=(value:PilotConsent|null)=>value?{id:value.id,policy:value.policy,granted:value.granted,revision:value.revision}:null;
export function createPrincipalRewriteService(deps:PilotDependencies={}){
 return async(request:Request)=>{
  if(!deps.enabled||!deps.authenticate||!deps.store||!deps.rewrite)return fail('disabled',503);
  if(!['GET','POST'].includes(request.method))return fail('method',405);
  if(request.method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin)return fail('origin',403);
  try{
   const principal=await deps.authenticate(request);
   if(!principal||!z.string().uuid().safeParse(principal.id).success)return fail('login-required',401);
   if(request.method==='GET')return Response.json({subject:principal.id,consent:publicConsent(await deps.store.status(principal))},{headers:privateHeaders});
   let body;try{body=Command.parse(await jsonBody(request,50000));}catch{return fail('invalid-request',400);}
   if(body.expectedSubject!==principal.id)return fail('account-changed',409);
   if(body.action!=='rewrite')return Response.json({subject:principal.id,consent:publicConsent(await deps.store.consent(principal,{grant:body.action==='grant',expectedRevision:body.expectedRevision,policy:body.policy}))},{headers:privateHeaders});
   let facts;try{facts=resumeFacts(validateFullResume(body.resume));}catch{return fail('invalid-or-sensitive-resume',400);}
   if(request.signal.aborted)return fail('cancelled',408);
   let reservation;try{
    reservation=await deps.store.reserve(principal,{requestId:body.requestId,consentId:body.consentId,consentRevision:body.consentRevision,policy:body.policy});
   }catch{return fail('reservation-unavailable',503);}
   if(!reservation)return fail('consent-or-budget-or-duplicate',403);
   if(request.signal.aborted||!await deps.store.canDeliver(principal,reservation))return fail('revoked',409);
   const signal=AbortSignal.any([request.signal,AbortSignal.timeout(15000)]);
   let abort=()=>{};const interrupted=new Promise<never>((_,reject)=>{abort=()=>reject(Error('ABORT'));signal.addEventListener('abort',abort,{once:true});});
   let output:unknown;try{output=await Promise.race([deps.rewrite(body.resume,signal),interrupted]);}finally{signal.removeEventListener('abort',abort);}
   const current=await deps.authenticate(request);
   if(signal.aborted||current?.id!==principal.id||!await deps.store.canDeliver(principal,reservation))return fail('stale-or-revoked',409);
   const preview=prepareRewritePreview(facts,output);
   if(preview.state!=='review')return fail(preview.state,422);
   return Response.json({state:'review',subject:principal.id,source:facts,output:{suggestions:preview.draft.suggestions.map(({sourceId,sourceQuote,text})=>({sourceId,sourceQuote,text}))}},{headers:privateHeaders});
  }catch{return fail('unavailable',503);}
 };
}
