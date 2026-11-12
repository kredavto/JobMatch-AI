import {afterEach,describe,expect,it,vi} from 'vitest';
import {POST} from '../app/api/mvp/adapt/route';
import {GET} from '../app/api/mvp/capabilities/route';
const resume='Синтетический кандидат. Разрабатывал API на Python и писал тесты.';
const vacancy={title:'Разработчик Python',company:'Синтетический пример',url:'https://hh.ru/vacancy/123',text:'Требуется опыт разработки API на Python.',skills:['Python']};
const request=(body:unknown)=>new Request('https://app.test/api/mvp/adapt',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify(body)});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe.each(['groq','vercel-gateway','ollama'])('public adaptation is local only with configured %s',provider=>{
 const enable=()=>{
  vi.stubEnv('JOBMATCH_AI_ENABLED','true');vi.stubEnv('JOBMATCH_AI_PROVIDER',provider);vi.stubEnv('JOBMATCH_AI_GROQ_APPROVED','true');vi.stubEnv('JOBMATCH_AI_GATEWAY_APPROVED','true');vi.stubEnv('JOBMATCH_AI_SELF_HOSTED','true');vi.stubEnv('GROQ_API_KEY','synthetic-key');vi.stubEnv('AI_GATEWAY_API_KEY','synthetic-key');vi.stubEnv('JOBMATCH_AI_ENDPOINT','https://example.com/api/chat');vi.stubEnv('JOBMATCH_AI_MODEL','synthetic-model');vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('No network allowed');}));
 };
 it.each(['https://hh.ru/vacancy/123','https://example.com/tampered','https://example.com/unmarked'])('never sends text for client URL %s',async url=>{
  enable();const response=await POST(request({resume,vacancy:{...vacancy,url}}));expect(response.status).toBe(200);const body=await response.json();expect(body.mode).toBe('automatic');expect(body.text).toContain(resume);expect(body.adaptationNote).toContain('Внешний ИИ отключён');expect(body.matchedSkills).toContain('Python');expect(fetch).not.toHaveBeenCalled();
 });
 it.each([{source:'manual'},{consent:true},{allowExternalAi:true},{source:'synthetic',approved:true}])('cannot bypass through extra flags %j',async flags=>{
  enable();expect((await POST(request({resume,vacancy,...flags}))).status).toBe(400);expect(fetch).not.toHaveBeenCalled();
 });
 it('cannot bypass with a nested source label',async()=>{enable();expect((await POST(request({resume,vacancy:{...vacancy,source:'manual'}}))).status).toBe(400);expect(fetch).not.toHaveBeenCalled();});
 it('reports the public policy rather than provider readiness without network',async()=>{
  enable();const response=await GET();expect(await response.json()).toMatchObject({ai:{state:'local_only',mode:'automatic',reason:'unverified_data_provenance'}});expect(response.headers.get('cache-control')).toContain('no-store');expect(fetch).not.toHaveBeenCalled();
 });
});
