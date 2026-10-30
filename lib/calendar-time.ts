import {canonicalTimeZone,wallEpoch,reminderTimeCandidates} from './reminders';
export type CalendarTimeError='time'|'zone'|'gap'|'choose'|'offset';
export class CalendarTimeFailure extends Error{constructor(public readonly code:CalendarTimeError){super(code);}}
/** Enumerate actual instants; a DST fold must never silently choose its first occurrence. */
export function calendarTimeOptions(local:string,zone:string){
 try{wallEpoch(local);}catch{throw new CalendarTimeFailure('time');}
 let canonical:string;try{canonical=canonicalTimeZone(zone);}catch{throw new CalendarTimeFailure('zone');}
 const candidates=reminderTimeCandidates(local,canonical);if(!candidates.length)throw new CalendarTimeFailure('gap');return candidates;
}
export function calendarStart(local:string,zone:string,offset:string){
 const candidates=calendarTimeOptions(local,zone);
 if(candidates.length===1&&offset==='')return new Date(candidates[0].dueAt);
 if(!offset)throw new CalendarTimeFailure('choose');
 const selected=candidates.find(candidate=>String(candidate.offsetMinutes)===offset);
 if(!selected)throw new CalendarTimeFailure('offset');return new Date(selected.dueAt);
}
