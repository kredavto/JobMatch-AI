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
const saved={ownerId,revision:7,original:'SQL 🧑‍💻 2024',vacancy:'SQL required',goal:'Analyst',facts:[{id:'f1',text:'SQL 🧑‍💻 2024',source:'Оригинал',verified:false}],versions:[],applications:[]};
const factName='Уточнение или дополнительный факт';
function added(text:string){return {...saved,revision:8,original:saved.original+'\n'+text,facts:[...saved.facts,{id:'f2',text,source:'Уточнение пользователя',verified:false}]};}
for(const aba of [false,true])test('late fact acknowledgement preserves the next draft '+(aba?'after an edit-and-restore':'after a new edit'),async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;}),writes:Record<string,unknown>[]=[];
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET')return route.fulfill({json:saved});const body=route.request().postDataJSON();writes.push(body);await held;return route.fulfill({json:added(String(body.text))});});
 await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 const field=page.getByRole('textbox',{name:factName,exact:true});await field.fill('First fact SQL 2025');await page.getByRole('button',{name:'Добавить неподтвержденный факт',exact:true}).click();await expect.poll(()=>writes.length).toBe(1);await field.fill('Next fact Go 2026');if(aba)await field.fill('First fact SQL 2025');release();await expect(page.getByRole('button',{name:'Выйти',exact:true})).toBeEnabled();await expect(field).toHaveValue(aba?'First fact SQL 2025':'Next fact Go 2026',{timeout:2000});expect(writes).toEqual([{action:'fact',revision:7,text:'First fact SQL 2025',expectedOwnerId:ownerId}]);
});
