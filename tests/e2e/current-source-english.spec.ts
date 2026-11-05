import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {fork,type ChildProcess} from 'node:child_process';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {sourceOwner as ownerId,sourceVersionProfile,sourcePreviewFor,sourceVersionFor,sourceVersionListFor} from '../source-version-fixture';
import {TEMPLATE_VERSION as RU,ENGLISH_TEMPLATE_VERSION as EN,SourceTemplateSchema,sourceCollectionHash,type SourceVersion,type VersionList} from '../../lib/source-version';
let child:ChildProcess,origin:string;
test.describe.configure({timeout:60000});
test.beforeAll(async()=>{
 const env:NodeJS.ProcessEnv={NODE_ENV:'test',JOBMATCH_LOCAL_SOURCE_LOCALES:'1'};
 for(const key of ['PATH','TMPDIR','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy'])if(process.env[key])env[key]=process.env[key];
 child=fork(resolve(__dirname,'../fixtures/source-locale-server.mjs'),[],{execArgv:[],env,stdio:['ignore','ignore','ignore','ipc']});
 origin=await new Promise<string>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Owned auth fixture startup timed out'));},20000);child.once('error',()=>{clearTimeout(timer);fail(Error('Owned auth fixture failed'));});child.once('exit',()=>{clearTimeout(timer);fail(Error('Owned auth fixture exited'));});child.once('message',value=>{clearTimeout(timer);const port=(value as {port?:unknown})?.port;if(!Number.isInteger(port)||Number(port)<1024||Number(port)>65535){child.kill();fail(Error('Owned auth fixture refused'));return;}done('http://127.0.0.1:'+port);});});
});
test.afterAll(async()=>{if(!child||child.exitCode!==null)return;await new Promise<void>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Owned auth fixture cleanup timed out'));},15000);child.once('exit',code=>{clearTimeout(timer);if(code===0)done();else fail(Error('Owned auth fixture cleanup failed'));});child.send('close');});});
type Options={hold?:'preview'|'save';fault?:'alter'|'lost'|'wrong-template';unavailable?:boolean};
async function setup(page:Page,options:Options={}){
 const profile=sourceVersionProfile(),old=await sourceVersionFor(),records:SourceVersion[]=[old],writes:Record<string,unknown>[]=[],workspaceWrites:unknown[]=[];
 let release!:()=>void,reads=0;const held=new Promise<void>(done=>{release=done;});
 async function history():Promise<VersionList>{const data={...await sourceVersionListFor(old),versions:await Promise.all(records.map(async row=>(await sourceVersionListFor(row)).versions[0]))};return {...data,collection_hash:await sourceCollectionHash(data)};}
 await page.route('**/api/**',r=>r.abort());
 await page.route('**/api/service',r=>{if(r.request().method()==='POST')workspaceWrites.push(r.request().postDataJSON());return r.fulfill({json:{ownerId,revision:4,original:profile.source_original,goal:'Analyst',vacancy:'SQL role',facts:[{id:'f1',text:'SQL',source:'original',verified:false}],versions:[],applications:[]}});});
 await page.route('**/api/source-profile',r=>r.fulfill({json:{profile,storageAvailable:true}}));
 await page.route('**/api/source-versions*',async r=>{
  expect(r.request().headers()['x-jobmatch-owner']).toBe(ownerId);
  if(r.request().method()==='GET'){reads++;const id=new URL(r.request().url()).searchParams.get('id');return r.fulfill({json:id?records.find(v=>v.id===id):{history:await history(),storageAvailable:true}});}
  const b=r.request().postDataJSON();writes.push(b);expect(b.expectedOwnerId).toBe(ownerId);
  if(b.action==='clear'){records.length=0;return r.fulfill({json:await history()});}
  expect(b.workspaceRevision).toBe(4);expect(b.profileRevision).toBe(2);expect(b.entryIds).toEqual([profile.entries[0].id]);
  expect(Object.keys(b).sort()).toEqual(['action','expectedOwnerId','workspaceRevision','profileRevision','entryIds',...(b.templateVersion===undefined?[]:['templateVersion']),...(b.action==='save'?['previewHash','accept','consentToStore']:[])].sort());
  const template=b.templateVersion===undefined?RU:SourceTemplateSchema.parse(b.templateVersion),preview=await sourcePreviewFor(profile,template);
  if(b.action===options.hold)await held;
  if(options.unavailable)return r.fulfill({status:503,json:{error:'PRIVATE_UPSTREAM'}});
  if(b.action==='preview')return r.fulfill({json:preview});
  expect(b.action).toBe('save');expect(b.previewHash).toBe(preview.preview_hash);expect(b.accept).toBe('SAVE_LITERAL_SOURCE_VERSION');expect(b.consentToStore).toBe(true);
  const saved={...old,...preview,id:'77777777-7777-4777-8777-777777777777',created:'2026-11-05T13:00:00.000Z'};records.push(saved);
  if(options.fault==='lost')return r.abort('failed');
  return r.fulfill({json:options.fault==='alter'?{...saved,text:'PRIVATE_FALSE_ACK'}:options.fault==='wrong-template'?{...saved,...await sourcePreviewFor(profile,RU)}:saved});
 });
 await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 return{panel:page.getByRole('region',{name:'Дословные структурированные версии',exact:true}),profile,records,writes,workspaceWrites,release:()=>release(),reads:()=>reads};
}
const select=(page:Page)=>page.getByRole('combobox',{name:/Язык подписей новой структурированной версии|Heading language for a new structured version/});
async function prepare(page:Page){const p=page.getByRole('region',{name:'Дословные структурированные версии',exact:true});await p.getByRole('button',{name:'Прочитать историю структурированных версий',exact:true}).click();await p.getByRole('button',{name:'Прочитать структуру для версии',exact:true}).click();await p.getByRole('checkbox',{name:'Использовать запись 1: Работа',exact:true}).check();await p.getByRole('button',{name:'Получить дословный предпросмотр',exact:true}).click();}
async function save(page:Page){const p=page.getByRole('region',{name:'Дословные структурированные версии',exact:true});await p.getByRole('checkbox',{name:/Я проверил\(а\) показанные текст и диапазоны/}).check();await p.getByRole('button',{name:'Сохранить показанную структурированную версию',exact:true}).click();}
test('explicit English choice sends no hidden request, preserves quotes, and survives interface language change',async({page})=>{
 const s=await setup(page);expect(s.writes).toEqual([]);await select(page).selectOption(EN);expect(s.writes).toEqual([]);await prepare(page);
 const article=s.panel.getByRole('article',{name:'Предпросмотр структурированной версии',exact:true});await expect(article).toContainText('Structured information');await expect(article).toContainText('Title: SQL');
 const text=await article.locator(':scope > pre').textContent();await page.getByLabel('Fixture language',{exact:true}).selectOption('en');await expect(select(page)).toHaveValue(EN);expect(await page.getByRole('article',{name:'Structured version preview',exact:true}).locator(':scope > pre').textContent()).toBe(text);
 expect(s.writes).toHaveLength(1);expect(s.writes[0].templateVersion).toBe(EN);expect(s.workspaceWrites).toEqual([]);
});
test('new English save preserves Russian history and exports exact saved TXT and source JSON',async({page})=>{
 const s=await setup(page),old=structuredClone(s.records[0]);await select(page).selectOption(EN);await prepare(page);await save(page);
 const article=s.panel.getByRole('article',{name:'Сохранённая структурированная версия',exact:true});await expect(article).toBeVisible();expect(s.records[0]).toEqual(old);expect(s.records[1].template_version).toBe(EN);
 for(const [button,format] of [['Скачать структурированную версию TXT','txt'],['Скачать структурированную версию JSON с источником','json']]){const pending=page.waitForEvent('download');await article.getByRole('button',{name:button,exact:true}).click();const file=await pending,bytes=await readFile((await file.path())!);expect(file.suggestedFilename()).toBe('jobmatch-source-version-'+s.records[1].id+'.'+format);if(format==='txt')expect(bytes.toString()).toBe(s.records[1].text);else expect(JSON.parse(bytes.toString())).toEqual(s.records[1]);}
 await select(page).selectOption(RU);await expect(article).toContainText(EN);expect(s.workspaceWrites).toEqual([]);expect(s.writes.map(b=>b.action)).toEqual(['preview','save']);
});
test('changing headings discards preview and consent; default RU does not extend the old wire',async({page})=>{
 const s=await setup(page);await prepare(page);expect(s.writes[0]).not.toHaveProperty('templateVersion');await s.panel.getByRole('checkbox',{name:/Я проверил\(а\) показанные текст и диапазоны/}).check();await select(page).selectOption(EN);await expect(s.panel.getByRole('article',{name:'Предпросмотр структурированной версии',exact:true})).toHaveCount(0);
 await s.panel.getByRole('button',{name:'Получить дословный предпросмотр',exact:true}).click();await expect(s.panel.getByRole('checkbox',{name:/Я проверил\(а\) показанные текст и диапазоны/})).not.toBeChecked();await expect(s.panel.getByRole('button',{name:'Сохранить показанную структурированную версию',exact:true})).toBeDisabled();expect(s.writes.map(b=>b.action)).toEqual(['preview','preview']);
});
for(const fault of ['alter','lost','wrong-template'] as const)test('invalid or lost '+fault+' reply requires manual history read and never retries',async({page})=>{
 const s=await setup(page,{fault});await select(page).selectOption(EN);await prepare(page);await save(page);await expect(s.panel.getByRole('alert')).toContainText('Сначала перечитайте историю');await expect(page.locator('body')).not.toContainText('PRIVATE_FALSE_ACK');expect(s.records).toHaveLength(2);expect(s.writes.map(b=>b.action)).toEqual(['preview','save']);
 await s.panel.getByRole('button',{name:'Прочитать историю структурированных версий',exact:true}).click();await expect(s.panel).toContainText('В прочитанной истории: 2/20');await s.panel.getByRole('button',{name:'Открыть структурированную версию 2',exact:true}).click();await expect(s.panel.getByRole('article',{name:'Сохранённая структурированная версия',exact:true})).toContainText(EN);expect(s.writes.map(b=>b.action)).toEqual(['preview','save']);
});
test('held preview locks heading changes and source-boundary abort discards its late reply',async({page})=>{
 const s=await setup(page,{hold:'preview'});await select(page).selectOption(EN);await prepare(page);await expect(select(page)).toBeDisabled();await page.locator('#profile-resume').fill('UNSAVED NEW SOURCE');s.release();await expect(s.panel.getByRole('article',{name:'Предпросмотр структурированной версии',exact:true})).toHaveCount(0);await expect(select(page)).toBeDisabled();expect(s.writes).toHaveLength(1);
});
test('disabled English capability fails without Russian fallback and mobile controls have no automated accessibility or overflow failures',async({page})=>{
 await page.setViewportSize({width:390,height:844});const s=await setup(page,{unavailable:true});await select(page).selectOption(EN);await prepare(page);await expect(s.panel.getByRole('alert')).toContainText('недоступно');await expect(s.panel.getByRole('article',{name:'Предпросмотр структурированной версии',exact:true})).toHaveCount(0);expect(s.writes).toHaveLength(1);expect(s.writes[0].templateVersion).toBe(EN);await page.getByLabel('Fixture language',{exact:true}).selectOption('en');expect((await new AxeBuilder({page}).include('section[aria-label="Literal structured versions"]').analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
