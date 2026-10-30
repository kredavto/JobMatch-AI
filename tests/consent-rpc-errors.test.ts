import {it,expect,vi,afterEach} from 'vitest';
import {supabase} from '../lib/db';
import {failure} from '../lib/http';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it.each([['AUTH',401,'AUTH_REQUIRED'],['CONSENT_LEDGER_INTEGRITY',503,'STORAGE_INTEGRITY'],['CONSENT_HISTORY_LIMIT',400,'CONSENT_HISTORY_LIMIT']] as const)('maps RPC %s to a stable redacted failure',async(message,status,code)=>{
 vi.stubEnv('SUPABASE_URL','https://synthetic.invalid');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','SYNTHETIC_PUBLIC');
 const fetch=vi.fn().mockResolvedValue(Response.json({message,details:'PRIVATE_RAW'},{status:400}));vi.stubGlobal('fetch',fetch);
 let caught:unknown;try{await supabase('/rest/v1/rpc/read_consent_receipts','POST',{});}catch(error){caught=error;}
 const response=failure(caught);expect(response.status).toBe(status);expect((await response.json()).code).toBe(code);expect(fetch).toHaveBeenCalledTimes(1);
});
