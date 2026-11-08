import {aiCapability} from '../../../../mvp/ai';
import {privateHeaders} from '../../../../mvp/http';
export const dynamic='force-dynamic';
export async function GET(){
 return Response.json({ai:await aiCapability(),hh:{state:'not_connected'}},{headers:privateHeaders});
}
