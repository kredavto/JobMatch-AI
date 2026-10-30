import {observeRoute} from '../../../lib/ops-telemetry';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,failure,requireExpectedOwner} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {ReminderCommandSchema} from '../../../lib/reminders';
import {readReminders,writeReminder,readReminderHistory,reminderExportStream} from '../../../lib/reminders-db';
import {UserError} from '../../../lib/errors';
export const runtime='nodejs';export const dynamic='force-dynamic';
const input=z.object({expectedOwnerId:z.uuid(),workspaceRevision:z.number().int().nonnegative(),revision:z.number().int().nonnegative(),command:ReminderCommandSchema}).strict();
async function get(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);await consumeQuota(user,'service');
 const ids=req.nextUrl.searchParams.getAll('id'),exports=req.nextUrl.searchParams.getAll('export');if(ids.length>1||exports.length>1||(ids.length&&exports.length))throw new UserError('Выберите историю задачи или полный экспорт.',400,'EXPORT_QUERY_INVALID');
 if(ids.length)return NextResponse.json(await readReminderHistory(user,z.uuid().parse(ids[0])),{headers:{'Cache-Control':'no-store'}});
 const board=await readReminders(user);
 if(exports[0]==='1')return new Response(reminderExportStream(board,async id=>{await consumeQuota(user,'service');return readReminderHistory(user,id);},async()=>{await consumeQuota(user,'service');return readReminders(user);}),{headers:{'Cache-Control':'no-store','Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':'attachment; filename="jobmatch-reminders.ndjson"'}});
 return NextResponse.json(board,{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}
async function post(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);const body=input.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBody(req,12000))));
 if(body.expectedOwnerId!==user.id)throw new UserError('Аккаунт изменился. Вернитесь в исходный аккаунт.',409,'OWNER_CHANGED');
 await consumeQuota(user,'service');return NextResponse.json(await writeReminder(user,body.workspaceRevision,body.revision,body.command),{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}

export const GET=observeRoute('reminders','GET',get);
export const POST=observeRoute('reminders','POST',post);
