import {describe,it,expect,vi,afterEach} from 'vitest';
import mammoth from 'mammoth';
import {adaptResume} from '../mvp/adapt';
import {adaptWithOwnModel} from '../mvp/ai';
import {parseVacancy,safeUrl,publicIPv4,loadVacancy} from '../mvp/vacancy';
import {resumePdf} from '../mvp/pdf';
import {resumeDocx} from '../lib/resume-docx';
import {extractDocument} from '../lib/documents';
import {POST as upload} from '../app/api/mvp/import/route';
import {POST as adapt} from '../app/api/mvp/adapt/route';
import {POST as download} from '../app/api/mvp/export/route';
const vacancy={title:'Менеджер по продажам B2B',company:'Пример',url:'https://example.com/job',text:'Продажи B2B. Работа с Excel, SQL и CRM. Ведение клиентской базы.',skills:['Excel','SQL','CRM','B2B']};
const source='Анна Тестовая\nЖелаемая должность\nСпециалист\n2020–2024: Компания А\nВела продажи B2B и отчётность в Excel.\nНе работала с SQL.\nИзучаю CRM.\nОбразование: университет, 2019.';
const request=(path:string,data:unknown)=>new Request('http://localhost/api/mvp/'+path,{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify(data)});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('simple MVP',()=>{
 it('sets exact target and uses only source-supported skills without confirmations',()=>{const result=adaptResume(source,vacancy);expect(result.title).toBe(vacancy.title);expect(result.text.split('\n')[0]).toBe(vacancy.title);expect(result.matchedSkills).toEqual(['Excel','B2B']);expect(result.text).toContain('2020–2024: Компания А');expect(result.text).toContain(source);expect(result.text).toContain('Не работала с SQL.');expect(result.coverLetter).not.toContain('Не работала');expect(result.coverLetter).toContain('Вела продажи B2B и отчётность в Excel.');});
 it('does not confuse Java with JavaScript or SQL with PostgreSQL',()=>{expect(adaptResume('Работал с JavaScript и PostgreSQL в компании А.',{...vacancy,skills:['Java','SQL'],text:'Требуются Java и SQL.'}).matchedSkills).toEqual([]);});
 it('works honestly without AI configuration',async()=>{vi.stubEnv('JOBMATCH_AI_ENABLED','false');expect((await adaptWithOwnModel(source,vacancy,new AbortController().signal)).mode).toBe('automatic');});
 it('renders model choices only as exact source quotations',async()=>{vi.stubEnv('JOBMATCH_AI_ENABLED','true');vi.stubEnv('JOBMATCH_AI_SELF_HOSTED','true');vi.stubEnv('JOBMATCH_AI_ENDPOINT','https://own.example/api/chat');vi.stubEnv('JOBMATCH_AI_MODEL','own');vi.stubEnv('JOBMATCH_AI_TOKEN','test-token-sixteen-plus');vi.stubGlobal('fetch',vi.fn(async()=>Response.json({done:true,message:{content:JSON.stringify({indices:[3]})}})));const result=await adaptWithOwnModel(source,vacancy,new AbortController().signal);expect(result.mode).toBe('ai');expect(result.text).toContain(source);});
 it('rejects malformed model output without fabricating data',async()=>{vi.stubEnv('JOBMATCH_AI_ENABLED','true');vi.stubEnv('JOBMATCH_AI_SELF_HOSTED','true');vi.stubEnv('JOBMATCH_AI_ENDPOINT','https://own.example/api/chat');vi.stubEnv('JOBMATCH_AI_MODEL','own');vi.stubEnv('JOBMATCH_AI_TOKEN','test-token-sixteen-plus');vi.stubGlobal('fetch',vi.fn(async()=>Response.json({done:true,message:{content:'{"indices":[900],"text":"Ten years SQL"}'}})));await expect(adaptWithOwnModel(source,vacancy,new AbortController().signal)).rejects.toThrow('корректный ответ ИИ');});
 it('extracts JSON-LD job data without rendering upstream HTML',()=>{const html='<script type="application/ld+json">'+JSON.stringify({'@type':'JobPosting',title:vacancy.title,description:'<p>Нужен менеджер по продажам.</p><script>evil()</script>',skills:['Excel'],hiringOrganization:{name:'Пример'}})+'</script>';const result=parseVacancy(html.replace('<script>evil()</script>','<b>Excel</b>'),'https://example.com/job');expect(result.title).toBe(vacancy.title);expect(result.text).not.toContain('<');expect(result.skills).toEqual(['Excel']);});
 it('supports article pages and refuses catalog pages without an article',()=>{expect(parseVacancy('<h1>Инженер</h1><main>'+('Описание вакансии и требований. '.repeat(10))+'</main>',vacancy.url).title).toBe('Инженер');expect(()=>parseVacancy('<h1>Вакансии</h1><nav>Каталог</nav>',vacancy.url)).toThrow();});
 it('blocks private and ambiguous destinations',()=>{for(const url of ['http://example.com','https://127.0.0.1','https://[::1]','https://user:pass@example.com','https://example.com:8443','https://localhost'])expect(()=>safeUrl(url)).toThrow();for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.0.1','169.254.169.254','100.64.0.1','::1','224.0.0.1'])expect(publicIPv4(ip)).toBe(false);expect(publicIPv4('8.8.8.8')).toBe(true);});
 it('keeps HH closed without approved application access',async()=>{vi.stubEnv('JOBMATCH_HH_VACANCY_IMPORT','disabled');await expect(loadVacancy('https://hh.ru/vacancy/12345',new AbortController().signal)).rejects.toThrow('Импорт hh.ru пока не подключён');});
 it('round trips Unicode Word and PDF exports',async()=>{const text=adaptResume(source,vacancy).text;const docx=await resumeDocx(text);expect((await mammoth.extractRawText({buffer:Buffer.from(docx)})).value).toContain(vacancy.title);const pdf=await resumePdf(text);expect(Buffer.from(pdf).subarray(0,5).toString()).toBe('%PDF-');expect(await extractDocument('resume.pdf',Buffer.from(pdf))).toContain(vacancy.title);});
 it('imports DOCX through real bounded route',async()=>{const bytes=await resumeDocx(source);const response=await upload(new Request('http://localhost/api/mvp/import',{method:'POST',headers:{'x-filename':encodeURIComponent('Резюме.docx')},body:new Uint8Array(bytes)}));expect(response.status).toBe(200);expect((await response.json()).text).toContain('Анна Тестовая');expect(response.headers.get('cache-control')).toContain('no-store');});
 it('rejects legacy DOC and oversized uploads',async()=>{const bad=await upload(new Request('http://localhost/api/mvp/import',{method:'POST',headers:{'x-filename':'resume.doc'},body:'bad'}));expect(bad.status).toBe(400);const large=await upload(new Request('http://localhost/api/mvp/import',{method:'POST',headers:{'x-filename':'resume.pdf','content-length':'4000001'},body:'bad'}));expect(large.status).toBe(413);});
 it('adapts and exports without DB, authentication or confirmation payloads',async()=>{vi.stubEnv('JOBMATCH_AI_ENABLED','false');const response=await adapt(request('adapt',{resume:source,vacancy}));expect(response.status).toBe(200);const data=await response.json();for(const format of ['docx','pdf']){const file=await download(request('export',{text:data.text,title:data.title,format}));expect(file.status).toBe(200);expect(file.headers.get('content-disposition')).toContain('.'+format);}});
 it('rejects cross-site writes and invalid payloads',async()=>{const cross=await adapt(new Request('http://localhost/api/mvp/adapt',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'}));expect(cross.status).toBe(403);expect((await adapt(request('adapt',{}))).status).toBe(400);});
});

describe('MVP response boundary',()=>{
 it('preserves original resume whitespace and accepts actual automatic results',async()=>{
  const {responseJson,ImportedResumeSchema,AdaptedResumeSchema}=await import('../mvp/responses');
  const text='  '+source+'\n';
  expect(await responseJson(Response.json({text,filename:'resume.docx'}),ImportedResumeSchema)).toEqual({text,filename:'resume.docx'});
  const result=adaptResume(source,vacancy);
  expect(await responseJson(Response.json(result),AdaptedResumeSchema)).toEqual(result);
 });
 it('rejects malformed successful responses rather than enabling the next action',async()=>{
  const {responseJson,ImportedResumeSchema,VacancySchema,AdaptedResumeSchema}=await import('../mvp/responses');
  for(const body of [null,{},[],{text:source},{text:'short',filename:'a.docx'},{text:123,filename:'a.docx'}])await expect(responseJson(Response.json(body),ImportedResumeSchema)).rejects.toThrow('Повторите действие');
  await expect(responseJson(new Response('<html>Error</html>'),ImportedResumeSchema)).rejects.toThrow('Повторите действие');
  await expect(responseJson(Response.json({...vacancy,title:null}),VacancySchema)).rejects.toThrow();
  await expect(responseJson(Response.json({...adaptResume(source,vacancy),mode:'success'}),AdaptedResumeSchema)).rejects.toThrow();
 });
 it('keeps useful API errors but refuses non-string or oversized error bodies',async()=>{
  const {responseJson,ImportedResumeSchema}=await import('../mvp/responses');
  await expect(responseJson(Response.json({error:'Сервис занят.'},{status:429}),ImportedResumeSchema)).rejects.toThrow('Сервис занят.');
  await expect(responseJson(Response.json({error:{detail:'private'}},{status:500}),ImportedResumeSchema)).rejects.toThrow('Не удалось выполнить запрос');
 });
 it('rejects too-short documents at import, before adaptation',async()=>{
  const data=await resumeDocx('Краткий текст');
  const response=await upload(new Request('https://app.test/api/mvp/import',{method:'POST',headers:{'x-filename':'short.docx','x-forwarded-for':'short-document-regression'},body:new Uint8Array(data)}));
  expect(response.status).toBe(422);expect(await response.json()).toEqual({error:'В файле слишком мало текста для адаптации. Загрузите полное резюме.'});
 });
});


describe('resume evidence appears once',()=>{
 const original='Синтетический кандидат\r\n\r\n2020–2022: Компания А\r\n  Работал инженером Python.  \r\n2022–2024: Компания Б\r\nРаботал инженером Python.\r\nРазрабатывал SQL отчёты.\r\nНе работал с Kubernetes.\r\nОбразование: университет.';
 const role={title:'Python Engineer',company:'Тест',url:'https://example.com/job',text:'Python и SQL, Kubernetes.',skills:['Python','SQL','Kubernetes']};
 it('preserves every source occurrence and context without adding another summary',()=>{
  const result=adaptResume(original,role);
  expect(result.text).toBe(role.title+'\n\n'+original);
  expect(result.text.split('Работал инженером Python.')).toHaveLength(3);
  expect(result.matchedSkills).toEqual(['Python','SQL']);
  expect(result.coverLetter).toContain('Работал инженером Python.');
  expect(result.coverLetter).not.toContain('Kubernetes');
 });
 it('keeps original context even when the model reorders or repeats selected indices',async()=>{
  vi.stubEnv('JOBMATCH_AI_ENABLED','true');vi.stubEnv('JOBMATCH_AI_SELF_HOSTED','true');
  vi.stubEnv('JOBMATCH_AI_PROVIDER','ollama');vi.stubEnv('JOBMATCH_AI_ENDPOINT','https://own.example/api/chat');
  vi.stubEnv('JOBMATCH_AI_MODEL','own');vi.stubEnv('JOBMATCH_AI_TOKEN','test-token-sixteen-plus');
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({done:true,message:{content:JSON.stringify({indices:[5,2,2,6]})}})));
  const result=await adaptWithOwnModel(original,role,new AbortController().signal);
  expect(result.mode).toBe('ai');expect(result.text).toBe(role.title+'\n\n'+original);
  expect(result.coverLetter).toContain('Разрабатывал SQL отчёты.');expect(result.coverLetter).not.toContain('Kubernetes');
 });
});


describe('context-preserving body adaptation',()=>{
 const role={...vacancy,title:'Python Engineer',text:'Python development and SQL reports.',skills:['Python','SQL']};
 const original='Синтетический кандидат\n\nКомпания А, 2020–2022\n• Готовил презентации клиентам.\n• Разрабатывал отчёты на Python.\n• Вёл архив документов.\n\nКомпания Б, 2022–2024\n• Координировал встречи команды.\n• Готовил SQL отчёты.\n\nОбразование: университет.';
 it('prioritizes exact evidence within each employer, keeping all claims once',()=>{
  const result=adaptResume(original,role);
  expect(result.text).toContain('Компания А, 2020–2022\n• Разрабатывал отчёты на Python.\n• Готовил презентации клиентам.\n• Вёл архив документов.');
  expect(result.text).toContain('Компания Б, 2022–2024\n• Готовил SQL отчёты.\n• Координировал встречи команды.');
  expect(result.text.split('\n').slice(2).sort()).toEqual(original.split('\n').sort());
  expect(result.adaptationNote).toContain('внутри 2 списков');
 });
 it('does not reorder nested bullets or detach continuation text',async()=>{
  const {prioritizeEvidence}=await import('../mvp/evidence');
  for(const source of ['• Первый пункт.\n  • Работа с Python.\n\nДата', '• Первый пункт.\n• Работа с Python.\nПродолжение с ограничениями.']){
   expect(prioritizeEvidence(source,['• Работа с Python.']).text).toBe(source);
  }
 });
 it('keeps CRLF and repeated facts at separate employers',async()=>{
  const {prioritizeEvidence}=await import('../mvp/evidence');
  const group='• Вёл документацию.\r\n• Работал с Python.';
  const source='Компания А\r\n'+group+'\r\n\r\nКомпания Б\r\n'+group;
  const result=prioritizeEvidence(source,['• Работал с Python.']);
  expect(result.reorderedGroups).toBe(2);
  expect(result.text.split('\r\n').sort()).toEqual(source.split('\r\n').sort());
 });
 it('uses the model selection for body prioritization, not automatic skill matches',async()=>{
  vi.stubEnv('JOBMATCH_AI_ENABLED','true');vi.stubEnv('JOBMATCH_AI_PROVIDER','ollama');vi.stubEnv('JOBMATCH_AI_SELF_HOSTED','true');
  vi.stubEnv('JOBMATCH_AI_ENDPOINT','https://own.example/api/chat');vi.stubEnv('JOBMATCH_AI_MODEL','own');vi.stubEnv('JOBMATCH_AI_TOKEN','test-token-sixteen-plus');
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({done:true,message:{content:'{"indices":[4]}'}})));
  const result=await adaptWithOwnModel(original,role,new AbortController().signal);
  expect(result.text).toContain('Компания А, 2020–2022\n• Вёл архив документов.\n• Готовил презентации клиентам.\n• Разрабатывал отчёты на Python.');
  expect(result.text.split('\n').slice(2).sort()).toEqual(original.split('\n').sort());
 });
});
