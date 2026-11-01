import {test,expect} from '@playwright/test';
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
const saved={ownerId,revision:7,original:'Owned SQL 2024',vacancy:'SQL required',goal:'Original goal',facts:[{id:'f1',text:'Owned SQL 2024',source:'Fixture',verified:false}],versions:[],applications:[]};
for(const invalid of ['other-owner','stale-revision'] as const)test('goal mutation refuses '+invalid+' workspace before adoption',async({page})=>{
 let posts=0;await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:saved});posts++;return route.fulfill({json:{...saved,ownerId:invalid==='other-owner'?'22222222-2222-4222-8222-222222222222':ownerId,revision:invalid==='stale-revision'?7:8,original:'PRIVATE_REJECTED_WORKSPACE',facts:[{id:'private-f1',text:'PRIVATE_REJECTED_WORKSPACE',source:'Fixture',verified:false}]}});});
 await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();await page.locator('#profile-goal').fill('Keep my goal draft');await page.locator('#profile-save-goal').click();await expect(page.locator('.error[role=alert]')).toBeVisible({timeout:2000});await expect(page.locator('body')).not.toContainText('PRIVATE_REJECTED_WORKSPACE');await expect(page.locator('#profile-goal')).toHaveValue('Keep my goal draft');expect(posts).toBe(1);
});
