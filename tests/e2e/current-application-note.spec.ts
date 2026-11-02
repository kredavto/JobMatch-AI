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
const ownerId='11111111-1111-4111-8111-111111111111',created='2026-11-01T03:00:00Z',stamp='2026-11-02T03:33:00Z';
const initial:Workspace={ownerId,revision:7,original:'SQL 🧑‍💻',vacancy:'SQL',goal:'',facts:[],versions:[{id:'v1',created,text:'SQL',vacancy:'SQL',score:0,evidence_ids:[]}],applications:[{id:'a1',title:'Tracked role',status:'Планируется',note:'Original note',created,events:[{status:'Планируется',date:created}],resumeVersionId:null}]};
type Options={hold?:boolean;status?:number;ack?:(next:Workspace)=>Workspace};
async function setup(page:Page,options:Options={}){let workspace=structuredClone(initial),failure=options.status,reads=0,release!:()=>void;const held=new Promise<void>(done=>{release=done;}),writes:Record<string,unknown>[]=[];
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET'){reads++;return route.fulfill({json:workspace});}const body=route.request().postDataJSON();writes.push(body);expect(body.action).toBe('application');expect(body.id).toBe('a1');expect(body.expectedOwnerId).toBe(ownerId);expect(body.revision).toBe(workspace.revision);const old=workspace.applications[0],row={...old,status:String(body.status),note:String(body.note),...(Object.hasOwn(body,'resumeVersionId')?{resumeVersionId:body.resumeVersionId as string|null}:{}),events:old.status===body.status?old.events:[...old.events,{status:String(body.status),date:stamp}]};const next={...workspace,revision:workspace.revision+1,applications:[row]};if(options.hold)await held;if(failure)return route.fulfill({status:failure,json:{code:failure===429?'RATE_LIMITED':'UPSTREAM_UNAVAILABLE',error:'PRIVATE_PROVIDER'}});workspace=next;return route.fulfill({json:options.ack?options.ack(structuredClone(next)):next});});
 await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();return{release,writes,setStatus:(value:number|undefined)=>{failure=value;},setCurrent:(value:Workspace)=>{workspace=value;},counts:()=>({reads,writes:writes.length}),current:()=>workspace};}
const note=(page:Page)=>page.getByRole('textbox',{name:'Заметки',exact:true});
const save=(page:Page)=>page.getByRole('button',{name:'Сохранить заметку',exact:true});
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);}

test('late saved-note acknowledgement rebases newer typing without a false conflict',async({page})=>{
 const s=await setup(page,{hold:true});await note(page).fill('Submitted A');await save(page).click();await expect.poll(()=>s.writes.length).toBe(1);await expect(page.getByRole('button',{name:'Выйти',exact:true})).toBeDisabled();await note(page).fill('Newer B 🧑‍💻');s.release();await expect(page.getByRole('button',{name:'Выйти',exact:true})).toBeEnabled();await expect(note(page)).toHaveValue('Newer B 🧑‍💻');await expect(page.getByRole('alert').filter({hasText:'Сохраненная заметка изменилась'})).toHaveCount(0);await save(page).click();await expect(page.getByRole('button',{name:'Сохранить заметку',exact:true})).toHaveCount(0);await note(page).fill('Third edit C');await expect(page.getByRole('alert').filter({hasText:'Сохраненная заметка изменилась'})).toHaveCount(0);expect(s.counts()).toEqual({reads:1,writes:2});
});
test('schema-valid wrong note acknowledgement is refused before adopting or rebasing the draft',async({page})=>{
 const s=await setup(page,{ack:next=>({...next,applications:next.applications.map(a=>({...a,note:'PRIVATE_WRONG_ACK'}))})});await note(page).fill('Keep submitted note');await save(page).click();await expect.poll(()=>s.writes.length).toBe(1);await expect(page.getByRole('button',{name:'Выйти',exact:true})).toBeEnabled();await expect(page.locator('.error[role=alert]')).toBeVisible();await expect(note(page)).toHaveValue('Keep submitted note');await expect(page.locator('body')).not.toContainText('PRIVATE_WRONG_ACK');expect(s.counts()).toEqual({reads:1,writes:1});
});
