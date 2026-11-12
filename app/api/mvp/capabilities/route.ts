import {PUBLIC_AI_CAPABILITY} from '../../../../lib/public-ai-policy';
import {hhConfigured} from '../../../../mvp/hh';
import {privateHeaders} from '../../../../mvp/http';
export const dynamic='force-dynamic';
export async function GET(){
 return Response.json({ai:PUBLIC_AI_CAPABILITY,hh:{state:hhConfigured()?'configured_unverified':'not_configured'}},{headers:privateHeaders});
}
