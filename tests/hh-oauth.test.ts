import {createHash} from 'node:crypto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {startHH,callbackHH,hhSession,listHHResumes,selectHHResume,logoutHH,readHHVacancy} from '../mvp/hh';
import {GET as resumeListRoute} from '../app/api/mvp/hh/resumes/route';
const origin='https://preview.example',access='synthetic-access-token';
function request(path:string,method='GET',cookie?:string,site=origin){return new Request(origin+'/api/mvp/hh/'+path,{method,headers:{...(method==='POST'?{origin:site}:{}),...(cookie?{cookie}:{})}});}
function cookies(response:Response){return response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');}
async function login(){const start=await startHH(request('start','POST')),url=new URL((await start.json()).url);const response=await callbackHH(request('callback?state='+url.searchParams.get('state')+'&code=synthetic-code','GET',cookies(start)));return {response,cookie:cookies(response),url,start};}
beforeEach(()=>{
 vi.stubEnv('JOBMATCH_HH_OAUTH_ENABLED','true');vi.stubEnv('HH_CLIENT_ID','synthetic-id');vi.stubEnv('HH_CLIENT_SECRET','synthetic-secret');vi.stubEnv('HH_SESSION_KEY','a'.repeat(64));vi.stubEnv('HH_USER_AGENT','SyntheticTest/1.0 (test@example.com)');vi.stubEnv('HH_APP_ORIGIN',origin);
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
 if(url==='https://api.hh.ru/token')return Response.json({access_token:access,expires_in:7200,token_type:'bearer',refresh_token:'unused-refresh'});
 if(url==='https://api.hh.ru/me')return Response.json({auth_type:'applicant',is_applicant:true});
 if(url==='https://api.hh.ru/resumes/mine')return Response.json({items:[{id:'own-1',title:'Python Engineer'}]});
 if(url==='https://api.hh.ru/resumes/own-1')return Response.json({id:'own-1',title:'Python Engineer',first_name:'Private name',contact:[{value:'private@example.com'}],birth_date:'1990-01-01',salary:{amount:12345},skills:'Работа с Python.',skill_set:['Python'],experience:[{company:'Тест',position:'Инженер',start:'2020-01-01',end:'2024-01-01',description:'Разрабатывал отчёты.'}],education:{primary:[{name:'Тестовый вуз',year:2019}]}});
 throw Error('Unexpected endpoint');
 }));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('HH OAuth and own resumes (synthetic mocked transport)',()=>{
 it('fails closed without approved enablement or configured key',async()=>{vi.stubEnv('JOBMATCH_HH_OAUTH_ENABLED','false');expect(await hhSession(request('session'))).toEqual({configured:false,authenticated:false});await expect(startHH(request('start','POST'))).rejects.toMatchObject({status:503});expect(fetch).not.toHaveBeenCalled();});
 it('rejects cross-site and missing-Origin starts',async()=>{await expect(startHH(request('start','POST',undefined,'https://attacker.example'))).rejects.toMatchObject({status:403});await expect(startHH(request('start'))).rejects.toMatchObject({status:403});expect(fetch).not.toHaveBeenCalled();});
 it('uses official OAuth with fresh state, S256 PKCE and secure short cookies',async()=>{const response=await startHH(request('start','POST')),url=new URL((await response.json()).url);expect(url.origin).toBe('https://hh.ru');expect(url.pathname).toBe('/oauth/authorize');expect(url.searchParams.get('redirect_uri')).toBe(origin+'/api/mvp/hh/callback');expect(url.searchParams.get('code_challenge_method')).toBe('S256');expect(url.searchParams.get('state')).toHaveLength(43);expect(response.headers.get('set-cookie')).toMatch(/HttpOnly; Secure; SameSite=Lax; Max-Age=600/);expect(response.headers.get('set-cookie')).not.toContain('synthetic-secret');expect(fetch).not.toHaveBeenCalled();});
 it('rejects missing/mismatched/expired state before any token exchange',async()=>{const start=await startHH(request('start','POST'));for(const cookie of [undefined,cookies(start)]){const response=await callbackHH(request('callback?code=x&state=wrong','GET',cookie));expect(response.headers.get('location')).toBe(origin+'/?hh=failed');}expect(fetch).not.toHaveBeenCalled();});
 it('exchanges code server-side, checks applicant, never exposes tokens',async()=>{const {response,cookie,url:authorizationUrl}=await login();expect(response.status).toBe(303);expect(response.headers.get('location')).toBe(origin+'/?hh=connected');expect(cookie).not.toContain(access);expect(cookie).not.toContain('unused-refresh');expect(response.headers.get('set-cookie')).toContain('Max-Age=3600');expect(await hhSession(request('session','GET',cookie))).toEqual({configured:true,authenticated:true});
 const [url,init]=vi.mocked(fetch).mock.calls[0];expect(url).toBe('https://api.hh.ru/token');expect(init).toMatchObject({method:'POST',redirect:'error',cache:'no-store'});const body=new URLSearchParams(init?.body as string);expect(body.get('code_verifier')).toHaveLength(43);expect(createHash('sha256').update(body.get('code_verifier')!).digest('base64url')).toBe(authorizationUrl.searchParams.get('code_challenge'));expect(body.get('redirect_uri')).toBe(origin+'/api/mvp/hh/callback');expect(body.get('client_secret')).toBe('synthetic-secret');});
 it('does not grant a session to an employer or after revoked token',async()=>{vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/token')?Response.json({access_token:access,expires_in:3600,token_type:'bearer'}):Response.json({auth_type:'employer'})));const {response}=await login();expect(response.headers.get('location')).toContain('hh=failed');expect(response.headers.get('set-cookie')).not.toContain('__Host-jm-hh-session=');});
 it('lists and imports only own resume and excludes personal fields',async()=>{const {cookie}=await login();expect(await listHHResumes(request('resumes','GET',cookie))).toEqual({items:[{id:'own-1',title:'Python Engineer'}]});const selected=await selectHHResume(request('select','POST',cookie),'own-1');expect(selected.text).toContain('Тест\nИнженер\n2020-01-01 — 2024-01-01\nРазрабатывал отчёты.');expect(selected.text).toContain('Тестовый вуз');for(const excluded of ['private@example.com','Private name','1990-01-01','12345'])expect(selected.text).not.toContain(excluded);});
 it('rejects arbitrary resume IDs before fetching their contents',async()=>{const {cookie}=await login();vi.mocked(fetch).mockClear();await expect(selectHHResume(request('select','POST',cookie),'someone-else')).rejects.toMatchObject({status:403});expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('someone-else'))).toBe(false);await expect(selectHHResume(request('select','POST',cookie),'../me')).rejects.toThrow();});
 it('rejects tampered/expired cookies and invalidates the local session on logout',async()=>{const {cookie}=await login();expect(await hhSession(request('session','GET',cookie.replace(/session=./,'session=x')))).toEqual({configured:true,authenticated:false});const logout=logoutHH(request('logout','POST',cookie));expect(logout.headers.getSetCookie()).toHaveLength(2);expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');await expect(selectHHResume(request('select','POST'),'own-1')).rejects.toMatchObject({status:401});});
 it('expires state and access sessions without refreshing tokens',async()=>{
 const {cookie}=await login(),start=await startHH(request('start','POST')),url=new URL((await start.json()).url);
 const now=Date.now();vi.spyOn(Date,'now').mockReturnValue(now+3601000);vi.mocked(fetch).mockClear();
 expect(await hhSession(request('session','GET',cookie))).toEqual({configured:true,authenticated:false});
 const denied=await callbackHH(request('callback?state='+url.searchParams.get('state')+'&code=old','GET',cookies(start)));
 expect(denied.headers.get('location')).toContain('hh=failed');expect(fetch).not.toHaveBeenCalled();
 });
 it('does not make HH writes or retain a refresh token',async()=>{const {cookie}=await login();await selectHHResume(request('select','POST',cookie),'own-1');for(const [url,init] of vi.mocked(fetch).mock.calls){expect(String(url)).toMatch(/^https:\/\/api\.hh\.ru\/(token|me|resumes)/);expect(init?.method).toBe(String(url).endsWith('/token')?'POST':'GET');expect(init?.redirect).toBe('error');}});
 it('does not follow untrusted URLs or echo provider errors',async()=>{const {cookie}=await login();vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:'synthetic-secret'},{status:500})));await expect(listHHResumes(request('resumes','GET',cookie))).rejects.toThrow('hh.ru временно недоступен');});
});

describe('HH access refusal diagnostics (synthetic only)',()=>{
 it.each([401,403])('preserves HTTP %s on a refused resume list without retrying',async status=>{
  const {cookie}=await login();vi.mocked(fetch).mockClear();
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant'})).mockResolvedValueOnce(Response.json({errors:[{type:'forbidden',value:'secret-provider-details'}],request_id:'private-id',access_token:access},{status}));
  const response=await resumeListRoute(request('resumes','GET',cookie));
  expect(response.status).toBe(status);
  const body=await response.text();expect(body).toContain(status===401?'истекла или отозвана':'отказал в доступе (список резюме)');
  for(const secret of [access,'private-id','secret-provider-details'])expect(body).not.toContain(secret);
  expect(vi.mocked(fetch).mock.calls.map(([url])=>url)).toEqual(['https://api.hh.ru/me','https://api.hh.ru/resumes/mine']);
 });
 it('classifies only a known CAPTCHA marker without forwarding its URL or other data',async()=>{
  const {cookie}=await login();vi.mocked(fetch).mockClear();
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant'})).mockResolvedValueOnce(Response.json({errors:[{type:'captcha_required',value:'captcha_required',captcha_url:'https://private.example/secret'}]},{status:403}));
  const response=await resumeListRoute(request('resumes','GET',cookie));expect(response.status).toBe(403);
  const body=await response.text();expect(body).toContain('требуется CAPTCHA');expect(body).not.toContain('private.example');expect(fetch).toHaveBeenCalledTimes(2);
 });
 it.each([new Response('not-json',{status:403}),new Response('x'.repeat(16001),{status:403}),Response.json({errors:[{type:'unrecognized-secret',value:'captcha_required-secret'}]},{status:403})])('keeps unreadable, oversized and unknown refusals generic',async response=>{
  const {cookie}=await login();vi.mocked(fetch).mockClear();
  vi.mocked(fetch).mockResolvedValueOnce(response);
  await expect(listHHResumes(request('resumes','GET',cookie))).rejects.toMatchObject({status:403,message:expect.stringContaining('отказал в доступе')});expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('does not misreport a 403 identity check as a logged-out session',async()=>{
  const {cookie}=await login();vi.mocked(fetch).mockClear();vi.mocked(fetch).mockResolvedValueOnce(Response.json({errors:[{type:'forbidden'}]},{status:403}));
  await expect(hhSession(request('session','GET',cookie))).rejects.toMatchObject({status:403,message:expect.stringContaining('проверка аккаунта')});expect(fetch).toHaveBeenCalledTimes(1);
 });
});

describe('HH diagnostic transport isolation',()=>{
 it('uses exactly the same session Bearer for identity, resume list and vacancy reads',async()=>{
  const {cookie}=await login();vi.mocked(fetch).mockClear();
  await listHHResumes(request('resumes','GET',cookie));
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant'})).mockResolvedValueOnce(Response.json({id:'12345'}));
  await readHHVacancy(request('vacancy','POST',cookie),'12345');
  expect(vi.mocked(fetch).mock.calls.map(([url])=>url)).toEqual(['https://api.hh.ru/me','https://api.hh.ru/resumes/mine','https://api.hh.ru/me','https://api.hh.ru/vacancies/12345']);
  for(const [,options] of vi.mocked(fetch).mock.calls)expect(new Headers(options?.headers).get('authorization')).toBe('Bearer '+access);
 });
 it('logs only failed calls when opted in and keeps diagnostics out of the public response',async()=>{
  vi.stubEnv('JOBMATCH_HH_DIAGNOSTICS_ENABLED','true');const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const {cookie}=await login();expect(log).not.toHaveBeenCalled();vi.mocked(fetch).mockClear();
  const id='01234567-89ab-cdef-0123-456789abcdef';
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({auth_type:'applicant',private:'DO_NOT_LOG_ME'})).mockResolvedValueOnce(Response.json({request_id:id,errors:[{type:'oauth',value:'bad_authorization',captcha_url:'https://secret.example'}],access_token:access},{status:403,headers:{'content-type':'application/json; secret='+access}}));
  const response=await resumeListRoute(request('resumes','GET',cookie)),body=await response.text();
  expect(response.status).toBe(403);expect(log).toHaveBeenCalledTimes(1);const line=log.mock.calls[0][0] as string,data=JSON.parse(line);
  expect(data).toMatchObject({status:403,operation:'resume_list',request_id:id,content_type:'application/json',errors:[{type:'oauth',value:'bad_authorization'}]});
  for(const forbidden of [access,cookie,'DO_NOT_LOG_ME','https://secret.example'])expect(line).not.toContain(forbidden);
  for(const forbidden of [id,'bad_authorization','request_id','time_utc','resume_list'])expect(body).not.toContain(forbidden);
  expect(fetch).toHaveBeenCalledTimes(2);
 });
});
