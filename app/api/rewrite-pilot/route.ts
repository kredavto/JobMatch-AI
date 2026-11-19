import {pilotConfig,createPilotBackend} from '../../../mvp/pilot-backend';
import {createSupabaseGroqPilotRuntime} from '../../../mvp/pilot-runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const handler=(request:Request)=>{
 const config=pilotConfig();const backend=config?createPilotBackend(config,fetch):null;
 return createSupabaseGroqPilotRuntime(backend?{enabled:true,rpc:backend.call,verify:backend.verify,key:process.env.GROQ_API_KEY,fetcher:fetch}:{})(request);
};
export const GET=handler;
export const POST=handler;
