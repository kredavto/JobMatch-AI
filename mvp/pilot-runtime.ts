import type {PilotVerify} from './pilot-backend';
import {createPilotAuthenticator} from './pilot-auth';
import {createSupabasePilotStore,type PilotRpc} from './supabase-pilot-store';
import {createPrincipalRewriteService} from './principal-rewrite-service';
import {createGroqFullResumeAdapter} from './groq-full-resume-adapter';
/** Explicit composition seam. No process.env lookup and no automatic activation.
 * RPC transport must use only the verified user's token and bounded fixed-origin
 * Supabase calls. SQL migration/config/entitlement must be independently reviewed.
 */
export function createSupabaseGroqPilotRuntime(options:{enabled?:boolean;rpc?:PilotRpc;verify?:PilotVerify;key?:string;fetcher?:typeof fetch}={}){
 if(!options.enabled||!options.rpc||!options.key||!options.fetcher)return createPrincipalRewriteService();
 const {rpc,key,fetcher}=options;
 return createPrincipalRewriteService({enabled:true,authenticate:createPilotAuthenticator(options.verify),store:createSupabasePilotStore(rpc),rewrite:(text,signal)=>createGroqFullResumeAdapter({key,fetcher})(text,signal)});
}
