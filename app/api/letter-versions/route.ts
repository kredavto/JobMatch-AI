import {observeRoute} from '../../../lib/ops-telemetry';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota,readWorkspace} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {UserError} from '../../../lib/errors';
import {LetterReceiptSchema} from '../../../lib/saved-letter';
import {letterSigningConfig,issueLetterReceipt,verifyLetterReceipt} from '../../../lib/saved-letter-signing';
import {readSavedLetters,readSavedLetter,acceptSavedLetter,requireLetterSigningReady} from '../../../lib/saved-letter-db';
import {savedLetterStream} from '../../../lib/saved-letter-stream';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const revision=z.number().int().min(0).max(2147483647),letterRevision=z.number().int().min(0).max(49);
const context={expectedOwnerId:z.uuid(),workspaceRevision:revision,letterRevision,consentToStore:z.literal(true)};
const requestSchema=z.discriminatedUnion('action',[
 z.strictObject({action:z.literal('preview'),...context,snapshotJson:z.string().min(1).max(1000000)}),
 z.strictObject({action:z.literal('accept'),...context,receipt:LetterReceiptSchema,accept:z.literal('SAVE_REVIEWED_LETTER_VERSION')})
]);
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 const bytes=await boundedBody(req,2100000);let raw:string;try{raw=new TextDecoder('utf8',{fatal:true}).decode(bytes);}catch{throw new UserError('Проверьте кодировку запроса.',400);}const body=requestSchema.parse(JSON.parse(raw));
 if(body.expectedOwnerId!==user.id)throw Error('CONFLICT');
 const config=letterSigningConfig();await consumeQuota(user,'service');
 if(body.action==='accept'){
  const verified=verifyLetterReceipt(body.receipt,user.id,config);
  if(verified.payload.source.workspaceRevision!==body.workspaceRevision||verified.payload.source.letterRevision!==body.letterRevision)throw Error('CONFLICT');
  return NextResponse.json(await acceptSavedLetter(user,body.workspaceRevision,body.letterRevision,verified.receipt),{headers:{'Cache-Control':'no-store'}});
 }
 await requireLetterSigningReady(user,config.keyId);
 const [workspace,state]=await Promise.all([readWorkspace(user),readSavedLetters(user)]);
 if(workspace.revision!==body.workspaceRevision||state.revision!==body.letterRevision)throw Error('CONFLICT');
 const receipt=issueLetterReceipt(user.id,workspace,state.revision,body.snapshotJson,config);
 // No current-source claim based on a snapshot read before potentially expensive validation.
 const [current,letters]=await Promise.all([readWorkspace(user),readSavedLetters(user)]);
 if(current.ownerId!==workspace.ownerId||current.revision!==workspace.revision||current.original!==workspace.original||current.vacancy!==workspace.vacancy||JSON.stringify(current.facts)!==JSON.stringify(workspace.facts)||letters.revision!==state.revision)throw Error('CONFLICT');
 return NextResponse.json({format:'jobmatch-letter-preview-v1',ownerId:user.id,workspaceRevision:workspace.revision,letterRevision:state.revision,receipt,semanticAssessment:'not-performed',modelVersion:null},{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}
async function GETHandler(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);const q=req.nextUrl.searchParams;
 if([...q.keys()].some(k=>!['id','export','expectedOwnerId'].includes(k))||q.getAll('id').length>1||q.getAll('export').length>1||q.has('id')&&q.has('export')||q.has('export')&&q.get('export')!=='1')throw new UserError('Проверьте параметры истории писем.',400);
 const id=q.has('id')?z.uuid().parse(q.get('id')):null;await consumeQuota(user,'service');
 if(id)return NextResponse.json(await readSavedLetter(user,id),{headers:{'Cache-Control':'no-store','Content-Disposition':'attachment; filename="jobmatch-saved-letter.json"'}});
 const state=await readSavedLetters(user);
 if(q.has('export'))return new Response(savedLetterStream(state,id=>readSavedLetter(user,id),req.signal),{headers:{'Cache-Control':'no-store','Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':'attachment; filename="jobmatch-saved-letters.ndjson"'}});
 return NextResponse.json(state,{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}

export const POST=observeRoute('letter-versions','POST',POSTHandler);
export const GET=observeRoute('letter-versions','GET',GETHandler);
