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


import {savedFixture,workspace,owner} from '../saved-letter-fixture';
import type {SavedLettersState} from '../../lib/saved-letter';
async function setup(page:Page,state:SavedLettersState,hold=false){let reads=0,historyReads=0,posts=0,release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});await page.route('**/api/service',async route=>{if(route.request().method()==='GET')reads++;else posts++;return route.fulfill({json:workspace});});await page.route('**/api/letter-versions*',async route=>{if(route.request().method()!=='GET')posts++;historyReads++;expect(route.request().headers()['x-jobmatch-owner']).toBe(owner);if(hold)await held;return route.fulfill({json:state});});await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Мои версии',exact:true}).click();return{release,getCounts:()=>({reads,historyReads,posts})};}
function panel(page:Page){return page.locator('section.card').filter({has:page.getByRole('heading',{name:/^(Серверные версии писем|Saved letter versions)$/,level:2})});}
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}

test('saved letter history display uses one recorded instant in every device time zone',async({browser})=>{const f=await savedFixture(),labels:string[]=[];for(const timezoneId of ['America/Los_Angeles','Pacific/Kiritimati']){const context=await browser.newContext({timezoneId});try{const page=await context.newPage(),s=await setup(page,f.state);await panel(page).getByRole('button',{name:'Прочитать историю писем',exact:true}).click();await expect(panel(page).locator(':scope > ul > li')).toHaveCount(1);labels.push(await panel(page).locator(':scope > ul > li > span').innerText());expect(s.getCounts()).toEqual({reads:1,historyReads:1,posts:0});}finally{await context.close();}}expect(labels[0]).toBe(labels[1]);expect(labels[0]).toContain('UTC');});
test('held history read notice follows current UI language without replay or another workspace read',async({page})=>{const f=await savedFixture(),s=await setup(page,f.state,true);await panel(page).getByRole('button',{name:'Прочитать историю писем',exact:true}).click();await expect.poll(()=>s.getCounts().historyReads).toBe(1);await language(page,'en');s.release();await expect(panel(page).getByRole('status')).toContainText('History read.');await language(page,'ru');await expect(panel(page).getByRole('status')).toContainText('История прочитана');expect(s.getCounts()).toEqual({reads:1,historyReads:1,posts:0});});
