import type {Workspace,Application} from './db';
/** JSON structural equality ignores object-key order without recursive stack growth. */
function sameJson(left:unknown,right:unknown){
 const pending:[unknown,unknown][]=[[left,right]];
 while(pending.length){const [a,b]=pending.pop()!;if(a===b)continue;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);if(keys.length!==Object.keys(b).length)return false;for(const key of keys){if(!Object.hasOwn(b,key))return false;pending.push([(a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]]);}}
 return true;
}
const applicationValue=(value:Application)=>({...value,resumeVersionId:value.resumeVersionId??null});
/** Response consistency only: a manual tracker row, never proof of an employer submission. */
export function addedApplication(before:Workspace,after:Workspace,submitted:{title:string;resumeVersionId:string|null}){
 if(!before.ownerId||after.ownerId!==before.ownerId||after.revision!==before.revision+1||!submitted.title.trim()||submitted.resumeVersionId!==null&&!before.versions.some(v=>v.id===submitted.resumeVersionId))return false;
 const {revision:beforeRevision,applications:beforeRows,...beforeData}=before,{revision:afterRevision,applications:afterRows,...afterData}=after;void beforeRevision;void afterRevision;
 if(!sameJson(beforeData,afterData)||afterRows.length!==beforeRows.length+1)return false;
 const oldIds=new Set(beforeRows.map(row=>row.id)),added=afterRows.filter(row=>!oldIds.has(row.id));if(added.length!==1||beforeRows.some(old=>{const next=afterRows.find(row=>row.id===old.id);return !next||!sameJson(applicationValue(old),applicationValue(next));}))return false;
 const row=added[0];
 return row.title===submitted.title&&row.status==='Планируется'&&row.note===''&&(row.resumeVersionId??null)===submitted.resumeVersionId&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.created)&&Number.isFinite(Date.parse(row.created))&&row.events.length===1&&row.events[0].status==='Планируется'&&row.events[0].date===row.created;
}

export type ApplicationUpdateIntent={id:string;status:string;note:string;resumeVersionId?:string|null};
/** Exact one-row manual tracker update, after generic workspace/owner/revision validation. */
export function updatedApplication(before:Workspace,after:Workspace,intent:ApplicationUpdateIntent){
 if(!before.ownerId||after.ownerId!==before.ownerId||after.revision!==before.revision+1)return false;
 const {revision:beforeRevision,applications:beforeRows,...beforeData}=before,{revision:afterRevision,applications:afterRows,...afterData}=after;void beforeRevision;void afterRevision;
 if(!sameJson(beforeData,afterData)||afterRows.length!==beforeRows.length)return false;
 const old=beforeRows.find(row=>row.id===intent.id),row=afterRows.find(row=>row.id===intent.id);if(!old||!row||beforeRows.some(previous=>previous.id!==intent.id&&!afterRows.some(next=>next.id===previous.id&&sameJson(applicationValue(previous),applicationValue(next)))))return false;
 const link=Object.hasOwn(intent,'resumeVersionId')?intent.resumeVersionId??null:old.resumeVersionId??null;
 if(Object.hasOwn(intent,'resumeVersionId')&&link!==null&&!before.versions.some(v=>v.id===link))return false;
 if(intent.status===old.status){if(!sameJson(row.events,old.events))return false;}
 else{if(row.events.length!==old.events.length+1||!sameJson(row.events.slice(0,-1),old.events))return false;const event=row.events.at(-1)!;if(event.status!==intent.status||!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(event.date)||!Number.isFinite(Date.parse(event.date))||!sameJson(event,{status:intent.status,date:event.date}))return false;}
 return sameJson(applicationValue(row),{...applicationValue(old),status:intent.status,note:intent.note,resumeVersionId:link,events:row.events});
}
