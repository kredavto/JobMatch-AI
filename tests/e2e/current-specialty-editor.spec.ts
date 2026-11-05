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
const ownerId='11111111-1111-4111-8111-111111111111',created='2026-11-01T03:00:00Z';
const initial:Workspace={ownerId,revision:7,original:'SQL 🧑‍💻',vacancy:'SQL',goal:'',facts:[],versions:[],applications:[{id:'a1',title:'Tracked role',status:'Планируется',note:'Original note',created,events:[{status:'Планируется',date:created}],resumeVersionId:null}]};
type Options={lost?:boolean;hold?:boolean;status?:number;source?:Workspace;ack?:(next:Workspace)=>Workspace};
async function setup(page:Page,options:Options={}){
 let workspace=structuredClone(options.source??initial),failure=options.status,reads=0,release!:()=>void;
 const held=new Promise<void>(done=>{release=done;}),writes:Record<string,unknown>[]=[];
 await page.route('**/api/**',route=>route.abort());
 await page.route('**/api/service',async route=>{
  if(route.request().method()==='GET'){reads++;return route.fulfill({json:workspace});}
  const body=route.request().postDataJSON();writes.push(body);
  expect(body.action).toBe('application');expect(body.id).toBe(workspace.applications[0].id);expect(body.expectedOwnerId).toBe(ownerId);expect(body.revision).toBe(workspace.revision);
  const old=workspace.applications[0],row={...old,status:String(body.status),note:String(body.note),...(Object.hasOwn(body,'specialty')?{specialty:body.specialty}:{}),...(Object.hasOwn(body,'resumeVersionId')?{resumeVersionId:body.resumeVersionId as string|null}:{} )};
  expect(row.status).toBe(old.status);
  const next={...workspace,revision:workspace.revision+1,applications:[row]};
  if(options.hold)await held;
  if(failure)return route.fulfill({status:failure,json:{code:failure===429?'RATE_LIMITED':'UPSTREAM_UNAVAILABLE',error:'PRIVATE_PROVIDER'}});
  workspace=next;if(options.lost)return route.abort('failed');return route.fulfill({json:options.ack?options.ack(structuredClone(next)):next});
 });
 await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();
 return{release,writes,setStatus:(value:number|undefined)=>{failure=value;},setCurrent:(value:Workspace)=>{workspace=value;},counts:()=>({reads,writes:writes.length}),current:()=>workspace};
}
const input=(page:Page)=>page.locator('[data-application-specialty-input]');
const action=(page:Page,name:string)=>page.locator(`[data-action="${name}-application-specialty"]`);
const idle=(page:Page)=>expect(page.getByRole('button',{name:/^(Выйти|Sign out)$/})).toBeEnabled();
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);}
async function edit(page:Page,text:string){await action(page,'edit').click();await input(page).fill(text);}

test('explicit literal specialty save and local clear preserve unrelated metadata',async({page})=>{
 const s=await setup(page);await edit(page,'Data 🧑‍💻');expect(s.writes).toHaveLength(0);await action(page,'save').click();await idle(page);await expect(input(page)).toHaveCount(0);
 expect(s.current().applications[0]).toEqual({...initial.applications[0],specialty:'Data 🧑‍💻'});
 await action(page,'edit').click();await action(page,'clear').click();await expect(input(page)).toHaveValue('');expect(s.writes).toHaveLength(1);await action(page,'save').click();await idle(page);
 expect(s.writes[1]).toMatchObject({specialty:'',note:'Original note',status:'Планируется'});expect(s.current().applications[0]).toEqual({...initial.applications[0],specialty:''});
});
test('double save sends once while newer typing survives exact acknowledgement',async({page})=>{
 const s=await setup(page,{hold:true});await edit(page,'Captured A');await action(page,'save').evaluate((b:HTMLButtonElement)=>{b.click();b.click();});await expect.poll(()=>s.writes.length).toBe(1);await input(page).fill('Newer B');s.release();await idle(page);await expect(input(page)).toHaveValue('Newer B');await expect(page.locator('[data-specialty-conflict]')).toHaveCount(0);await action(page,'save').click();await idle(page);await expect(input(page)).toHaveCount(0);expect(s.current().applications[0].specialty).toBe('Newer B');expect(s.writes).toHaveLength(2);
});
test('edit then restore is a newer draft across locale and filtering',async({page})=>{
 const s=await setup(page,{hold:true});await edit(page,'Same A');await action(page,'save').click();await expect.poll(()=>s.writes.length).toBe(1);await input(page).fill('Temporary B');await input(page).fill('Same A');await language(page,'en');await page.getByRole('searchbox').fill('not-found');await page.locator('#application-filter-reset').click();s.release();await idle(page);await expect(input(page)).toHaveValue('Same A');await input(page).fill('Next C');await expect(action(page,'save')).toBeEnabled();await expect(page.locator('[data-specialty-conflict]')).toHaveCount(0);expect(s.writes).toHaveLength(1);
});
test('cancelled pending edit is not revived and returns keyboard focus after acknowledgement',async({page})=>{
 const s=await setup(page,{hold:true});await edit(page,'Captured A');await action(page,'save').click();await expect.poll(()=>s.writes.length).toBe(1);await input(page).fill('Discard B');await action(page,'cancel').click();await expect(input(page)).toHaveCount(0);s.release();await idle(page);await expect(input(page)).toHaveCount(0);await expect(action(page,'edit')).toBeFocused();expect(s.current().applications[0].specialty).toBe('Captured A');expect(s.writes).toHaveLength(1);
});
test('wrong label acknowledgement pauses writes and explicit reload does not expose wrong data',async({page})=>{
 const s=await setup(page,{ack:next=>({...next,applications:next.applications.map(a=>({...a,specialty:'PRIVATE_WRONG_ACK'}))})});await edit(page,'Actual label');await action(page,'save').click();await expect(page.locator('.error[role=alert]')).toBeVisible();await expect(input(page)).toHaveValue('Actual label');await expect(action(page,'save')).toBeDisabled();await expect(page.locator('body')).not.toContainText('PRIVATE_WRONG_ACK');expect(s.counts()).toEqual({reads:1,writes:1});await language(page,'en');await page.getByRole('button',{name:'Load current data',exact:true}).click();await idle(page);expect(s.counts()).toEqual({reads:2,writes:1});expect(s.current().applications[0].specialty).toBe('Actual label');
});
test('external specialty change requires separate compare and rebase before retry',async({page})=>{
 const s=await setup(page,{status:503});await edit(page,'Local draft');await action(page,'save').click();await expect(page.locator('.error[role=alert]')).toBeVisible();s.setCurrent({...initial,revision:8,applications:initial.applications.map(a=>({...a,specialty:'External label'}))});s.setStatus(undefined);await page.getByRole('button',{name:'Загрузить актуальные данные',exact:true}).click();await expect(input(page)).toHaveValue('Local draft');await expect(page.locator('[data-specialty-conflict]')).toBeVisible();await expect(action(page,'save')).toBeDisabled();await action(page,'compare').click();await expect(action(page,'save')).toBeEnabled();expect(s.writes).toHaveLength(1);await action(page,'save').click();await idle(page);expect(s.writes[1]).toMatchObject({revision:8,specialty:'Local draft'});
});
test('unknown legacy metadata survives opening cancellation and unrelated note save',async({page})=>{
 const legacy={opaque:['unknown'],nested:{keep:true}},source={...initial,applications:initial.applications.map(a=>({...a,specialty:legacy}))};const s=await setup(page,{source});await action(page,'edit').click();expect(s.writes).toHaveLength(0);await action(page,'cancel').click();await page.locator('[data-application-note]').fill('Edited note');await page.locator('[data-action="save-application-note"]').click();await idle(page);expect(s.current().applications[0].specialty).toEqual(legacy);expect(s.writes[0]).not.toHaveProperty('specialty');
});
test('specialty-only save preserves an independent unsaved note draft',async({page})=>{
 const s=await setup(page);await page.locator('[data-application-note]').fill('Local note');await edit(page,'QA');await action(page,'save').click();await idle(page);await expect(page.locator('[data-application-note]')).toHaveValue('Local note');await expect(page.locator('[data-action="save-application-note"]')).toBeEnabled();expect(s.writes[0]).toMatchObject({note:'Original note',specialty:'QA'});expect(s.current().applications[0].note).toBe('Original note');
});
test('rate rejection keeps literal draft and retry remains explicit',async({page})=>{
 const s=await setup(page,{status:429});await edit(page,'Retry label');await action(page,'save').click();await expect(page.locator('.error[role=alert]')).toBeVisible();await expect(input(page)).toHaveValue('Retry label');await language(page,'en');expect(s.writes).toHaveLength(1);await expect(page.locator('body')).not.toContainText('PRIVATE_PROVIDER');s.setStatus(undefined);await action(page,'save').click();await idle(page);expect(s.writes).toHaveLength(2);
});
test('owner-unknown workspace cannot submit a label',async({page})=>{
 const {ownerId:_owner,...source}=initial;void _owner;const s=await setup(page,{source});await expect(action(page,'edit')).toBeDisabled();await language(page,'en');await expect(action(page,'edit')).toBeDisabled();expect(s.writes).toHaveLength(0);
});
test('mobile locale and navigation preserve pending specialty draft accessibly',async({page})=>{
 await page.setViewportSize({width:390,height:844});const s=await setup(page,{hold:true});await edit(page,'Captured mobile');await action(page,'save').click();await expect.poll(()=>s.writes.length).toBe(1);await input(page).fill('New mobile draft');await page.getByRole('navigation').getByRole('button',{name:'Настройки',exact:true}).click();await language(page,'en');s.release();await idle(page);await page.getByRole('navigation').getByRole('button',{name:'Applications',exact:true}).click();await expect(input(page)).toHaveValue('New mobile draft');expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(s.writes).toHaveLength(1);
});
test('reserved application IDs remain editable and focus returns on save and cancel',async({page})=>{
 const source={...initial,applications:initial.applications.map(a=>({...a,id:'__proto__'}))};const s=await setup(page,{source});await action(page,'edit').click();await expect(input(page)).toBeFocused();await input(page).fill('Safe key');await action(page,'save').click();await idle(page);await expect(action(page,'edit')).toBeFocused();await action(page,'edit').click();await action(page,'cancel').click();await expect(action(page,'edit')).toBeFocused();expect(s.current().applications[0].specialty).toBe('Safe key');expect(s.writes).toHaveLength(1);
});
test('invalid literal text is not normalized or submitted',async({page})=>{
 const s=await setup(page);await edit(page,' leading');await expect(input(page)).toHaveValue(' leading');await expect(action(page,'save')).toBeDisabled();await input(page).fill('trailing ');await expect(input(page)).toHaveValue('trailing ');await expect(action(page,'save')).toBeDisabled();await input(page).fill('x'.repeat(121));await expect(action(page,'save')).toBeDisabled();expect(s.writes).toHaveLength(0);await input(page).fill('QA');await expect(action(page,'save')).toBeEnabled();await action(page,'cancel').click();expect(s.writes).toHaveLength(0);
});

test('lost response after commit retains draft and explicit read never replays the write',async({page})=>{
 const s=await setup(page,{lost:true});await edit(page,'Committed label');await action(page,'save').click();await expect(page.locator('.error[role=alert]')).toBeVisible();await expect(input(page)).toHaveValue('Committed label');await expect(action(page,'save')).toBeDisabled();expect(s.counts()).toEqual({reads:1,writes:1});await language(page,'en');await page.getByRole('button',{name:'Load current data',exact:true}).click();await idle(page);expect(s.counts()).toEqual({reads:2,writes:1});expect(s.current().applications[0].specialty).toBe('Committed label');await expect(input(page)).toHaveValue('Committed label');await expect(action(page,'save')).toBeDisabled();await expect(action(page,'compare')).toBeVisible();
});
