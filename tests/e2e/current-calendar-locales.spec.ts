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


const ownerId='11111111-1111-4111-8111-111111111111';
const state={ownerId,revision:7,original:'PRIVATE RESUME',vacancy:'SQL',goal:'',facts:[],versions:[],applications:[{id:'a1',title:'Demo 🧑‍💻 company',status:'Планируется',note:'PRIVATE TRACKER NOTE',created:'2026-11-01',events:[]}]};
async function setup(page:Page){let reads=0,posts=0;await page.route('**/api/service',route=>{if(route.request().method()!=='GET'){posts++;throw Error('Unexpected calendar write');}reads++;return route.fulfill({json:state});});await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();return{counts:()=>({reads,posts})};}
const panel=(page:Page)=>page.getByRole('region',{name:/^(Напоминание по отклику|Application calendar reminder)$/});
const when=(page:Page)=>panel(page).locator('input[type="datetime-local"]');
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
async function prepare(page:Page,value='2026-11-02T10:30'){await panel(page).getByLabel('Отклик для напоминания',{exact:false}).selectOption('a1');await when(page).fill(value);}

test('repeated device-local time cannot export until the user chooses an occurrence',async({browser})=>{
 const context=await browser.newContext({timezoneId:'America/New_York'});try{const page=await context.newPage(),s=await setup(page);await prepare(page,'2026-11-01T01:30');await expect(panel(page).getByRole('button',{name:'Скачать напоминание (ICS)',exact:true})).toBeDisabled();await expect(panel(page).getByLabel('Выберите повторяющееся время',{exact:true})).toBeVisible();expect(s.counts()).toEqual({reads:1,posts:0});}finally{await context.close();}
});
test('calendar download failure never displays unknown exception text',async({page})=>{
 const s=await setup(page);await prepare(page);await page.evaluate(()=>{URL.createObjectURL=()=>{throw Error('PRIVATE CALENDAR PATH /SECRET');};});await panel(page).getByRole('button',{name:'Скачать напоминание (ICS)',exact:true}).click();await expect(panel(page).getByRole('alert')).toBeVisible();await expect(panel(page).getByRole('alert')).not.toContainText('PRIVATE CALENDAR PATH');expect(s.counts()).toEqual({reads:1,posts:0});
});
