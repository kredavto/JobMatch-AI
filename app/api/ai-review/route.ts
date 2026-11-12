import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin,failure} from '../../../lib/http';
import {LOCAL_ADAPTATION_DESCRIPTION} from '../../../lib/public-ai-policy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){try{
 sameOrigin(req);
 // Refuse before authentication, workspace reads, quota, credentials or inference.
 // Stored workspace text is no more trusted than a client-supplied source label.
 return NextResponse.json({error:LOCAL_ADAPTATION_DESCRIPTION},{status:503,headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}}
