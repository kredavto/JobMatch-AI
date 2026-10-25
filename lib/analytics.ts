import type {Application} from './db';
export type AnalyticsFilter={from:string;to:string;versionId:string};
const sentStatuses=new Set(['Отклик отправлен','Просмотрено','Приглашение','Отказ','Интервью','Оффер']);
const responseStatuses=new Set(['Приглашение','Отказ','Интервью','Оффер']);
const interviewStatuses=new Set(['Интервью','Оффер']);
function time(value:string){const n=Date.parse(value);return Number.isFinite(n)?n:null;}
export function utcDay(value:string){const n=time(value);return n===null?null:new Date(n).toISOString().slice(0,10);}
export function validDay(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&utcDay(value+'T00:00:00Z')===value;}
export function filterError(filter:AnalyticsFilter):'invalid'|'reversed'|null{
 if((filter.from&&!validDay(filter.from))||(filter.to&&!validDay(filter.to)))return 'invalid';
 return filter.from&&filter.to&&filter.from>filter.to?'reversed':null;
}
/** Existing manual events are observations, not HH-confirmed submission timestamps. */
export function firstSentDate(application:Application){
 const dates=application.events.filter(e=>sentStatuses.has(e.status)).map(e=>time(e.date)).filter((n):n is number=>n!==null);
 return dates.length?new Date(Math.min(...dates)).toISOString():null;
}
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
 const sent=applications.filter(a=>firstSentDate(a)!==null);
 const responses=sent.filter(a=>a.events.some(e=>responseStatuses.has(e.status)));
 const interviews=sent.filter(a=>a.events.some(e=>interviewStatuses.has(e.status)));
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
 return '\ufeff'+[headers,...applications.map(a=>[a.title,a.status,a.created,firstSentDate(a)||'',a.resumeVersionId||''])].map(row=>row.map(cell).join(',')).join('\r\n');
}
