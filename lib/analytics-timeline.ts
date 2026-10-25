import type {Application} from './db';
import {firstSentDate,summarize} from './analytics';
/** Cohorts by first recorded non-planned event; outcomes use full recorded history. */
export function monthlyResults(applications:Application[]){
 const groups=new Map<string,Application[]>();
 for(const application of applications){const date=firstSentDate(application);if(!date)continue;const month=date.slice(0,7);const group=groups.get(month)||[];group.push(application);groups.set(month,group);}
 return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([month,rows])=>{
  const count=(status:string)=>rows.filter(a=>a.events.some(e=>e.status===status&&Number.isFinite(Date.parse(e.date)))).length;
  return {month,...summarize(rows),viewed:count('Просмотрено'),invited:count('Приглашение'),offers:count('Оффер')};
 });
}
export function monthlyCsv(rows:ReturnType<typeof monthlyResults>,headers:string[]){
 const cell=(value:string)=>'"'+(/^[\s]*[=+@-]/.test(value)||/^[\t\r\n]/.test(value)?"'":'')+value.replaceAll('"','""')+'"';
 const percent=(value:number|null)=>value===null?'':String(Math.round(value*100)/100);
 return '\ufeff'+[headers,...rows.map(r=>[r.month,String(r.sent),String(r.viewed),String(r.invited),String(r.interviews),String(r.offers),String(r.responses),percent(r.responseRate),percent(r.interviewRate)])].map(row=>row.map(cell).join(',')).join('\r\n');
}
