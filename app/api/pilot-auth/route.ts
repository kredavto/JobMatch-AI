import {pilotConfig,createPilotBackend} from '../../../mvp/pilot-backend';
import {createPilotAuthService} from '../../../mvp/pilot-auth-service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const handler=(request:Request)=>{const config=pilotConfig();return createPilotAuthService(config?createPilotBackend(config,fetch):undefined)(request);};
export const GET=handler;
export const POST=handler;
