import {test,expect,type Page,type Route} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {fork,type ChildProcess} from 'node:child_process';
import {resolve} from 'node:path';
import {rewriteState,rewriteFixture} from '../fixtures/rewrite-review';
import {issueRewriteReviewReceipt} from '../../lib/ai-rewrite-review-signing';
import type {Workspace} from '../../lib/db';
let child:ChildProcess,origin:string;
test.describe.configure({timeout:60000});
test.beforeAll(async()=>{
 const env:NodeJS.ProcessEnv={NODE_ENV:'test',JOBMATCH_LOCAL_SOURCE_LOCALES:'1'};
 for(const key of ['PATH','TMPDIR','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR'])if(process.env[key])env[key]=process.env[key];
 child=fork(resolve(__dirname,'../fixtures/source-locale-server.mjs'),[],{execArgv:[],env,stdio:['ignore','ignore','ignore','ipc']});
 origin=await new Promise<string>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Owned fixture startup timeout'));},20000);child.once('error',()=>{clearTimeout(timer);fail(Error('Owned fixture failed'));});child.once('message',v=>{clearTimeout(timer);const port=(v as {port?:number}).port;if(!Number.isInteger(port)||port!<1024){child.kill();fail(Error('Owned fixture refused'));return;}done('http://127.0.0.1:'+port);});});
});
test.afterAll(async()=>{if(!child||child.exitCode!==null)return;await new Promise<void>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Fixture cleanup timeout'));},10000);child.once('exit',()=>{clearTimeout(timer);done();});child.send('close');});});
type Hook=(route:Route,body:Record<string,unknown>,state:Workspace)=>Promise<void>;
async function setup(page:Page,options:{preview?:Hook;review?:Hook;refused?:boolean;locale?:'ru'|'en'}={}){
 let state=rewriteState();const requests:{kind:string;body:Record<string,unknown>}[]=[],actions:Record<string,unknown>[]=[];
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.route('**/api/service',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const b=route.request().postDataJSON();actions.push(b);if(b.action==='logout')return route.fulfill({json:{ok:true}});
  if(b.action==='goal')state={...state,goal:b.text,revision:state.revision+1};
  return route.fulfill({json:state});
 });
 await page.route('**/api/ai-rewrites',async route=>{
  const b=route.request().postDataJSON() as Record<string,unknown>;requests.push({kind:'preview',body:b});const captured=structuredClone(state);
  if(options.preview)return options.preview(route,b,captured);
  const f=await rewriteFixture(captured,b.factIds as string[],b.requestedLanguage==='en'?'en':'ru',options.refused);
  await route.fulfill({json:f.response});
 });
 await page.route('**/api/ai-rewrite-reviews',async route=>{
  const b=route.request().postDataJSON() as Record<string,unknown>;requests.push({kind:'review',body:b});
  if(options.review)return options.review(route,b,structuredClone(state));
  const f=await rewriteFixture(state),{receipt:previewReceipt,expectedOwnerId:owner,revision:_revision,...confirmation}=b;void _revision;
  const receipt=await issueRewriteReviewReceipt(owner as string,state,previewReceipt,confirmation,f.config);
  await route.fulfill({json:{ownerId:state.ownerId,revision:state.revision,receipt}});
 });
 await page.goto(origin+'/tests/fixtures/workspace-locale.html'+(options.locale==='en'?'?locale=en':''));
 await page.getByRole('navigation').getByRole('button',{name:options.locale==='en'?'Resume editor':'Редактор резюме',exact:true}).click();
 await expect(page.locator('#ai-rewrite-editor')).toBeVisible();return{requests,actions,getState:()=>state};
}
const panel=(page:Page)=>page.locator('#ai-rewrite-editor');
async function preview(page:Page,both=false){const p=panel(page);await p.getByRole('checkbox',{name:'Built 5 SQL reports',exact:true}).check();if(both)await p.getByRole('checkbox',{name:'No Python',exact:true}).check();await p.getByRole('checkbox',{name:'Разрешаю отправить',exact:false}).check();await p.getByRole('button',{name:'Получить предложения',exact:true}).click();await expect(p.getByTestId('rewrite-fact-0')).toBeVisible();}
async function choose(page:Page,manual?:string,both=false){const p=panel(page),first=p.getByTestId('rewrite-fact-0');await first.getByLabel('Ваше решение',{exact:true}).selectOption(manual===undefined?'accept-proposal':'edit');if(manual!==undefined)await first.getByLabel('Ручной текст',{exact:true}).fill(manual);await first.getByRole('checkbox',{name:'Я проверил решение по этому факту',exact:true}).check();if(both){const second=p.getByTestId('rewrite-fact-1');await second.getByLabel('Ваше решение',{exact:true}).selectOption('keep-source');await second.getByRole('checkbox',{name:'Я проверил решение по этому факту',exact:true}).check();}await expect(p.getByRole('textbox',{name:'Выбранный текст',exact:true})).toBeVisible();}
async function acknowledge(page:Page){for(const c of await panel(page).getByRole('checkbox',{name:'Я проверил это изменение',exact:true}).all())await c.check();}
async function language(page:Page,value:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(value);await expect(panel(page)).toHaveAttribute('lang',value);}

test('explicit selection/consents bind preview and server review; no saved version or score writes',async({page})=>{
 const s=await setup(page);expect(s.requests).toEqual([]);await preview(page,true);
 expect(s.requests[0].body).toEqual({consent:true,expectedOwnerId:rewriteState().ownerId,revision:7,factIds:['sql','negative'],requestedLanguage:'ru'});
 expect(JSON.stringify(s.requests[0].body)).not.toContain('PRIVATE');await choose(page,undefined,true);
 const p=panel(page);await expect(p.getByRole('button',{name:'Подтвердить проверку',exact:true})).toBeDisabled();await acknowledge(page);
 await p.getByRole('checkbox',{name:'Подтверждаю проверку выбранного текста',exact:false}).check();await p.getByRole('button',{name:'Подтвердить проверку',exact:true}).click();
 await expect(p.getByRole('status')).toContainText('Подтверждение получено');await expect(p).toContainText('Версия не сохранена');
 expect(s.requests.map(r=>r.kind)).toEqual(['preview','review']);expect(s.actions).toEqual([]);
 expect(s.requests[1].body).not.toHaveProperty('original');expect(s.getState().versions).toEqual([]);
});
test('refusal never offers acceptance; manual text stays manual and outside text remains literal',async({page})=>{
 await setup(page,{refused:true});await preview(page);const p=panel(page),fact=p.getByTestId('rewrite-fact-0');
 await expect(fact.getByRole('option',{name:'Принять предложение',exact:true})).toBeDisabled();await expect(fact).toContainText('Модель отказалась');
 await choose(page,'Wrote 8 SQL reports');await expect(p.getByRole('textbox',{name:'Выбранный текст',exact:true})).toHaveValue(rewriteState().original.replace('Built 5 SQL reports','Wrote 8 SQL reports').replace(/\r\n/g,'\n'));
 await expect(p).toContainText('Ручная правка');await expect(p.getByText('Сравнение с предложением',{exact:false})).toHaveCount(0);
});
test('changing manual text revokes all risk/global acknowledgements including an exact undo',async({page})=>{
 await setup(page);await preview(page);await choose(page,'Wrote 8 SQL reports');await acknowledge(page);const p=panel(page);
 await p.getByRole('checkbox',{name:'Подтверждаю проверку выбранного текста',exact:false}).check();
 await p.getByLabel('Ручной текст',{exact:true}).fill('Wrote 9 SQL reports');await expect(p.getByRole('textbox',{name:'Выбранный текст',exact:true})).toBeHidden();
 await p.getByRole('checkbox',{name:'Я проверил решение по этому факту',exact:true}).check();await expect(p.getByRole('textbox',{name:'Выбранный текст',exact:true})).toHaveValue(rewriteState().original.replace('Built 5 SQL reports','Wrote 9 SQL reports').replace(/\r\n/g,'\n'));
 await expect(p.getByRole('checkbox',{name:'Я проверил это изменение',exact:true}).first()).not.toBeChecked();await acknowledge(page);
 await expect(p.getByRole('checkbox',{name:'Подтверждаю проверку выбранного текста',exact:false})).not.toBeChecked();
 await p.getByLabel('Ручной текст',{exact:true}).fill('Wrote 8 SQL reports');await p.getByRole('checkbox',{name:'Я проверил решение по этому факту',exact:true}).check();await acknowledge(page);
 await expect(p.getByRole('checkbox',{name:'Подтверждаю проверку выбранного текста',exact:false})).not.toBeChecked();
});
test('risk acknowledgement removal revokes global consent even when restored',async({page})=>{
 await setup(page);await preview(page);await choose(page);await acknowledge(page);const p=panel(page),global=p.getByRole('checkbox',{name:'Подтверждаю проверку выбранного текста',exact:false});await global.check();const risk=p.getByRole('checkbox',{name:'Я проверил это изменение',exact:true}).first();await risk.uncheck();await risk.check();await expect(global).not.toBeChecked();
});
test('navigation and RU/EN changes preserve manual draft but revoke request consent without network',async({page})=>{
 const s=await setup(page);await preview(page);await choose(page,'Local manual draft 8 SQL reports');await acknowledge(page);
 await page.getByRole('navigation').getByRole('button',{name:'Аналитика',exact:true}).click();await expect(panel(page)).toBeHidden();await page.getByLabel('Fixture language',{exact:true}).selectOption('en');await page.getByRole('navigation').getByRole('button',{name:'Resume editor',exact:true}).click();
 const p=panel(page);await expect(p.getByLabel('Manual text',{exact:true})).toHaveValue('Local manual draft 8 SQL reports');await expect(p.getByRole('checkbox',{name:'I confirm reviewing the chosen text',exact:false})).not.toBeChecked();expect(s.requests.map(r=>r.kind)).toEqual(['preview']);
});
test('unsaved sources pause and retain manual draft; a saved new revision cannot reuse it',async({page})=>{
 const s=await setup(page);await preview(page);await choose(page,'Local retained draft 8 reports');
 await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();await page.locator('#profile-goal').fill('Unsaved goal');await page.getByRole('navigation').getByRole('button',{name:'Редактор резюме',exact:true}).click();
 await expect(panel(page)).toContainText('Действия приостановлены');await expect(panel(page).getByLabel('Ручной текст',{exact:true})).toHaveValue('Local retained draft 8 reports');await expect(panel(page).getByLabel('Ручной текст',{exact:true})).toBeDisabled();
 await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();await page.locator('#profile-save-goal').click();await page.getByRole('navigation').getByRole('button',{name:'Редактор резюме',exact:true}).click();await expect(panel(page)).toContainText('Старый черновик доступен');
 expect(s.requests.map(r=>r.kind)).toEqual(['preview']);expect(s.actions.map(a=>a.action)).toEqual(['goal']);
 await preview(page);await panel(page).getByText('Предыдущий ручной черновик для сравнения',{exact:true}).click();
 await expect(panel(page).locator('details textarea')).toHaveValue('Local retained draft 8 reports');
});
for(const status of [400,401,409,413,429,503,504])test('preview HTTP '+status+' shows only fixed copy and makes no replay',async({page})=>{
 const s=await setup(page,{preview:async route=>route.fulfill({status,json:{error:'PRIVATE_PROVIDER_DIAGNOSTIC',code:'unknown'}})});const p=panel(page);await p.getByRole('checkbox',{name:'Built 5 SQL reports',exact:true}).check();await p.getByRole('checkbox',{name:'Разрешаю отправить',exact:false}).check();await p.getByRole('button',{name:'Получить предложения',exact:true}).click();await expect(p.getByRole('alert')).toBeVisible();await expect(p).not.toContainText('PRIVATE_PROVIDER_DIAGNOSTIC');expect(s.requests).toHaveLength(1);
});
test('wrong-owner successful preview is discarded before rendering foreign text',async({page})=>{
 const s=await setup(page,{preview:async(route,b,state)=>{const f=await rewriteFixture({...state,ownerId:'22222222-2222-4222-8222-222222222222',original:state.original+'\nFOREIGN_PRIVATE'},b.factIds as string[]);await route.fulfill({json:f.response});}});const p=panel(page);await p.getByRole('checkbox',{name:'Built 5 SQL reports',exact:true}).check();await p.getByRole('checkbox',{name:'Разрешаю отправить',exact:false}).check();await p.getByRole('button',{name:'Получить предложения',exact:true}).click();await expect(p.getByRole('alert')).toBeVisible();await expect(p).not.toContainText('FOREIGN_PRIVATE');await expect(p.getByTestId('rewrite-fact-0')).toHaveCount(0);expect(s.requests).toHaveLength(1);
});
test('cancelled held preview cannot replace an existing manual draft or resume after navigation',async({page})=>{
 let count=0,release!:()=>void;const held=new Promise<void>(r=>{release=r;});const s=await setup(page,{preview:async(route,b,state)=>{const f=await rewriteFixture(state,b.factIds as string[]);if(++count===2)await held;await route.fulfill({json:f.response}).catch(()=>{});}});
 await preview(page);await choose(page,'Do not lose this 8-report draft');const p=panel(page);await p.getByRole('checkbox',{name:'Разрешаю отправить',exact:false}).check();await p.getByRole('button',{name:'Получить предложения',exact:true}).click();await expect.poll(()=>s.requests.length).toBe(2);
 await page.getByRole('navigation').getByRole('button',{name:'Аналитика',exact:true}).click();release();await page.getByRole('navigation').getByRole('button',{name:'Редактор резюме',exact:true}).click();await expect(p.getByLabel('Ручной текст',{exact:true})).toHaveValue('Do not lose this 8-report draft');await expect(p.getByRole('checkbox',{name:'Разрешаю отправить',exact:false})).not.toBeChecked();expect(s.requests).toHaveLength(2);
});
test('held confirmation is single-flight and forced edits cannot change submitted intent',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(r=>{release=r;});const s=await setup(page,{review:async(route,b,state)=>{await held;const f=await rewriteFixture(state),{receipt:r,expectedOwnerId:owner,revision:_rev,...c}=b;void _rev;const receipt=await issueRewriteReviewReceipt(owner as string,state,r,c,f.config);await route.fulfill({json:{ownerId:state.ownerId,revision:state.revision,receipt}});}});
 await preview(page);await choose(page,'Submitted 8 SQL reports');await acknowledge(page);const p=panel(page);await p.getByRole('checkbox',{name:'Подтверждаю проверку выбранного текста',exact:false}).check();const submit=p.getByRole('button',{name:'Подтвердить проверку',exact:true});await submit.evaluate((b:HTMLButtonElement)=>{b.click();b.click();});await expect.poll(()=>s.requests.filter(r=>r.kind==='review').length).toBe(1);
 await expect(p.getByLabel('Ручной текст',{exact:true})).toBeDisabled();await p.getByLabel('Ручной текст',{exact:true}).evaluate((a:HTMLTextAreaElement)=>{a.value='Forced wrong 9';a.dispatchEvent(new Event('input',{bubbles:true}));});release();await expect(p.getByRole('status')).toContainText('Подтверждение получено');expect(s.requests.filter(r=>r.kind==='review')).toHaveLength(1);expect(s.requests.at(-1)!.body.decisions).toEqual([{fact_id:'sql',reviewed:true,action:'edit',text:'Submitted 8 SQL reports'}]);expect(s.actions).toEqual([]);
});
test('English mobile review is accessible, remains explicit and never saves a version',async({page})=>{
 const s=await setup(page);await preview(page);await choose(page,'Reviewed 8 SQL reports');await language(page,'en');await page.setViewportSize({width:390,height:844});await expect(panel(page)).toContainText('The model has not been accepted');await expect(panel(page).getByLabel('Manual text',{exact:true})).toHaveValue('Reviewed 8 SQL reports');
 expect((await new AxeBuilder({page}).include('#ai-rewrite-editor').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(s.actions).toEqual([]);await page.screenshot({path:test.info().outputPath('rewrite-review-en-mobile.png'),fullPage:true});
});
for(const mode of ['status201','mime','utf8','oversize'] as const)test('successful transport must still satisfy '+mode,async({page})=>{
 const s=await setup(page,{preview:async(route,b,state)=>{const f=await rewriteFixture(state,b.factIds as string[]);if(mode==='status201')return route.fulfill({status:201,json:f.response});if(mode==='mime')return route.fulfill({contentType:'text/plain',body:JSON.stringify(f.response)});if(mode==='utf8')return route.fulfill({contentType:'application/json',body:Buffer.from([255])});return route.fulfill({contentType:'application/json',body:'x'.repeat(2*1024*1024+1)});}});
 const p=panel(page);await p.getByRole('checkbox',{name:'Built 5 SQL reports',exact:true}).check();await p.getByRole('checkbox',{name:'Разрешаю отправить',exact:false}).check();await p.getByRole('button',{name:'Получить предложения',exact:true}).click();await expect(p.getByRole('alert')).toBeVisible();await expect(p.getByTestId('rewrite-fact-0')).toHaveCount(0);expect(s.requests).toHaveLength(1);
});
test('deadline aborts a held request without a late preview or automatic retry',async({page})=>{
 await page.clock.install();let release!:()=>void;const held=new Promise<void>(r=>{release=r;});const s=await setup(page,{preview:async(route,b,state)=>{const f=await rewriteFixture(state,b.factIds as string[]);await held;await route.fulfill({json:f.response}).catch(()=>{});}});
 const p=panel(page);await p.getByRole('checkbox',{name:'Built 5 SQL reports',exact:true}).check();await p.getByRole('checkbox',{name:'Разрешаю отправить',exact:false}).check();await p.getByRole('button',{name:'Получить предложения',exact:true}).click();await expect.poll(()=>s.requests.length).toBe(1);await page.clock.fastForward(26000);await expect(p.getByRole('alert')).toContainText('прерван');release();await expect(p.getByTestId('rewrite-fact-0')).toHaveCount(0);expect(s.requests).toHaveLength(1);
});
test('expired preview disables review and retains manual text without transmitting it',async({page})=>{
 await page.clock.install();const s=await setup(page);await preview(page);await choose(page,'Expired but retained 8 SQL reports');await acknowledge(page);await page.clock.fastForward(601000);
 const p=panel(page);await expect(p).toContainText('Срок предпросмотра истёк');await expect(p.getByLabel('Ручной текст',{exact:true})).toHaveValue('Expired but retained 8 SQL reports');await expect(p.getByLabel('Ручной текст',{exact:true})).toBeDisabled();await expect(p.getByRole('button',{name:'Подтвердить проверку',exact:true})).toHaveCount(0);expect(s.requests.map(r=>r.kind)).toEqual(['preview']);
});
test('UI language changes during inference preserve captured output language and consent intent',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(r=>{release=r;});const s=await setup(page,{preview:async(route,b,state)=>{const f=await rewriteFixture(state,b.factIds as string[],b.requestedLanguage==='en'?'en':'ru');await held;await route.fulfill({json:f.response});}});
 const p=panel(page);await p.getByRole('checkbox',{name:'Built 5 SQL reports',exact:true}).check();await p.getByRole('checkbox',{name:'Разрешаю отправить',exact:false}).check();await p.getByRole('button',{name:'Получить предложения',exact:true}).click();await expect.poll(()=>s.requests.length).toBe(1);await language(page,'en');release();await expect(p.getByTestId('rewrite-fact-0')).toBeVisible();await expect(p.getByLabel('Language of selected proposals',{exact:true})).toHaveValue('ru');expect(s.requests[0].body.requestedLanguage).toBe('ru');expect(s.requests).toHaveLength(1);
});
test('tampered confirmation never produces a confirmed status or replaces the chosen text',async({page})=>{
 const s=await setup(page,{review:async(route,b,state)=>{const f=await rewriteFixture(state),{receipt:r,expectedOwnerId:owner,revision:_rev,...confirmation}=b;void _rev;const receipt=await issueRewriteReviewReceipt(owner as string,state,r,confirmation,f.config),payload=JSON.parse(receipt.payload);payload.review.text+='PRIVATE_INJECTION';await route.fulfill({json:{ownerId:state.ownerId,revision:state.revision,receipt:{...receipt,payload:JSON.stringify(payload)}}});}});
 await preview(page);await choose(page);await acknowledge(page);const p=panel(page);await p.getByRole('checkbox',{name:'Подтверждаю проверку выбранного текста',exact:false}).check();await p.getByRole('button',{name:'Подтвердить проверку',exact:true}).click();await expect(p.getByRole('alert')).toBeVisible();await expect(p).not.toContainText('Подтверждение получено');await expect(p).not.toContainText('PRIVATE_INJECTION');expect(s.requests.map(r=>r.kind)).toEqual(['preview','review']);expect(s.actions).toEqual([]);
});
test('signing out removes the owner-bound manual draft without persistent browser storage',async({page})=>{
 const s=await setup(page);await preview(page);await choose(page,'OWNER_BOUND_LOCAL_CANARY 8 reports');await page.getByRole('button',{name:'Выйти',exact:true}).click();await expect(panel(page)).toHaveCount(0);await expect(page.getByText('OWNER_BOUND_LOCAL_CANARY',{exact:false})).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]))).not.toContain('OWNER_BOUND_LOCAL_CANARY');expect(s.actions.map(a=>a.action)).toEqual(['logout']);
});
