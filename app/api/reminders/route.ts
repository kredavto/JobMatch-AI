import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {boundedBody} from '../../../lib/body';
import {consumeQuota} from '../../../lib/db';
import {UserError} from '../../../lib/errors';
import {ReminderRequestSchema} from '../../../lib/persisted-reminders';
import {readReminders,commandReminder} from '../../../lib/persisted-reminders-db';
import {observeRoute} from '../../../lib/ops-telemetry';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function query(req:NextRequest,write=false){const q=req.nextUrl.searchParams;if([...q.keys()].some(k=>!['expectedOwnerId',...(write?[]:['export'])].includes(k))||[...new Set(q.keys())].some(k=>q.getAll(k).length!==1)||q.has('export')&&q.get('export')!=='1')throw new UserError('Проверьте параметры запроса.',400,'INVALID_INPUT');}
async function GETHandler(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);query(req);await consumeQuota(user,'service');
 const state=await readReminders(user);return NextResponse.json(state,{headers:{'Cache-Control':'no-store',...(req.nextUrl.searchParams.has('export')?{'Content-Disposition':'attachment; filename="jobmatch-reminders.json"'}:{})}});
}catch(e){return failure(e);}}
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);query(req,true);
 const bytes=await boundedBody(req,24000);let text:string;try{text=new TextDecoder('utf8',{fatal:true}).decode(bytes);}catch{throw new UserError('Проверьте кодировку запроса.',400,'REQUEST_ENCODING_INVALID');}
 const body=ReminderRequestSchema.parse(JSON.parse(text));if(body.expectedOwnerId!==user.id)throw Error('CONFLICT');
 if(process.env.JOBMATCH_REMINDERS_ENABLED!=='true')throw new UserError('Сохранение напоминаний недоступно.',503,'UPSTREAM_UNAVAILABLE');
 await consumeQuota(user,'service');return NextResponse.json(await commandReminder(user,body.workspaceRevision,body.revision,body.command),{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
export const GET=observeRoute('reminders','GET',GETHandler);
export const POST=observeRoute('reminders','POST',POSTHandler);
