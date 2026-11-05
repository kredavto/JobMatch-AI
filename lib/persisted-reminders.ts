import {z} from 'zod';
import {calendarTimeOptions} from './calendar-time';
import {sameJson} from './application-write-response';
export const REMINDER_LIMIT=100;
const revision=z.number().int().min(0).max(2147483647);
const reminderId=z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const literal=(max:number)=>z.string().refine(s=>s.length<=max*2&&[...s].length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ud800-\udfff]/u.test(s));
const instant=z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/).refine(s=>Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s);
const fields={applicationId:literal(200).min(1),kind:z.enum(['interview','follow-up']),localStart:z.string().regex(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/),zone:z.string().min(1).max(100),offsetMinutes:z.number().int().min(-840).max(840),dueAt:instant,minutes:z.union([z.literal(15),z.literal(30),z.literal(60),z.literal(90)]),description:literal(3000)};
function validTime(v:{localStart:string;zone:string;offsetMinutes:number;dueAt:string}){try{return calendarTimeOptions(v.localStart,v.zone).some(c=>c.offsetMinutes===v.offsetMinutes&&c.dueAt===v.dueAt);}catch{return false;}}
export const ReminderCommandSchema=z.discriminatedUnion('action',[
 z.strictObject({action:z.literal('create'),id:reminderId,...fields}),
 z.strictObject({action:z.literal('reschedule'),id:reminderId,...fields}),
 z.strictObject({action:z.literal('complete'),id:reminderId}),
 z.strictObject({action:z.literal('cancel'),id:reminderId}),
 z.strictObject({action:z.literal('delete'),id:reminderId})
]).refine(c=>!('dueAt' in c)||validTime(c),'Invalid explicit zoned occurrence');
export type ReminderCommand=z.infer<typeof ReminderCommandSchema>;
function frozenTime(v:{localStart:string;offsetMinutes:number;dueAt:string}){try{return v.dueAt.slice(17)==='00.000Z'&&new Date(Date.parse(v.dueAt)+v.offsetMinutes*60000).toISOString().slice(0,16)===v.localStart;}catch{return false;}}
export const ReminderSchema=z.strictObject({id:reminderId,...fields,status:z.enum(['scheduled','completed','cancelled']),revision:revision.refine(n=>n>0),created:instant,updated:instant}).refine(frozenTime).refine(v=>Date.parse(v.updated)>=Date.parse(v.created));
export type PersistedReminder=z.infer<typeof ReminderSchema>;
export const RemindersStateSchema=z.strictObject({format:z.literal('jobmatch-reminders-state-v1'),ownerId:z.uuid(),revision,delivery:z.literal('none'),items:z.array(ReminderSchema).max(REMINDER_LIMIT)}).refine(s=>new Set(s.items.map(r=>r.id)).size===s.items.length&&s.items.every(r=>r.revision<=s.revision)&&s.items.every((r,i)=>!i||s.items[i-1].id<r.id));
export type RemindersState=z.infer<typeof RemindersStateSchema>;
export const ReminderRequestSchema=z.strictObject({expectedOwnerId:z.uuid(),workspaceRevision:revision,revision:revision.refine(n=>n<2147483647),consentToStore:z.literal(true),command:ReminderCommandSchema});
/** Exact effect only; an ACK does not prove a notification was delivered. */
export function validateReminderWrite(raw:unknown,before:RemindersState,command:ReminderCommand):RemindersState{
 const after=RemindersStateSchema.parse(raw),c=ReminderCommandSchema.parse(command);
 if(after.ownerId!==before.ownerId||after.revision!==before.revision+1)throw Error('Invalid reminder acknowledgement');
 const old=before.items.find(r=>r.id===c.id),row=after.items.find(r=>r.id===c.id);
 if(c.action==='delete'){
  if(!old||row||!sameJson(after,{...before,revision:after.revision,items:before.items.filter(r=>r.id!==c.id)}))throw Error('Invalid reminder deletion');return after;
 }
 if(!row||c.action==='create'&&old||c.action!=='create'&&!old)throw Error('Invalid reminder target');
 if(c.action==='complete'||c.action==='cancel'){if(old!.status!=='scheduled')throw Error('Invalid reminder transition');}
 const {action,...data}=c;
 const expected:PersistedReminder=ReminderSchema.parse(action==='create'?{...data,status:'scheduled',revision:after.revision,created:row.created,updated:row.created}:action==='reschedule'?{...old,...data,status:'scheduled',revision:after.revision,updated:row.updated}:{...old,status:action==='complete'?'completed':'cancelled',revision:after.revision,updated:row.updated});
 if(old&&Date.parse(row.updated)<Date.parse(old.updated))throw Error('Invalid reminder clock');
 const items=action==='create'?[...before.items,expected].sort((a,b)=>a.id<b.id?-1:1):before.items.map(r=>r.id===c.id?expected:r);
 if(!sameJson(after,{...before,revision:after.revision,items}))throw Error('Invalid reminder effect');return after;
}
