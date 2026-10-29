import {z} from 'zod';
const formatters=new Map<string,Intl.DateTimeFormat>();
const zoneName=/^[A-Za-z][A-Za-z0-9._+-]*(?:\/[A-Za-z0-9._+-]+)*$/;
export function canonicalTimeZone(zone:string){if(zone.length>100||!zoneName.test(zone))throw Error('Укажите именованный IANA-пояс');return new Intl.DateTimeFormat('en',{timeZone:zone}).resolvedOptions().timeZone;}
function formatter(zone:string){let value=formatters.get(zone);if(!value){value=new Intl.DateTimeFormat('en-CA',{timeZone:zone,calendar:'iso8601',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});if(formatters.size>=16)formatters.delete(formatters.keys().next().value!);formatters.set(zone,value);}return value;}
export function wallAt(instant:Date,zone:string){const parts=Object.fromEntries(formatter(zone).formatToParts(instant).map(part=>[part.type,part.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;}
export function wallEpoch(value:string){
 if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Укажите местную дату 2000–2099 и время с точностью до минуты');
 const date=new Date(value+':00.000Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,16)!==value)throw Error('Некорректная местная дата');return date.getTime();
}
export function resolveReminderTime(local:string,zone:string,offsetMinutes:number){
 if(!Number.isInteger(offsetMinutes)||Math.abs(offsetMinutes)>840)throw Error('Выберите UTC-смещение');
 const timeZone=canonicalTimeZone(zone),date=new Date(wallEpoch(local)-offsetMinutes*60000);
 if(wallAt(date,timeZone)!==local)throw Error('Время не существует или UTC-смещение не соответствует часовому поясу');
 return {timeZone,dueAt:date.toISOString(),offsetMinutes};
}
/** Enumerate every modern whole-minute UTC offset; includes non-hour DST folds. */
export function reminderTimeCandidates(local:string,zone:string){
 const epoch=wallEpoch(local),timeZone=canonicalTimeZone(zone),result:{dueAt:string;offsetMinutes:number}[]=[];
 for(let offset=-840;offset<=840;offset++){const instant=new Date(epoch-offset*60000);if(wallAt(instant,timeZone)===local)result.push({dueAt:instant.toISOString(),offsetMinutes:offset});}
 return result.sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
}
const codeText=(max:number)=>z.string().refine(value=>Array.from(value).length<=max&&!value.includes('\0'));
const title=codeText(200).refine(value=>value.trim().length>0),description=codeText(1000);
const zone=z.string().min(1).max(100).refine(value=>{try{canonicalTimeZone(value);return true;}catch{return false;}});
const dueLocal=z.string().refine(value=>{try{wallEpoch(value);return true;}catch{return false;}});
const editable=z.object({title,description,dueLocal,timeZone:zone,offsetMinutes:z.number().int().min(-840).max(840),minutes:z.union([z.literal(15),z.literal(30),z.literal(60),z.literal(90)])}).strict().superRefine((value,ctx)=>{try{resolveReminderTime(value.dueLocal,value.timeZone,value.offsetMinutes);}catch{ctx.addIssue({code:'custom',message:'Проверьте дату, часовой пояс и выбранное UTC-смещение'});}});
export const ReminderCommandSchema=z.discriminatedUnion('action',[
 editable.safeExtend({action:z.literal('create'),applicationId:z.string().min(1).max(100),accept:z.literal('SAVE_REMINDER')}),
 editable.safeExtend({action:z.literal('update'),id:z.uuid(),accept:z.literal('SAVE_REMINDER')}),
 z.object({action:z.enum(['complete','cancel']),id:z.uuid()}).strict(),
 z.object({action:z.literal('delete'),id:z.uuid(),accept:z.literal('DELETE_REMINDER')}).strict()
]);
export type ReminderCommand=z.infer<typeof ReminderCommandSchema>;
export function reminderSqlCommand(command:ReminderCommand){
 if(command.action!=='create'&&command.action!=='update')return command;
 const {timeZone,dueAt}=resolveReminderTime(command.dueLocal,command.timeZone,command.offsetMinutes);
 return {...command,timeZone,dueAt};
}
const recordFields={id:z.uuid(),applicationId:z.string().min(1).max(100),title,description,dueLocal,timeZone:z.string().max(100).regex(zoneName),offsetMinutes:z.number().int().min(-840).max(840),dueAt:z.iso.datetime({offset:true}),minutes:z.union([z.literal(15),z.literal(30),z.literal(60),z.literal(90)]),status:z.enum(['pending','completed','cancelled']),created:z.iso.datetime({offset:true}),updated:z.iso.datetime({offset:true}),eventCount:z.number().int().min(1).max(50)};
export const ReminderSchema=z.object(recordFields).strict().superRefine((value,ctx)=>{try{if(wallEpoch(value.dueLocal)-value.offsetMinutes*60000!==Date.parse(value.dueAt)||Date.parse(value.updated)<Date.parse(value.created))throw Error();}catch{ctx.addIssue({code:'custom',message:'Время задачи не прошло проверку'});}});
export type Reminder=z.infer<typeof ReminderSchema>;
export const ReminderBoardSchema=z.object({format:z.literal('jobmatch-reminders-v1'),ownerId:z.uuid(),revision:z.number().int().nonnegative(),workspace_revision:z.number().int().nonnegative(),server_now:z.iso.datetime({offset:true}),reminders:z.array(ReminderSchema).max(100)}).strict().refine(value=>new Set(value.reminders.map(row=>row.id)).size===value.reminders.length&&(value.revision>0||value.reminders.length===0));
export type ReminderBoard=z.infer<typeof ReminderBoardSchema>;
export const ReminderHistorySchema=z.object({format:z.literal('jobmatch-reminder-history-v1'),ownerId:z.uuid(),revision:z.number().int().positive(),reminder:ReminderSchema,events:z.array(z.object({sequence:z.number().int().min(1).max(50),action:z.enum(['create','update','complete','cancel']),at:z.iso.datetime({offset:true}),snapshot:ReminderSchema}).strict()).min(1).max(50)}).strict().superRefine((value,ctx)=>{
 if(value.reminder.eventCount!==value.events.length||value.events.some((event,i)=>event.sequence!==i+1||event.snapshot.id!==value.reminder.id||event.snapshot.applicationId!==value.reminder.applicationId||event.snapshot.eventCount!==i+1||event.at!==event.snapshot.updated)||(JSON.stringify(value.events.at(-1)?.snapshot)!==JSON.stringify(value.reminder)))ctx.addIssue({code:'custom',message:'Неполная или несогласованная история задачи'});
 for(let i=0;i<value.events.length;i++){
  const event=value.events[i],current=event.snapshot,previous=value.events[i-1]?.snapshot;
  let valid=i===0?event.action==='create'&&current.status==='pending'&&current.created===current.updated:!!previous&&previous.status==='pending'&&current.created===previous.created&&Date.parse(current.updated)>=Date.parse(previous.updated)&&event.action!=='create';
  if(previous){
   if(event.action==='update')valid&&=current.status==='pending';
   else{valid&&=current.status===(event.action==='complete'?'completed':'cancelled');const before={...previous,status:current.status,updated:current.updated,eventCount:current.eventCount};valid&&=JSON.stringify(before)===JSON.stringify(current);}
  }
  if(!valid)ctx.addIssue({code:'custom',message:'Нарушена последовательность событий задачи'});
 }
});
export type ReminderHistory=z.infer<typeof ReminderHistorySchema>;
export function validateReminderBoard(value:unknown,ownerId:string,workspaceRevision?:number){const board=ReminderBoardSchema.parse(value);if(board.ownerId!==ownerId||(workspaceRevision!==undefined&&board.workspace_revision!==workspaceRevision))throw Error('Список задач другого аккаунта или ревизии. Загрузите актуальные данные.');return board;}
export function isOverdue(reminder:Reminder,serverNow:string){return reminder.status==='pending'&&Date.parse(reminder.dueAt)<Date.parse(serverNow);}

export function reminderZoneChanged(reminder:Reminder){try{return wallAt(new Date(reminder.dueAt),reminder.timeZone)!==reminder.dueLocal;}catch{return true;}}
