import {observeRoute} from '../../../lib/ops-telemetry';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,rateLimit,failure} from '../../../lib/http';
import {consumeQuota} from '../../../lib/db';
import {UserError} from '../../../lib/errors';
import {boundedBody} from '../../../lib/body';
import {ConsentRequestSchema} from '../../../lib/consent-receipts';
import {readConsentReceipts,acceptProcessingNotice,consentAcceptanceEnabled} from '../../../lib/consent-receipts-db';
export const runtime='nodejs';export const dynamic='force-dynamic';
const numeric=z.string().regex(/^(0|[1-9]\d{0,2})$/).transform(Number).pipe(z.number().int().min(0).max(200));
const readQuery=z.object({expectedOwnerId:z.uuid(),locale:z.enum(['ru','en']),after:numeric.optional(),through:numeric.optional()}).strict();
const writeQuery=z.object({expectedOwnerId:z.uuid()}).strict();
function query(req:NextRequest){const params=req.nextUrl.searchParams;if(new Set(params.keys()).size!==Array.from(params).length)throw new SyntaxError();return Object.fromEntries(params);}
const ok=(value:unknown)=>NextResponse.json(value,{headers:{'Cache-Control':'no-store'}});
async function get(req:NextRequest){try{
 const user=await userOf(req);requireExpectedOwner(req,user.id);const input=readQuery.parse(query(req)),enabled=consentAcceptanceEnabled();rateLimit('consent-read:'+user.id);await consumeQuota(user,'service');
 return ok({page:await readConsentReceipts(user,input.locale,input.after??0,input.through),acceptanceEnabled:enabled});
 }catch(error){return failure(error);}}
async function post(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);writeQuery.parse(query(req));rateLimit('consent-write:'+user.id,20);
 const input=ConsentRequestSchema.parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,4096))));
 if(!consentAcceptanceEnabled())throw new UserError('Запись принятия не настроена.',503,'CONSENT_NOT_CONFIGURED');
 await consumeQuota(user,'service');return ok(await acceptProcessingNotice(user,input));
 }catch(error){return failure(error);}}

export const GET=observeRoute('consent-receipts','GET',get);
export const POST=observeRoute('consent-receipts','POST',post);
