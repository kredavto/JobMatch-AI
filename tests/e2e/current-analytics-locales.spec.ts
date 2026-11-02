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
const initial={ownerId,revision:7,original:'PRIVATE RESUME',vacancy:'SQL',goal:'',facts:[],versions:[{id:'v1',created:'2026-09-01',text:'SQL',vacancy:'SQL',evidence_ids:[],score:0}],applications:[
 {id:'day',title:'=Demo 🧑‍💻, "company"',status:'Интервью',note:'PRIVATE NOTE',created:'2026-09-01',resumeVersionId:'v1',events:[{status:'Отклик отправлен',date:'2026-10-10'},{status:'Интервью',date:'2026-11-02T12:00:00Z'}]},
 {id:'local',title:'Unplaced literal',status:'Просмотрено',note:'PRIVATE NOTE',created:'2026-09-01',resumeVersionId:'v1',events:[{status:'Отклик отправлен',date:'2026-10-01T00:30:00'},{status:'Просмотрено',date:'2026-11-01T12:00:00Z'}]},
 {id:'prior',title:'Prior literal',status:'Просмотрено',note:'',created:'2026-09-01',events:[{status:'Просмотрено',date:'2026-10-08'}]},
 {id:'planned',title:'Planned literal',status:'Планируется',note:'',created:'2026-10-10',events:[]}
]};
async function setup(page:Page,state=initial){let reads=0,posts=0;await page.route('**/api/service',route=>{if(route.request().method()!=='GET'){posts++;throw Error('Unexpected analytics write');}reads++;return route.fulfill({json:state});});await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Аналитика',exact:true}).click();return {counts:()=>({reads,posts})};}
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
const panel=(page:Page)=>page.locator('#application-analytics');

test('offset-less application cannot acquire a UTC monthly cohort from the device zone',async({browser})=>{
 const context=await browser.newContext({timezoneId:'Pacific/Honolulu'});try{const page=await context.newPage(),s=await setup(page,{...initial,applications:[initial.applications[1]]});const monthly=page.getByRole('region',{name:'Результаты по месяцам отправки',exact:true});await expect(monthly.locator('tbody tr')).toHaveCount(0);expect(s.counts()).toEqual({reads:1,posts:0});}finally{await context.close();}
});
test('the current analytics screen resolves English presentation without refetching data',async({page})=>{
 const s=await setup(page);await language(page,'en');await expect(page.getByRole('heading',{name:'Period and resume version',exact:true})).toBeVisible();expect(s.counts()).toEqual({reads:1,posts:0});
});
