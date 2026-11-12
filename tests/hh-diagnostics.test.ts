import {afterEach,describe,expect,it,vi} from 'vitest';
import {logHHRefusal} from '../mvp/hh-diagnostics';
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
describe('opt-in server HH refusal logging',()=>{
 it.each([undefined,'false','TRUE','1'])('stays silent unless the exact opt-in is true (%s)',flag=>{
  vi.stubEnv('JOBMATCH_HH_DIAGNOSTICS_ENABLED',flag);const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  logHHRefusal(new Response(null,{status:403}),'/me',{},[]);expect(log).not.toHaveBeenCalled();
 });
 it('logs only bounded normalized fields, never raw content, URLs, headers or credentials',()=>{
  vi.stubEnv('JOBMATCH_HH_DIAGNOSTICS_ENABLED','true');const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const id='0123456789abcdef0123456789abcdef';
  const response=new Response('RAW_PRIVATE_BODY',{status:403,headers:{'content-type':'Application/JSON; private=HEADER_SECRET','set-cookie':'COOKIE_SECRET'}});
  logHHRefusal(response,'/vacancies/139363612',{request_id:id,errors:[{type:'oauth',value:'token_expired',captcha_url:'https://secret.example'},{type:'TOKEN_SECRET',value:'PRIVATE_TEXT'}],access_token:'TOKEN_SECRET'},['TOKEN_SECRET','COOKIE_SECRET']);
  const line=log.mock.calls[0][0] as string,data=JSON.parse(line);
  expect(data).toEqual({event:'hh_upstream_refusal',status:403,content_type:'application/json',request_id:id,errors:[{type:'oauth',value:'token_expired'},{type:'[redacted]',value:'[redacted]'}],time_utc:expect.stringMatching(/^\d{4}-\d\d-\d\dT.*Z$/),operation:'vacancy_read'});
  for(const secret of ['RAW_PRIVATE_BODY','HEADER_SECRET','COOKIE_SECRET','TOKEN_SECRET','PRIVATE_TEXT','139363612','https://'])expect(line).not.toContain(secret);
 });
 it('redacts credentials even if they match allowed request-ID or enum formats',()=>{
  vi.stubEnv('JOBMATCH_HH_DIAGNOSTICS_ENABLED','true');const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const token='0123456789abcdef0123456789abcdef';
  logHHRefusal(new Response(null,{status:401,headers:{'content-type':'application/json'}}),'/resumes/private-id',{request_id:token,errors:[{type:'oauth',value:'token_expired'}]},[token,'oauth','token_expired','application/json']);
  const line=log.mock.calls[0][0] as string;for(const value of [token,'oauth','token_expired','application/json','private-id'])expect(line).not.toContain(value);
 });
 it.each(['Bearer token','123','https://private.example','a'.repeat(100),'<script>secret</script>'])('redacts non-correlation request IDs (%s)',request_id=>{
  vi.stubEnv('JOBMATCH_HH_DIAGNOSTICS_ENABLED','true');const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  logHHRefusal(new Response(null,{status:403,headers:{'content-type':'private/secret'}}),'/resumes/mine?page=9',{request_id,errors:Array.from({length:25},()=>({type:'forbidden',value:'forbidden'}))},[]);
  const data=JSON.parse(log.mock.calls[0][0] as string);expect(data.request_id).toBe('[redacted]');expect(data.content_type).toBe('[redacted]');expect(data.operation).toBe('resume_list');expect(data.errors).toHaveLength(20);
 });
});

it('preserves the exact no_scope value, but still redacts it when it equals a credential',()=>{
 vi.stubEnv('JOBMATCH_HH_DIAGNOSTICS_ENABLED','true');const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
 const response=new Response(null,{status:403});
 logHHRefusal(response,'/resumes/mine',{errors:[{type:'oauth',value:'no_scope'}]},[]);
 expect(JSON.parse(log.mock.calls[0][0] as string).errors).toEqual([{type:'oauth',value:'no_scope'}]);
 logHHRefusal(response,'/resumes/mine',{errors:[{type:'oauth',value:'no_scope'}]},['no_scope']);
 expect(JSON.parse(log.mock.calls[1][0] as string).errors).toEqual([{type:'oauth',value:'[redacted]'}]);
});
