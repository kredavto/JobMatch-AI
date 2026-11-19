import {FULL_CONSENT_KEY,readFullConsent,resumeFacts,validateFullResume} from './full-resume-consent';
import {prepareRewritePreview} from './rewrite-preview';
export function createFullResumeSession(storage:Pick<Storage,'getItem'>,send:(body:unknown,signal:AbortSignal)=>Promise<unknown>){
 let active:AbortController|null=null;
 const cancel=()=>{active?.abort();active=null;};
 return {cancel,async run(text:string){
  cancel();const resume=validateFullResume(text),facts=resumeFacts(resume);
  const snapshot=storage.getItem(FULL_CONSENT_KEY),consent=readFullConsent(snapshot);if(!consent)throw Error('CONSENT_REQUIRED');
  const controller=new AbortController();active=controller;
  try{
   const output=await send({requestId:crypto.randomUUID(),resume,consent:{id:consent.id,policy:consent.policy,recipient:consent.recipient}},controller.signal);
   if(active!==controller||controller.signal.aborted||storage.getItem(FULL_CONSENT_KEY)!==snapshot)throw Error('STALE_OR_REVOKED');
   return {source:facts,output,preview:prepareRewritePreview(facts,output)};
  }finally{if(active===controller)active=null;}
 }};
}
