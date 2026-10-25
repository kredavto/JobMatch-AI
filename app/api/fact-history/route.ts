import {NextRequest,NextResponse} from 'next/server';
import {UserError} from '../../../lib/errors';
import {historyStream} from '../../../lib/history-stream';
import {z} from 'zod';
import {readFactHistory} from '../../../lib/fact-history';
import {consumeQuota} from '../../../lib/db';
import {userOf,requireExpectedOwner,failure} from '../../../lib/http';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);await consumeQuota(user,'service');
 const cursor=req.nextUrl.searchParams.get('before');const before=cursor===null?undefined:z.coerce.number().int().positive().max(2147483647).parse(cursor);
 if(req.nextUrl.searchParams.get('export')==='1'&&cursor!==null)throw new UserError('Полный экспорт истории выполняется без курсора.');
 const first=await readFactHistory(user,before);
 if(req.nextUrl.searchParams.get('export')==='1'){
  const stream=historyStream(first,cursor=>readFactHistory(user,cursor));
  return new Response(stream,{headers:{'Cache-Control':'no-store','Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':'attachment; filename="jobmatch-fact-history.ndjson"'}});
 }
 return NextResponse.json(first,{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
