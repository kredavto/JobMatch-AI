import {supabase,type Identity} from './db';
import {validateReminderBoard,ReminderHistorySchema,reminderSqlCommand,type ReminderCommand,type ReminderBoard,type ReminderHistory} from './reminders';
import {UserError} from './errors';
export async function readReminders(user:Identity){const data=await supabase('/rest/v1/rpc/read_reminders','POST',{},user.token);try{return validateReminderBoard(data,user.id);}catch{throw new UserError('Список задач не прошёл проверку.',502,'REMINDER_LIST_INVALID');}}
export async function writeReminder(user:Identity,workspaceRevision:number,revision:number,command:ReminderCommand){
 const data=await supabase('/rest/v1/rpc/command_reminder','POST',{p_workspace_revision:workspaceRevision,p_revision:revision,p_command:reminderSqlCommand(command)},user.token);
 try{const board=validateReminderBoard(data,user.id,workspaceRevision);if(board.revision!==revision+1)throw Error();return board;}catch{throw new UserError('Ответ записи не прошёл проверку. Прочитайте задачи без повтора записи.',502,'WRITE_RESULT_INVALID');}
}
export async function readReminderHistory(user:Identity,id:string){const data=await supabase('/rest/v1/rpc/read_reminder_history','POST',{p_id:id},user.token);if(data===null)throw new UserError('Задача не найдена.',404,'REMINDER_NOT_FOUND');try{const history=ReminderHistorySchema.parse(data);if(history.ownerId!==user.id||history.reminder.id!==id)throw Error();return history;}catch{throw new UserError('История задачи не прошла проверку.',502,'REMINDER_HISTORY_INVALID');}}
export function reminderExportStream(board:ReminderBoard,read:(id:string)=>Promise<ReminderHistory>,recheck:()=>Promise<ReminderBoard>,limit=64*1024*1024){
 let index=0,cancelled=false,bytes=0;const line=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)+'\n');
 return new ReadableStream<Uint8Array>({async pull(controller){if(cancelled)return;try{
  if(index===board.reminders.length){const current=await recheck();if(cancelled)return;if(current.ownerId!==board.ownerId||current.revision!==board.revision)throw Error();controller.enqueue(line({complete:true,format:'jobmatch-reminder-export-v1',ownerId:board.ownerId,revision:board.revision,reminders:index}));controller.close();return;}
  const summary=board.reminders[index],history=await read(summary.id);if(cancelled)return;
  if(history.ownerId!==board.ownerId||history.revision!==board.revision||history.reminder.id!==summary.id||JSON.stringify(history.reminder)!==JSON.stringify(summary))throw Error();
  const chunk=line(history);if(bytes+chunk.byteLength>limit)throw Error();bytes+=chunk.byteLength;index++;controller.enqueue(chunk);
 }catch{if(cancelled)return;controller.enqueue(line({complete:false,error:'Экспорт неполный: данные изменились, доступ прерван или превышен лимит. Повторите чтение.'}));controller.close();}},cancel(){cancelled=true;}});
}
