import {aiConfig,aiReview} from './ai-provider';
import {ADAPTATION_FORMAT,adaptationFacts,validateAdaptation} from './ai-resume-adaptation';
import type {Fact} from './engine';
import {UserError} from './errors';
/** Independent opt-in. Enabling this experimental path is NOT model acceptance. */
export function adaptationConfig(){
 if(process.env.JOBMATCH_AI_ADAPTATION_ENABLED!=='true')throw new UserError('AI adaptation is not enabled.',503,'AI_DISABLED');
 return aiConfig();
}
export async function adaptResume(facts:Fact[],original:string,vacancy:string,signal:AbortSignal){
 adaptationConfig();
 const eligible=adaptationFacts(facts,original);
 if(!original.trim()||!eligible.length)throw new UserError('Confirmed original resume lines required.',400,'AI_INPUT_REQUIRED');
 const review=await aiReview(eligible,vacancy,signal);
 return validateAdaptation({format:ADAPTATION_FORMAT,generator:'ai-selected-literal',modelAcceptance:'not-accepted',review},facts,original,vacancy);
}
