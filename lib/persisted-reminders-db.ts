import {supabase,type Identity} from './db';
import {UserError} from './errors';
import {RemindersStateSchema,ReminderCommandSchema,validateReminderWrite,type ReminderCommand} from './persisted-reminders';
export async function readReminders(user:Identity){
 const raw=await supabase('/rest/v1/rpc/read_reminders','POST',{},user.token);
 try{const state=RemindersStateSchema.parse(raw);if(state.ownerId!==user.id)throw Error();return state;}catch{throw new UserError('Ответ напоминаний не прошёл проверку.',502,'UPSTREAM_INVALID_RESPONSE');}
}
export async function commandReminder(user:Identity,workspaceRevision:number,revision:number,command:ReminderCommand){
 const parsed=ReminderCommandSchema.parse(command),before=await readReminders(user);if(before.revision!==revision)throw Error('CONFLICT');
 const raw=await supabase('/rest/v1/rpc/command_reminder','POST',{p_workspace_revision:workspaceRevision,p_revision:revision,p_command:parsed},user.token);
 try{return validateReminderWrite(raw,before,parsed);}catch{throw new UserError('Ответ записи не прошёл проверку. Сначала перечитайте напоминания.',502,'UPSTREAM_INVALID_RESPONSE');}
}
