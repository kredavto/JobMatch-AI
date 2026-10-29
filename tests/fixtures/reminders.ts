import type {Reminder,ReminderBoard,ReminderHistory} from '../../lib/reminders';
export const owner='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
export const command={action:'create' as const,applicationId:'a1',title:'Контакт',description:'Проверить статус',dueLocal:'2026-10-28T10:30',timeZone:'Europe/Moscow',offsetMinutes:180,minutes:30 as const,accept:'SAVE_REMINDER' as const};
export const reminder:Reminder={id,applicationId:'a1',title:command.title,description:command.description,dueLocal:command.dueLocal,timeZone:command.timeZone,offsetMinutes:180,dueAt:'2026-10-28T07:30:00+00:00',minutes:30,status:'pending',created:'2026-10-27T00:00:00+00:00',updated:'2026-10-27T00:00:00+00:00',eventCount:1};
export const board:ReminderBoard={format:'jobmatch-reminders-v1',ownerId:owner,revision:1,workspace_revision:1,server_now:'2026-10-29T00:00:00+00:00',reminders:[reminder]};
export const history:ReminderHistory={format:'jobmatch-reminder-history-v1',ownerId:owner,revision:1,reminder,events:[{sequence:1,action:'create',at:reminder.updated,snapshot:reminder}]};
