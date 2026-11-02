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


import type {Workspace} from '../../lib/db';
const ownerId='11111111-1111-4111-8111-111111111111',created='2026-11-01T00:30:00Z';
const initial:Workspace={ownerId,revision:7,original:'SQL 🧑‍💻',vacancy:'SQL',goal:'',facts:[],versions:[{id:'v1',created,text:'SQL',vacancy:'SQL',score:0,evidence_ids:[]}],applications:[{id:'a1',title:'Literal 🧑‍💻 role',status:'Планируется',note:'Saved SQL note',created,events:[{status:'Планируется',date:created}],resumeVersionId:null}]};
async function setup(page:Page){let reads=0,posts=0;await page.route('**/api/service',route=>{if(route.request().method()!=='GET'){posts++;throw Error('Unexpected tracker write');}reads++;return route.fulfill({json:initial});});await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();return{counts:()=>({reads,posts})};}
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
const timeline=(page:Page)=>page.locator('.application > small, .application [data-application-history]');

test('actual current tracker controls follow optional English while saved data remain literal',async({page})=>{
 const s=await setup(page);await language(page,'en');await expect(page.getByRole('heading',{name:'Your applications',exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Find an application',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Literal 🧑‍💻 role',exact:true})).toBeVisible();expect(s.counts()).toEqual({reads:1,posts:0});
});
test('recorded application event has the same explicit UTC display in two device time zones',async({browser})=>{
 const values:string[]=[];for(const timezoneId of ['America/Los_Angeles','Pacific/Kiritimati']){const context=await browser.newContext({timezoneId});try{const page=await context.newPage(),s=await setup(page);await expect(timeline(page)).toHaveCount(1);values.push(await timeline(page).innerText());expect(s.counts()).toEqual({reads:1,posts:0});}finally{await context.close();}}expect(values[0]).toBe(values[1]);expect(values[0]).toContain('UTC');
});
