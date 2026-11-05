import {it,expect} from 'vitest';
import {ReminderCommandSchema,RemindersStateSchema,validateReminderWrite,type RemindersState,type PersistedReminder} from '../lib/persisted-reminders';
const ownerId='11111111-1111-4111-8111-111111111111',id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',created='2026-11-05T08:00:00.000Z';
export const command={action:'create' as const,id,applicationId:'__proto__',kind:'interview' as const,localStart:'2026-11-01T01:30',zone:'America/New_York',offsetMinutes:-300,dueAt:'2026-11-01T06:30:00.000Z',minutes:30 as const,description:'Literal 🧑‍💻\nNo automatic mail'};
export const empty:RemindersState={format:'jobmatch-reminders-state-v1',ownerId,revision:0,delivery:'none',items:[]};
const {action:_action,...fields}=command;void _action;
export const row:PersistedReminder={...fields,revision:1,status:'scheduled',created,updated:created};
export const saved:RemindersState={...empty,revision:1,items:[row]};
it('binds an explicit DST occurrence and literal metadata without changing input',()=>{const s=JSON.stringify(command);expect(ReminderCommandSchema.parse(command)).toEqual(command);expect(validateReminderWrite(saved,empty,command)).toEqual(saved);expect(JSON.stringify(command)).toBe(s);});
it.each([
 {offsetMinutes:-240},{dueAt:'2026-11-01T05:30:00.000Z'},{zone:'Unknown/Zone'},{localStart:'2026-03-08T02:30'},
 {localStart:'2026-02-30T01:30'},{minutes:45},{description:'x'.repeat(3001)},{description:'\u0000'},{description:'\ud800'},
 {notification:true},{ownerId},{id:id.toUpperCase()},{applicationId:''},{offsetMinutes:-300.5},{dueAt:'2026-11-01T06:30:00Z'}
])('rejects malformed, inconsistent or hidden-delivery command %j',change=>expect(ReminderCommandSchema.safeParse({...command,...change}).success).toBe(false));
it('counts Unicode scalars and accepts supported boundary UTC year, gap/fold and non-hour zone rules',()=>{
 expect(ReminderCommandSchema.safeParse({...command,description:'😀'.repeat(3000)}).success).toBe(true);
 expect(ReminderCommandSchema.safeParse({...command,description:'😀'.repeat(3001)}).success).toBe(false);
 expect(ReminderCommandSchema.safeParse({...command,localStart:'2000-01-01T00:00',zone:'Pacific/Kiritimati',offsetMinutes:840,dueAt:'1999-12-31T10:00:00.000Z'}).success).toBe(true);
 expect(ReminderCommandSchema.safeParse({...command,localStart:'2026-06-01T10:30',zone:'Asia/Kathmandu',offsetMinutes:345,dueAt:'2026-06-01T04:45:00.000Z'}).success).toBe(true);
});
it.each(['owner','revision','delivery','note','time','extra','missing','created'])('rejects schema-valid or malformed ACK change %s',kind=>{
 const next=structuredClone(saved);if(kind==='owner')next.ownerId='22222222-2222-4222-8222-222222222222';if(kind==='revision')next.revision=2;if(kind==='delivery')Object.assign(next,{delivery:'email'});if(kind==='note')next.items[0].description='invented';if(kind==='time')Object.assign(next.items[0],{offsetMinutes:-240,dueAt:'2026-11-01T05:30:00.000Z'});if(kind==='extra')next.items.push({...row,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'});if(kind==='missing')next.items=[];if(kind==='created')next.items[0].updated='2026-11-05T08:00:01.000Z';expect(()=>validateReminderWrite(next,empty,command)).toThrow();
});
it('accepts only exact completion/cancellation/deletion, preserving every other reminder',()=>{
 const other={...row,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'},before={...saved,items:[row,other]};
 for(const action of ['complete','cancel'] as const){const after={...before,revision:2,items:[{...row,revision:2,updated:'2026-11-05T08:00:01.000Z',status:action==='complete'?'completed' as const:'cancelled' as const},other]};expect(validateReminderWrite(after,before,{action,id})).toEqual(after);expect(()=>validateReminderWrite({...after,items:after.items.map(r=>({...r,description:'changed'}))},before,{action,id})).toThrow();expect(()=>validateReminderWrite({...after,revision:3},after,{action,id})).toThrow();}
 const removed={...before,revision:2,items:[other]};expect(validateReminderWrite(removed,before,{action:'delete',id})).toEqual(removed);expect(()=>validateReminderWrite({...removed,items:[]},before,{action:'delete',id})).toThrow();
});
it('reschedules and explicitly reopens cancelled reminders, retaining creation and unrelated data',()=>{const before={...saved,items:[{...row,status:'cancelled' as const}]},next={...before,revision:2,items:[{...row,revision:2,description:'New literal note',updated:'2026-11-05T08:01:00.000Z'}]},c={...command,action:'reschedule' as const,description:'New literal note'};expect(validateReminderWrite(next,before,c)).toEqual(next);expect(()=>validateReminderWrite({...next,items:next.items.map(r=>({...r,created:r.updated}))},before,c)).toThrow();});
it('refuses duplicate/out-of-order items, future item revisions, unknown fields and a state above cap',()=>{for(const state of [{...saved,items:[row,row]},{...saved,items:[{...row,revision:2}]},{...saved,extra:true},{...saved,items:Array.from({length:101},()=>row)}])expect(RemindersStateSchema.safeParse(state).success).toBe(false);});

it('reads frozen accepted occurrence without reinterpreting it through current timezone rules',()=>{expect(RemindersStateSchema.safeParse({...saved,items:[{...row,zone:'Previously/Accepted_Zone'}]}).success).toBe(true);expect(ReminderCommandSchema.safeParse({...command,zone:'Previously/Accepted_Zone'}).success).toBe(false);expect(RemindersStateSchema.safeParse({...saved,items:[{...row,offsetMinutes:-240}]}).success).toBe(false);});
