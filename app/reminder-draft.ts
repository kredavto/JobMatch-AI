import type {PersistedReminder,ReminderCommand,RemindersState} from '../lib/persisted-reminders';
import {ReminderCommandSchema} from '../lib/persisted-reminders';
import {calendarTimeOptions} from '../lib/calendar-time';
import {sameJson} from '../lib/application-write-response';
export type ReminderForm={applicationId:string;kind:'interview'|'follow-up';localStart:string;zone:string;offset:string;minutes:15|30|60|90;description:string};
export type ReminderDraft={id:string;base:PersistedReminder|null;workspaceRevision:number;form:ReminderForm;consent:boolean};
export function reminderForm(row:PersistedReminder):ReminderForm{return {applicationId:row.applicationId,kind:row.kind,localStart:row.localStart,zone:row.zone,offset:String(row.offsetMinutes),minutes:row.minutes,description:row.description};}
export function reminderDraftStale(draft:ReminderDraft,state:RemindersState,workspaceRevision:number){return draft.workspaceRevision!==workspaceRevision||!sameJson(draft.base,state.items.find(r=>r.id===draft.id)??null);}
export function reminderProposal(draft:ReminderDraft):ReminderCommand|null{
 try{const f=draft.form,candidates=calendarTimeOptions(f.localStart,f.zone),chosen=candidates.length===1?candidates[0]:candidates.find(c=>String(c.offsetMinutes)===f.offset);if(!chosen)return null;
  return ReminderCommandSchema.parse({action:draft.base?'reschedule':'create',id:draft.id,applicationId:f.applicationId,kind:f.kind,localStart:f.localStart,zone:f.zone,offsetMinutes:chosen.offsetMinutes,dueAt:chosen.dueAt,minutes:f.minutes,description:f.description});
 }catch{return null;}
}
/** A late ACK rebases only its original editing session; newer text/consent is retained. */
export function acknowledgeReminderDraft(current:ReminderDraft|null,submitted:ReminderDraft,record:PersistedReminder,unchanged:boolean,sameSession:boolean):ReminderDraft|null{
 if(!sameSession||!current||current.id!==submitted.id||!sameJson(current.base,submitted.base))return current;
 if(unchanged&&sameJson(current,submitted))return null;
 return {...current,base:record,workspaceRevision:submitted.workspaceRevision};
}
