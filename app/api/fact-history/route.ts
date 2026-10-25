import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {readFactHistory} from '../../../lib/fact-history';
import {consumeQuota} from '../../../lib/db';
import {userOf,failure} from '../../../lib/http';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{
 const user=await userOf(req);await consumeQuota(user,'service');
 const cursor=req.nextUrl.searchParams.get('before');const before=cursor===null?undefined:z.coerce.number().int().positive().max(2147483647).parse(cursor);
 const first=await readFactHistory(user,before);
 if(req.nextUrl.searchParams.get('export')==='1'){
  let page=first;let finished=false;
  const encoder=new TextEncoder();
  const stream=new ReadableStream<Uint8Array>({async pull(controller){try{
   if(finished){controller.enqueue(encoder.encode(JSON.stringify({complete:true})+'\n'));controller.close();return;}
   for(const row of page.rows)controller.enqueue(encoder.encode(JSON.stringify(row)+'\n'));
   if(page.next===null){finished=true;}else page=await readFactHistory(user,page.next);
  }catch{controller.enqueue(encoder.encode(JSON.stringify({complete:false,error:'Экспорт прерван. Повторите скачивание.'})+'\n'));controller.close();}}});
  return new Response(stream,{headers:{'Cache-Control':'no-store','Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':'attachment; filename="jobmatch-fact-history.ndjson"'}});
 }
 return NextResponse.json(first,{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
