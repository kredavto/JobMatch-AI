import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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
async function setup(page:Page,options:Options={}){let workspace=structuredClone(options.source??initial),failure=options.status,reads=0,release!:()=>void;const held=new Promise<void>(done=>{release=done;}),writes:Record<string,unknown>[]=[];
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET'){reads++;return route.fulfill({json:workspace});}const body=route.request().postDataJSON();writes.push(body);expect(body.action).toBe('application');expect(body.expectedOwnerId).toBe(workspace.ownerId);expect(body.revision).toBe(workspace.revision);expect(body.id).toBeUndefined();expect(typeof body.title).toBe('string');
 const record={id:'aaaaaaaa-aaaa-4aaa-8aaa-'+String(writes.length).padStart(12,'0'),title:String(body.title),status:'Планируется',note:'',created,events:[{status:'Планируется',date:created}],resumeVersionId:body.resumeVersionId as string|null};const next={...workspace,revision:workspace.revision+1,applications:[record,...workspace.applications]};if(options.hold)await held;if(failure)return route.fulfill({status:failure,json:{code:failure===429?'RATE_LIMITED':'UPSTREAM_UNAVAILABLE',error:'PRIVATE_PROVIDER'}});workspace=next;return route.fulfill({json:options.ack?options.ack(next,body):next});});
 await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();return{release,writes,setStatus:(value:number|undefined)=>{failure=value;},counts:()=>({reads,writes:writes.length}),current:()=>workspace};}
const title=(page:Page)=>page.locator('#application-title');
const add=(page:Page)=>page.locator('#application-create');
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);}

test('late application creation acknowledgement preserves the next typed title',async({page})=>{
 const s=await setup(page,{hold:true});await title(page).fill('Submitted SQL role');await add(page).click();await expect.poll(()=>s.writes.length).toBe(1);await title(page).fill('Next 🧑‍💻 company');s.release();await expect(page.getByRole('heading',{name:'Submitted SQL role',exact:true})).toBeVisible();await expect(title(page)).toHaveValue('Next 🧑‍💻 company');expect(s.counts()).toEqual({reads:1,writes:1});
});
test('schema-valid next-revision acknowledgement must contain the exact created application before clearing its draft',async({page})=>{
 const s=await setup(page,{ack:next=>({...next,applications:[]})});await title(page).fill('Keep the submitted title');await add(page).click();await expect.poll(()=>s.writes.length).toBe(1);await expect(page.getByRole('button',{name:'Выйти',exact:true})).toBeEnabled();await expect(title(page)).toHaveValue('Keep the submitted title');await expect(page.locator('.error[role=alert]')).toBeVisible();expect(s.counts()).toEqual({reads:1,writes:1});
});

const version=(id:string)=>({id,created:'2026-10-25T00:00:00Z',text:'Literal SQL',vacancy:'SQL',score:0,evidence_ids:[]});
const oldApplication={id:'old-application',title:'Existing application',status:'Планируется',note:'',created,events:[{status:'Планируется',date:created}]};
test('same-frame creation and status change send one captured command through the shared guard',async({page})=>{
 const s=await setup(page,{hold:true,source:{...initial,applications:[oldApplication]}});await title(page).fill('  Literal 🧑‍💻 role  ');await add(page).evaluate((button:HTMLButtonElement)=>{button.click();button.click();const status=document.querySelector<HTMLSelectElement>('select[aria-label="Статус"]')!;status.value='Интервью';status.dispatchEvent(new Event('change',{bubbles:true}));});await expect.poll(()=>s.writes.length).toBe(1);await language(page,'en');s.release();await expect(page.getByRole('heading',{name:'Literal 🧑‍💻 role',exact:true})).toBeVisible();await expect(title(page)).toHaveValue('');expect(s.writes).toEqual([{action:'application',revision:7,title:'  Literal 🧑‍💻 role  ',status:'Планируется',resumeVersionId:null,expectedOwnerId:ownerId}]);expect(s.current().applications.find(a=>a.id==='old-application')?.status).toBe('Планируется');expect(s.counts().reads).toBe(1);
});
test('edit then restore of the same title is a newer draft, even across interface languages',async({page})=>{
 const s=await setup(page,{hold:true});await title(page).fill('Same visible title');await add(page).click();await expect.poll(()=>s.writes.length).toBe(1);await title(page).fill('Temporary next draft');await title(page).fill('Same visible title');await language(page,'en');s.release();await expect(page.locator('.notice[role=status]')).toContainText('The new or edited draft is preserved');await expect(title(page)).toHaveValue('Same visible title');await language(page,'ru');await expect(page.locator('.notice[role=status]')).toContainText('Новый или отредактированный');expect(s.writes).toHaveLength(1);
});
test('changing only the next resume-version choice preserves the title and captured submitted link',async({page})=>{
 const s=await setup(page,{hold:true,source:{...initial,versions:[version('v1'),version('v2')]}});const link=page.locator('#application-create-version');await title(page).fill('Linked role');await link.selectOption('v1');await add(page).click();await expect.poll(()=>s.writes.length).toBe(1);await link.selectOption('v2');s.release();await expect(page.getByRole('heading',{name:'Linked role',exact:true})).toBeVisible();await expect(title(page)).toHaveValue('Linked role');await expect(link).toHaveValue('v2');expect(s.writes[0].resumeVersionId).toBe('v1');expect(s.current().applications[0].resumeVersionId).toBe('v1');expect(s.writes).toHaveLength(1);
});
test('late acknowledgement preserves a newer title and the selected tab through a locale change',async({page})=>{
 const s=await setup(page,{hold:true});await title(page).fill('Captured title');await add(page).click();await expect.poll(()=>s.writes.length).toBe(1);await title(page).fill('New local draft');await page.getByRole('navigation').getByRole('button',{name:'Настройки',exact:true}).click();await language(page,'en');s.release();await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeEnabled();await expect(page.getByRole('heading',{level:1})).toHaveText('Settings');await page.getByRole('navigation').getByRole('button',{name:'Applications',exact:true}).click();await expect(title(page)).toHaveValue('New local draft');expect(s.writes).toHaveLength(1);
});
test('definitive rate rejection retains the next title and retry remains explicit',async({page})=>{
 const s=await setup(page,{status:429});await title(page).fill('Retained title');await add(page).click();await expect(page.locator('.error[role=alert]')).toBeVisible();await expect(title(page)).toHaveValue('Retained title');await language(page,'en');expect(s.writes).toHaveLength(1);await expect(page.locator('body')).not.toContainText('PRIVATE_PROVIDER');s.setStatus(undefined);await add(page).click();await expect(page.getByRole('heading',{name:'Retained title',exact:true})).toBeVisible();await expect(title(page)).toHaveValue('');expect(s.writes).toHaveLength(2);
});
test('invalid creation acknowledgement pauses writes, hides wrong data and requires an explicit read',async({page})=>{
 const s=await setup(page,{ack:next=>({...next,applications:next.applications.map(a=>({...a,title:'PRIVATE_ACK_WRONG_TITLE'}))})});await title(page).fill('Actual committed title');await add(page).click();await expect(page.locator('.error[role=alert]')).toContainText('Ответ не подтверждает создание');await expect(title(page)).toHaveValue('Actual committed title');await expect(add(page)).toBeDisabled();await expect(page.locator('body')).not.toContainText('PRIVATE_ACK_WRONG_TITLE');await language(page,'en');await expect(page.locator('.error[role=alert]')).toContainText('The write may have completed');expect(s.counts()).toEqual({reads:1,writes:1});await page.getByRole('button',{name:'Load current data',exact:true}).click();await expect(page.getByRole('heading',{name:'Actual committed title',exact:true})).toBeVisible();await expect(title(page)).toHaveValue('Actual committed title');expect(s.counts()).toEqual({reads:2,writes:1});
});
test('legacy owner-unknown tracker is readable and cannot create a row',async({page})=>{
 const {ownerId:_owner,...source}=initial;void _owner;const s=await setup(page,{source});await title(page).fill('Local only');await expect(add(page)).toBeDisabled();await language(page,'en');await expect(title(page)).toHaveValue('Local only');expect(s.counts()).toEqual({reads:1,writes:0});
});
test('mobile creation remains accessible while later typing is preserved after a valid acknowledgement',async({page})=>{
 await page.setViewportSize({width:390,height:844});const s=await setup(page,{hold:true});await title(page).fill('Mobile captured');await add(page).click();await expect.poll(()=>s.writes.length).toBe(1);await title(page).fill('Mobile next draft');await language(page,'en');s.release();await expect(page.getByRole('heading',{name:'Mobile captured',exact:true})).toBeVisible();await expect(title(page)).toHaveValue('Mobile next draft');expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(s.writes).toHaveLength(1);
});
