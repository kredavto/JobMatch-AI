/** Static failure locations only. No error object, request, content or arbitrary label reaches a sink. */
export const AI_FAILURE_STAGES=['configuration','input','transport','http-status-or-type','body-read','envelope-json','envelope-schema','content-json','review-schema','citation','evidence','review-validation','cancelled','timeout','grading-validation','unknown'] as const;
export type AiFailureStage=typeof AI_FAILURE_STAGES[number];
export type AiFailureObserver=(stage:AiFailureStage)=>void;
export function aiFailureStage(value:unknown):AiFailureStage{
 return typeof value==='string'&&AI_FAILURE_STAGES.includes(value as AiFailureStage)?value as AiFailureStage:'unknown';
}
export function observeAiFailure(observer:AiFailureObserver|undefined,stage:AiFailureStage){
 try{if(typeof observer==='function')observer(aiFailureStage(stage));}catch{/* A diagnostic sink must not change business results or retry. */}
}
