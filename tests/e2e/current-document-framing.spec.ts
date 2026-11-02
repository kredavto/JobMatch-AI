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


import {match,parseVacancy,propose} from '../../lib/engine';
const owner='11111111-1111-4111-8111-111111111111';
const workspace={ownerId:owner,revision:3,original:'SQL saved 42%. 🧑‍💻\nPRIVATE ORIGINAL',facts:[{id:'f1',text:'SQL saved 42%. 🧑‍💻',source:'RAW источник source',verified:true},{id:'private',text:'PRIVATE UNCONFIRMED',source:'PRIVATE SOURCE',verified:false}],vacancy:'SQL\nPython\nSQL от 5 лет',goal:'',versions:[],applications:[]};
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
async function setup(page:Page,source=workspace){let reads=0;const writes:string[]=[],unexpected:string[]=[];await page.route('**/api/**',route=>{unexpected.push(new URL(route.request().url()).pathname);return route.abort('failed');});await page.route('**/api/service',route=>{if(route.request().method()==='GET'){reads++;return route.fulfill({json:source});}const body=route.request().postDataJSON();writes.push(body.action);if(body.action==='analyze'){const requirements=parseVacancy(source.vacancy);return route.fulfill({json:{analysis:match(source.facts,requirements),edits:propose(source.facts,requirements)}});}throw Error('Unexpected workspace write');});await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →',exact:true}).click();await expect(page.locator('#career-plan')).toBeVisible();return {counts:()=>({reads,writes,unexpected})};}
const letter=(page:Page)=>page.locator('#cover-letter');
const career=(page:Page)=>page.locator('#career-plan');

test('the current letter provides an explicit next-draft document language independent of interface',async({page})=>{
 const s=await setup(page);await language(page,'en');await expect(letter(page).locator('#cover-letter-document-language')).toBeVisible();await expect(letter(page).locator('#cover-letter-document-language')).toHaveValue('ru');expect(s.counts()).toEqual({reads:1,writes:['analyze'],unexpected:[]});
});
test('the current interview export has an explicit document-language choice',async({page})=>{
 const s=await setup(page);await expect(career(page).locator('#career-document-language')).toBeVisible();await expect(career(page).locator('#career-document-language')).toHaveValue('ru');expect(s.counts()).toEqual({reads:1,writes:['analyze'],unexpected:[]});
});
