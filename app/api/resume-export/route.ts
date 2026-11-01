import {observeRoute} from '../../../lib/ops-telemetry';
import {NextRequest} from 'next/server';
import {z} from 'zod';
import {userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota,readWorkspace} from '../../../lib/db';
import {UserError} from '../../../lib/errors';
import {resumeDocx} from '../../../lib/resume-docx';
export const dynamic='force-dynamic';
export const runtime='nodejs';
async function GETHandler(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);
 const id=z.string().min(1).max(200).parse(req.nextUrl.searchParams.get('id'));
 await consumeQuota(user,'service');
 const workspace=await readWorkspace(user);
 const version=workspace.versions.find(v=>v.id===id);
 if(!version)throw new UserError('Сохраненная версия не найдена.',404);
 const bytes=await resumeDocx(version.text);
 return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename="jobmatch-resume.docx"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return failure(e);}}

export const GET=observeRoute('resume-export','GET',GETHandler);
