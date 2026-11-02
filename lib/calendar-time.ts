const formatters=new Map<string,Intl.DateTimeFormat>();
const zoneName=/^[A-Za-z][A-Za-z0-9._+-]*(?:\/[A-Za-z0-9._+-]+)*$/;
function canonicalTimeZone(zone:string){if(zone.length>100||!zoneName.test(zone))throw Error('Укажите именованный IANA-пояс');return new Intl.DateTimeFormat('en',{timeZone:zone}).resolvedOptions().timeZone;}
function formatter(zone:string){let value=formatters.get(zone);if(!value){value=new Intl.DateTimeFormat('en-CA',{timeZone:zone,calendar:'iso8601',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});if(formatters.size>=16)formatters.delete(formatters.keys().next().value!);formatters.set(zone,value);}return value;}
function wallAt(instant:Date,zone:string){const parts=Object.fromEntries(formatter(zone).formatToParts(instant).map(part=>[part.type,part.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;}
function wallEpoch(value:string){
 if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Укажите местную дату 2000–2099 и время с точностью до минуты');
 const date=new Date(value+':00.000Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,16)!==value)throw Error('Некорректная местная дата');return date.getTime();
}
/** Enumerate every modern whole-minute UTC offset; includes non-hour DST folds. */
function timeCandidates(local:string,zone:string){
 const epoch=wallEpoch(local),timeZone=canonicalTimeZone(zone),result:{dueAt:string;offsetMinutes:number}[]=[];
 for(let offset=-840;offset<=840;offset++){const instant=new Date(epoch-offset*60000);if(wallAt(instant,timeZone)===local)result.push({dueAt:instant.toISOString(),offsetMinutes:offset});}
 return result.sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
}

export type CalendarCandidate={dueAt:string;offsetMinutes:number};
export type CalendarTimeError='time'|'zone'|'gap'|'choose'|'offset';
export class CalendarTimeFailure extends Error{constructor(public readonly code:CalendarTimeError){super(code);}}
/** Explicit modern range: local years 2000–2099, whole-minute UTC offsets from -14h to +14h. */
export function calendarTimeOptions(local:string,zone:string):CalendarCandidate[]{
 try{wallEpoch(local);}catch{throw new CalendarTimeFailure('time');}
 let canonical:string;try{canonical=canonicalTimeZone(zone);}catch{throw new CalendarTimeFailure('zone');}
 let candidates:CalendarCandidate[];try{candidates=timeCandidates(local,canonical);}catch{throw new CalendarTimeFailure('zone');}
 if(!candidates.length)throw new CalendarTimeFailure('gap');return candidates;
}
export function calendarStart(local:string,zone:string,offset:string){
 const candidates=calendarTimeOptions(local,zone);
 if(candidates.length===1&&offset==='')return new Date(candidates[0].dueAt);
 if(!offset)throw new CalendarTimeFailure('choose');
 const selected=candidates.find(candidate=>String(candidate.offsetMinutes)===offset);
 if(!selected)throw new CalendarTimeFailure('offset');return new Date(selected.dueAt);
}
export function formatCalendarOffset(minutes:number){if(!Number.isInteger(minutes)||Math.abs(minutes)>840)throw new CalendarTimeFailure('offset');const value=Math.abs(minutes);return 'UTC'+(minutes<0?'-':'+')+String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');}
