import {test,expect,type Page} from '@playwright/test';
import {fork,type ChildProcess} from 'node:child_process';
import {resolve} from 'node:path';
let child:ChildProcess,origin:string;
test.describe.configure({timeout:60000});
test.beforeAll(async()=>{
 const env:NodeJS.ProcessEnv={NODE_ENV:'test',JOBMATCH_LOCAL_SOURCE_LOCALES:'1'};
 for(const key of ['PATH','TMPDIR','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy'])if(process.env[key])env[key]=process.env[key];
 child=fork(resolve(__dirname,'../fixtures/source-locale-server.mjs'),[],{execArgv:[],env,stdio:['ignore','ignore','ignore','ipc']});
 origin=await new Promise<string>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Owned auth fixture startup timed out'));},20000);child.once('error',()=>{clearTimeout(timer);fail(Error('Owned auth fixture failed'));});child.once('exit',()=>{clearTimeout(timer);fail(Error('Owned auth fixture exited'));});child.once('message',value=>{clearTimeout(timer);const port=(value as {port?:unknown})?.port;if(!Number.isInteger(port)||Number(port)<1024||Number(port)>65535){child.kill();fail(Error('Owned auth fixture refused'));return;}done('http://127.0.0.1:'+port);});});
});
test.afterAll(async()=>{if(!child||child.exitCode!==null)return;await new Promise<void>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Owned auth fixture cleanup timed out'));},15000);child.once('exit',code=>{clearTimeout(timer);if(code===0)done();else fail(Error('Owned auth fixture cleanup failed'));});child.send('close');});});


const ownerId='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222';
const initial={ownerId,revision:7,original:'PRIVATE RESUME',vacancy:'SQL',goal:'',facts:[],versions:[],applications:[]};
const archive={format:'jobmatch-personal-data-v1',complete:true,scope:'workspace-audit-consent',exported_at:'2026-11-02T00:00:00Z',fact_history_export:'/api/fact-history?export=1',saved_letters_export:'/api/letter-versions?export=1',source_versions_export:'/api/source-versions?export=1',user:{id:ownerId},workspace:initial,audit:[],consent:[]};
async function openSettings(page:Page){await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Настройки',exact:true}).click();}
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
const exportButton=(page:Page)=>page.getByRole('button',{name:/^(Экспорт профиля, версий и откликов|Export profile, versions and applications)$/});
const panel=(page:Page)=>page.locator('#workspace-settings');

test('valid-shaped export from another user cannot create a personal file',async({page})=>{
 let files=0;page.on('download',()=>files++);await page.route('**/api/service',route=>route.fulfill({json:route.request().method()==='GET'?initial:{...archive,user:{id:otherId}}}));
 await openSettings(page);await exportButton(page).click();await expect.poll(async()=>files+await page.locator('.error').count()).toBeGreaterThan(0);expect(files).toBe(0);await expect(exportButton(page)).toBeDisabled();
});
test('a paused workspace cannot expose active settings history download links',async({page})=>{
 await page.route('**/api/service',route=>route.request().method()==='GET'?route.fulfill({json:initial}):route.fulfill({status:503,json:{error:'Unavailable'}}));
 await openSettings(page);await exportButton(page).click();await expect(page.locator('.error')).toBeVisible();await expect(page.getByRole('link',{name:/Скачать.*историю.*NDJSON/})).toHaveCount(0);
});
