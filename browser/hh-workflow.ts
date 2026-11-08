import {validHhConsent,type HhConsent} from './consent';
/** Browser integration contract, not a live hh.ru connector. No credentials or cookies. */
export type BrowserSnapshot={
 authenticated:boolean;challenge:boolean;vacancyId:string;resumeId:string;
 // A live integration must establish this before editing. Unknown is not isolated.
 fieldsAreResumeLocal:boolean;savedTitle:string;application:'absent'|'present'|'unknown';
};
export type BrowserPort={
 inspect:()=>Promise<BrowserSnapshot>;
 saveTitle:(title:string)=>Promise<void>;
 submitApplication:(coverLetter:string)=>Promise<void>;
};
export type BrowserPlan={vacancyId:string;resumeId:string;title:string;coverLetter:string};
export type BrowserJournal={save:'idle'|'attempted'|'confirmed'|'unknown';application:'idle'|'attempted'|'confirmed'|'unknown'};
export type BrowserOutcome={state:'done'|'already-applied'|'paused';reason?:'consent-required'|'manual-login'|'captcha'|'wrong-target'|'shared-profile'|'save-unknown'|'application-unknown'|'read-unavailable'};
export function newBrowserJournal():BrowserJournal{return {save:'idle',application:'idle'};}
/** The caller retains this non-secret journal for retries of the same task; never reset on a timeout. */
export async function runBrowserWorkflow(port:BrowserPort,plan:BrowserPlan,journal:BrowserJournal,consent?:HhConsent):Promise<BrowserOutcome>{
 if(!validHhConsent(consent))return {state:'paused',reason:'consent-required'};
 const inspect=async()=>{try{return await port.inspect();}catch{return null;}};
 const gate=(view:BrowserSnapshot|null):BrowserOutcome|null=>{
  if(!view)return {state:'paused',reason:'read-unavailable'};
  if(view.challenge)return {state:'paused',reason:'captcha'};
  if(!view.authenticated)return {state:'paused',reason:'manual-login'};
  if(view.vacancyId!==plan.vacancyId||view.resumeId!==plan.resumeId)return {state:'paused',reason:'wrong-target'};
  return null;
 };
 let view=await inspect(),blocked=gate(view);if(blocked||!view)return blocked!;
 if(view.application==='present'){journal.application='confirmed';return {state:'already-applied'};}
 if(view.application==='unknown'||journal.application!=='idle')return {state:'paused',reason:'application-unknown'};
 // No experience/education/skills edits are supported by this minimal contract.
 // hh's unified profile can propagate shared edits to other resumes.
 if(!view.fieldsAreResumeLocal)return {state:'paused',reason:'shared-profile'};
 if(view.savedTitle===plan.title)journal.save='confirmed';
 if(journal.save==='attempted'||journal.save==='unknown')return {state:'paused',reason:'save-unknown'};
 if(journal.save==='idle'){
  journal.save='attempted';
  try{await port.saveTitle(plan.title);}catch{journal.save='unknown';}
  view=await inspect();blocked=gate(view);if(blocked||!view)return blocked!;
  if(view.savedTitle!==plan.title){journal.save='unknown';return {state:'paused',reason:'save-unknown'};}
  journal.save='confirmed';
 }
 // Recheck immediately before the irreversible action. Never infer absence from a read error.
 view=await inspect();blocked=gate(view);if(blocked||!view)return blocked!;
 if(view.application==='present'){journal.application='confirmed';return {state:'already-applied'};}
 if(view.application!=='absent')return {state:'paused',reason:'application-unknown'};
 journal.application='attempted';
 try{await port.submitApplication(plan.coverLetter);}catch{journal.application='unknown';}
 view=await inspect();blocked=gate(view);if(blocked||!view)return blocked!;
 if(view.application==='present'){journal.application='confirmed';return {state:'done'};}
 journal.application='unknown';return {state:'paused',reason:'application-unknown'};
}
