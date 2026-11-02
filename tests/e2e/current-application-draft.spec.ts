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
const ownerId='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',created='2026-11-02T03:00:00Z';
const initial:Workspace={ownerId,revision:7,original:'SQL 🧑‍💻',vacancy:'SQL',goal:'',facts:[],versions:[],applications:[]};
type Options={hold?:boolean;status?:number;ack?:(next:Workspace,body:Record<string,unknown>)=>Workspace;source?:Workspace};
async function setup(page:Page,options:Options={}){let workspace=structuredClone(options.source??initial),reads=0,release!:()=>void;const held=new Promise<void>(done=>{release=done;}),writes:Record<string,unknown>[]=[];
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET'){reads++;return route.fulfill({json:workspace});}const body=route.request().postDataJSON();writes.push(body);expect(body.action).toBe('application');expect(body.expectedOwnerId).toBe(workspace.ownerId);expect(body.revision).toBe(workspace.revision);
 const record={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',title:String(body.title),status:'Планируется',note:'',created,events:[{status:'Планируется',date:created}],resumeVersionId:body.resumeVersionId as string|null};const next={...workspace,revision:workspace.revision+1,applications:[record,...workspace.applications]};if(options.hold)await held;if(options.status)return route.fulfill({status:options.status,json:{code:options.status===429?'RATE_LIMITED':'UPSTREAM_UNAVAILABLE',error:'PRIVATE_PROVIDER'}});workspace=options.ack?options.ack(next,body):next;return route.fulfill({json:workspace});});
 await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();return{release,writes,counts:()=>({reads,writes:writes.length}),current:()=>workspace};}
const title=(page:Page)=>page.getByRole('textbox',{name:'Вакансия / компания',exact:true});
const add=(page:Page)=>page.getByRole('button',{name:'Добавить в трекер',exact:true});
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);}

test('late application creation acknowledgement preserves the next typed title',async({page})=>{
 const s=await setup(page,{hold:true});await title(page).fill('Submitted SQL role');await add(page).click();await expect.poll(()=>s.writes.length).toBe(1);await title(page).fill('Next 🧑‍💻 company');s.release();await expect(page.getByRole('heading',{name:'Submitted SQL role',exact:true})).toBeVisible();await expect(title(page)).toHaveValue('Next 🧑‍💻 company');expect(s.counts()).toEqual({reads:1,writes:1});
});
test('schema-valid next-revision acknowledgement must contain the exact created application before clearing its draft',async({page})=>{
 const s=await setup(page,{ack:next=>({...next,applications:[]})});await title(page).fill('Keep the submitted title');await add(page).click();await expect.poll(()=>s.writes.length).toBe(1);await expect(add(page)).toBeEnabled();await expect(title(page)).toHaveValue('Keep the submitted title');await expect(page.locator('.error[role=alert]')).toBeVisible();expect(s.counts()).toEqual({reads:1,writes:1});
});
