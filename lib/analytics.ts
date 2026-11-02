import type {Application} from './db';
import {z} from 'zod';
export type AnalyticsFilter={from:string;to:string;versionId:string};
const sentStatuses=new Set(['Отклик отправлен','Просмотрено','Приглашение','Отказ','Интервью','Оффер']);
const responseStatuses=new Set(['Приглашение','Отказ','Интервью','Оффер']);
const interviewStatuses=new Set(['Интервью','Оффер']);
const calendarDay=z.iso.date(),instant=z.iso.datetime({offset:true});
function canonicalInstant(value:string){return value.replace(/([+-]\d{2})(\d{2})$/,'$1:$2').replace(/z$/,'Z').replace(/(T\d{2}:\d{2})(Z|[+-]\d{2}:\d{2})$/,'$1:00$2');}
/** Calendar days keep their established UTC bucket; offset-less times never acquire the device zone. */
export function recordedEventTime(value:string){if(calendarDay.safeParse(value).success)return Date.parse(value+'T00:00:00Z');const canonical=canonicalInstant(value);if(!instant.safeParse(canonical).success)return null;const n=Date.parse(canonical);return Number.isFinite(n)?n:null;}
/** Match the legacy workspace read contract for observed statuses. Its parsed value is never used for placement. */
export function validRecordedEventDate(value:string){return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)&&calendarDay.safeParse(value.slice(0,10)).success&&Number.isFinite(Date.parse(value));}
function recordedSentEvents(application:Application){return application.events.filter(event=>sentStatuses.has(event.status)&&validRecordedEventDate(event.date));}
function firstSentRecord(application:Application){
 const events=recordedSentEvents(application);if(!events.length)return null;
 // An unplaced event might precede a dated one; do not silently move the cohort to a later known event.
 let first:{raw:string;time:number}|null=null;
 for(const event of events){const time=recordedEventTime(event.date);if(time===null)return null;if(!first||time<first.time)first={raw:event.date,time};}
 return first;
}
export function unplacedApplications(applications:Application[]){return applications.filter(application=>recordedSentEvents(application).length>0&&firstSentRecord(application)===null);}
export function utcDay(value:string){const n=recordedEventTime(value);return n===null?null:new Date(n).toISOString().slice(0,10);}
export function validDay(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&utcDay(value+'T00:00:00Z')===value;}
export function filterError(filter:AnalyticsFilter):'invalid'|'reversed'|null{
 if((filter.from&&!validDay(filter.from))||(filter.to&&!validDay(filter.to)))return 'invalid';
 return filter.from&&filter.to&&filter.from>filter.to?'reversed':null;
}
/** Existing manual events are observations, not HH-confirmed submission timestamps. */
export function firstSentDate(application:Application){const first=firstSentRecord(application);return first?new Date(first.time).toISOString():null;}
/** CSV preserves day-only precision; the internal UTC bucket is not an observed midnight. */
export function firstSentRecordedValue(application:Application){const first=firstSentRecord(application);return first?(calendarDay.safeParse(first.raw).success?first.raw:new Date(first.time).toISOString()):'';}
export function selectApplications(applications:Application[],filter:AnalyticsFilter){
 if(filterError(filter))return [];
 return applications.filter(a=>{
  if(filter.versionId==='unlinked'&&a.resumeVersionId)return false;
  if(filter.versionId&&filter.versionId!=='unlinked'&&a.resumeVersionId!==filter.versionId)return false;
  if(!filter.from&&!filter.to)return true;
  const sent=firstSentDate(a);const day=sent?utcDay(sent):null;
  return day!==null&&(!filter.from||day>=filter.from)&&(!filter.to||day<=filter.to);
 });
}
export function summarize(applications:Application[]){
 const sent=applications.filter(application=>recordedSentEvents(application).length>0);
 const responses=sent.filter(a=>a.events.some(e=>responseStatuses.has(e.status)&&validRecordedEventDate(e.date)));
 const interviews=sent.filter(a=>a.events.some(e=>interviewStatuses.has(e.status)&&validRecordedEventDate(e.date)));
 return {total:applications.length,sent:sent.length,responses:responses.length,interviews:interviews.length,responseRate:sent.length?responses.length/sent.length*100:null,interviewRate:sent.length?interviews.length/sent.length*100:null};
}
export function previousPeriod(filter:AnalyticsFilter):AnalyticsFilter|null{
 if(filterError(filter)||!filter.from||!filter.to)return null;
 const start=Date.parse(filter.from+'T00:00:00Z'),end=Date.parse(filter.to+'T00:00:00Z'),day=86400000;
 const previousStart=new Date(start-(end-start+day)).toISOString().slice(0,10);
 const previousEnd=new Date(start-day).toISOString().slice(0,10);
 return validDay(previousStart)&&validDay(previousEnd)?{...filter,from:previousStart,to:previousEnd}:null;
}
export function versionBreakdown(applications:Application[]){
 const groups=new Map<string,Application[]>();
 for(const a of applications){const key=a.resumeVersionId||'';groups.set(key,[...(groups.get(key)||[]),a]);}
 return [...groups].map(([versionId,rows])=>({versionId,...summarize(rows)}));
}
export function applicationsCsv(applications:Application[],headers:string[]){
 const cell=(text:string)=>'"'+(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text)?"'":'')+text.replaceAll('"','""')+'"';
 return '\ufeff'+[headers,...applications.map(a=>[a.title,a.status,a.created,firstSentRecordedValue(a),a.resumeVersionId||''])].map(row=>row.map(cell).join(',')).join('\r\n');
}
