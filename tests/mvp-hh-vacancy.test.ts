import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {startHH,callbackHH} from '../mvp/hh';
import {POST} from '../app/api/mvp/vacancy/route';
const origin='https://preview.example',access='synthetic-applicant-token';
let cookie='',ip=0;
const vacancy={id:'12345',name:'Engineer',description:'<p>Develop applications using TypeScript and maintain automated tests.</p>',archived:false,employer:{name:'Example'},key_skills:[{name:'TypeScript'}],private_contact:'do-not-return'};
function cookies(response:Response){return response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');}
function request(session=cookie,site:string|null=origin,url='https://hh.ru/vacancy/12345'){
 return new Request(origin+'/api/mvp/vacancy',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':String(++ip),...(site?{origin:site}:{}),cookie:session},body:JSON.stringify({url})});
}
beforeEach(async()=>{
 vi.stubEnv('JOBMATCH_HH_OAUTH_ENABLED','true');vi.stubEnv('HH_CLIENT_ID','synthetic-id');vi.stubEnv('HH_CLIENT_SECRET','synthetic-secret');vi.stubEnv('HH_SESSION_KEY','a'.repeat(64));vi.stubEnv('HH_USER_AGENT','SyntheticTest/1.0 (test@example.com)');vi.stubEnv('HH_APP_ORIGIN',origin);
 // No legacy application token/enablement is needed or used.
 vi.stubEnv('JOBMATCH_HH_VACANCY_IMPORT','disabled');vi.stubEnv('HH_APP_ACCESS_TOKEN','');
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  if(url.endsWith('/token'))return Response.json({access_token:access,expires_in:3600,token_type:'bearer'});
  if(url.endsWith('/me'))return Response.json({auth_type:'applicant'});
  if(url==='https://api.hh.ru/vacancies/12345')return Response.json(vacancy);
  throw Error('Unexpected endpoint');
 }));
 const start=await startHH(new Request(origin+'/api/mvp/hh/start',{method:'POST',headers:{origin}})),url=new URL((await start.json()).url);
 const callback=await callbackHH(new Request(origin+'/api/mvp/hh/callback?state='+url.searchParams.get('state')+'&code=synthetic-code',{headers:{cookie:cookies(start)}}));
 cookie=cookies(callback);expect(callback.headers.get('location')).toContain('hh=connected');vi.mocked(fetch).mockClear();
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('main vacancy route with applicant HH session (mock transport only)',()=>{
 it('imports via the official API with the encrypted session, not a separate application token',async()=>{
  const response=await POST(request(cookie,origin,'https://spb.hh.ru/vacancy/12345?tracking=1'));
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');
  const data=await response.json();expect(data).toEqual({title:'Engineer',company:'Example',url:'https://hh.ru/vacancy/12345',text:'Develop applications using TypeScript and maintain automated tests.',skills:['TypeScript']});
  expect(JSON.stringify(data)).not.toContain(access);expect(JSON.stringify(data)).not.toContain('do-not-return');
  expect(vi.mocked(fetch).mock.calls.map(([url])=>url)).toEqual(['https://api.hh.ru/me','https://api.hh.ru/vacancies/12345']);
  for(const [,options] of vi.mocked(fetch).mock.calls)expect(options).toMatchObject({method:'GET',redirect:'error',cache:'no-store',headers:{Authorization:'Bearer '+access}});
 });
 it('rejects absent, tampered and expired sessions before transport',async()=>{
  for(const value of ['',cookie.replace(/session=./,'session=x')])expect((await POST(request(value))).status).toBe(401);
  vi.spyOn(Date,'now').mockReturnValue(Date.now()+3601000);expect((await POST(request())).status).toBe(401);expect(fetch).not.toHaveBeenCalled();
 });
 it('requires the configured origin, including on requests without Origin',async()=>{
  for(const site of [null,'https://attacker.example'])expect((await POST(request(cookie,site))).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
 });
 it('rejects employer identity and revoked access before reading the vacancy',async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'employer'}));expect((await POST(request())).status).toBe(403);
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({error:access},{status:401}));const response=await POST(request());expect(response.status).toBe(401);expect(await response.text()).not.toContain(access);
  expect(vi.mocked(fetch).mock.calls.every(([url])=>String(url).endsWith('/me'))).toBe(true);
 });
 it.each([{...vacancy,id:'999'},{...vacancy,archived:undefined},{...vacancy,description:42}])('rejects mismatched or malformed vacancy data',async value=>{
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant'})).mockResolvedValueOnce(Response.json(value));
  expect((await POST(request())).status).toBe(502);
 });
 it('rejects archived and missing vacancies',async()=>{
  for(const [upstream,status] of [[Response.json({...vacancy,archived:true}),410],[new Response(null,{status:404}),404]] as const){
   vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant'})).mockResolvedValueOnce(upstream);expect((await POST(request())).status).toBe(status);
  }
 });
 it('rejects redirect responses and fetch redirect errors without following them',async()=>{
  for(const value of [new Response(null,{status:302,headers:{location:'https://attacker.example'}}),new TypeError('redirect blocked '+access)]){
   vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant'}));
   if(value instanceof Error)vi.mocked(fetch).mockRejectedValueOnce(value);else vi.mocked(fetch).mockResolvedValueOnce(value);
   const response=await POST(request());expect(response.status).toBe(502);expect(await response.text()).not.toContain(access);
  }
  expect(vi.mocked(fetch).mock.calls.every(([url])=>String(url).startsWith('https://api.hh.ru/'))).toBe(true);
 });
 it('bounds declared and streamed HH response bodies at 256000 bytes',async()=>{
  for(const response of [new Response('{}',{headers:{'content-length':'256001'}}),new Response('x'.repeat(256001))]){
   vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant'})).mockResolvedValueOnce(response);expect((await POST(request())).status).toBe(413);
  }
 });
 it('rejects malformed JSON and invalid HH paths without leaking provider contents',async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant'})).mockResolvedValueOnce(new Response(access));
  const response=await POST(request());expect(response.status).toBe(502);expect(await response.text()).not.toContain(access);
  vi.mocked(fetch).mockClear();expect((await POST(request(cookie,origin,'https://hh.ru/search/vacancy'))).status).toBe(400);expect(fetch).not.toHaveBeenCalled();
 });
});

it('identifies the vacancy-read step on forbidden access without exposing identifiers',async()=>{
 vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant'})).mockResolvedValueOnce(Response.json({errors:[{type:'forbidden',value:'private-detail'}]},{status:403}));
 const response=await POST(request());expect(response.status).toBe(403);const body=await response.text();
 expect(body).toContain('чтение вакансии');expect(body).not.toContain('12345');expect(body).not.toContain('private-detail');expect(fetch).toHaveBeenCalledTimes(2);
});
