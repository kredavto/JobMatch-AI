import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin,userOf,requireExpectedOwner,failure} from '../../../lib/http';
import {consumeQuota,readWorkspace} from '../../../lib/db';
import {boundedBody} from '../../../lib/body';
import {UserError} from '../../../lib/errors';
import {observeRoute} from '../../../lib/ops-telemetry';
import {prepareRewriteSource,RewriteFactIds,RewriteLanguage} from '../../../lib/ai-rewrite';
import {proposeRewrite,rewriteConfig} from '../../../lib/ai-rewrite-provider';
import {issueRewriteReceipt} from '../../../lib/ai-rewrite-signing';
import {sameJson} from '../../../lib/application-write-response';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const input=z.strictObject({consent:z.literal(true),expectedOwnerId:z.uuid(),revision:z.number().int().min(0).max(2147483647),factIds:RewriteFactIds,requestedLanguage:RewriteLanguage});
/** Preview only. This endpoint cannot accept a proposal or mutate a workspace. */
async function POSTHandler(req:NextRequest){try{
 sameOrigin(req);const user=await userOf(req);requireExpectedOwner(req,user.id);
 let raw:unknown;try{raw=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(await boundedBody(req,4096)));}catch(error){if(error instanceof TypeError)throw new UserError('Некорректный UTF-8.',400,'INVALID_INPUT');throw error;}
 const body=input.parse(raw);
 if(body.expectedOwnerId!==user.id)throw new UserError('Account changed.',409,'ACCOUNT_CHANGED');
 const config=rewriteConfig(),loaded=await readWorkspace(user);
 if(loaded.ownerId!==undefined&&loaded.ownerId!==user.id)throw new UserError('Некорректный владелец ответа.',502,'WORKSPACE_INVALID_RESPONSE');
 const state={...loaded,ownerId:user.id};
 if(state.revision!==body.revision)throw new Error('CONFLICT');
 let source;try{source=await prepareRewriteSource(state,user.id,body.factIds);}catch{throw new UserError('Исходник не допускает выбранное переписывание.',400,'AI_REWRITE_SOURCE_INVALID');}
 await consumeQuota(user,'analysis');
 const preview=await proposeRewrite(source,state.original,body.requestedLanguage,req.signal,config);
 const active=await userOf(req);if(active.id!==user.id)throw new UserError('Account changed.',409,'ACCOUNT_CHANGED');
 const current=await readWorkspace(active),latest=rewriteConfig();
 if(current.ownerId!==undefined&&current.ownerId!==user.id)throw new UserError('Некорректный владелец ответа.',502,'WORKSPACE_INVALID_RESPONSE');
 if(current.revision!==state.revision||current.original!==state.original||current.vacancy!==state.vacancy||!sameJson(current.facts,state.facts)||latest.configurationId!==config.configurationId)throw new Error('CONFLICT');
 if(req.signal.aborted)throw new UserError('Запрос прерван.',504,'AI_REWRITE_TIMEOUT');
 const receipt=await issueRewriteReceipt(user.id,state,preview,latest.signing);
 if(req.signal.aborted)throw new UserError('Запрос прерван.',504,'AI_REWRITE_TIMEOUT');
 return NextResponse.json({ownerId:user.id,revision:state.revision,receipt},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}
export const POST=observeRoute('ai-rewrites','POST',POSTHandler);
