import {z} from 'zod';
import {ACCOUNT_FULL_POLICY} from './full-resume-consent';
import type {PilotConsent,PilotPrincipal,PilotStore} from './principal-rewrite-service';
/** Inject an authenticated, bounded RPC transport only after reviewed setup.
 * No environment lookup or privileged/service-role credential is accepted here.
 */
export type PilotRpc=(path:string,body:Record<string,unknown>,userToken:string)=>Promise<unknown>;
const Snapshot=z.object({revision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),consent_id:z.string().uuid().nullable(),policy_version:z.literal(ACCOUNT_FULL_POLICY),recipient:z.literal('groq'),scope:z.literal('account'),granted:z.boolean()}).strict();
function snapshot(value:unknown):PilotConsent|null{
 const s=Snapshot.parse(value);
 if(s.revision===0){if(s.consent_id!==null||s.granted)throw Error('INVALID_CONSENT');return null;}
 if(!s.consent_id)throw Error('INVALID_CONSENT');
 return {id:s.consent_id,policy:s.policy_version,granted:s.granted,revision:s.revision};
}
export function createSupabasePilotStore(rpc:PilotRpc):PilotStore{
 function call(p:PilotPrincipal,name:string,body:Record<string,unknown>){if(!z.string().uuid().safeParse(p.id).success||!p.token)throw Error('AUTH');return rpc('/rest/v1/rpc/'+name,body,p.token);}
 return {
  async status(p){return snapshot(await call(p,'ai_rewrite_consent_status',{}));},
  async consent(p,input){
   if(input.policy!==ACCOUNT_FULL_POLICY||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw Error('INVALID_CONSENT');
   const value=snapshot(await call(p,input.grant?'ai_rewrite_grant_consent':'ai_rewrite_revoke_consent',input.grant?{p_expected_revision:input.expectedRevision,p_policy_version:input.policy}:{p_expected_revision:input.expectedRevision}));
   if(!value||value.revision!==input.expectedRevision+1||value.granted!==input.grant)throw Error('INVALID_CONSENT');return value;
  },
  async reserve(p,input){
   if(input.policy!==ACCOUNT_FULL_POLICY||!z.string().uuid().safeParse(input.requestId).success||!z.string().uuid().safeParse(input.consentId).success||!Number.isSafeInteger(input.consentRevision)||input.consentRevision<1)throw Error('INVALID_RESERVATION');
   const allowed=z.boolean().parse(await call(p,'ai_rewrite_reserve',{p_request_id:input.requestId,p_consent_id:input.consentId,p_expected_revision:input.consentRevision}));
   return allowed?{id:input.requestId,consentId:input.consentId,consentRevision:input.consentRevision}:null;
  },
  async canDeliver(p,reservation){if(!z.string().uuid().safeParse(reservation.id).success)throw Error('INVALID_RESERVATION');return z.boolean().parse(await call(p,'ai_rewrite_can_deliver',{p_request_id:reservation.id}));}
 };
}
