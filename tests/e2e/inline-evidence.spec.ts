import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {match,parseVacancy,propose,renderVersion} from '../../lib/engine';
import type {Workspace} from '../../lib/db';
import {editorCopy} from '../../lib/i18n/editor';
import {requirementEvidenceCopy} from '../../lib/i18n/requirement-evidence';
import {workspaceFeedbackCopy} from '../../lib/i18n/workspace-feedback';
import {ru,en} from '../../lib/i18n';
import {workspaceShellCopy} from '../../lib/i18n/workspace-shell';
import {apiErrors} from '../../lib/i18n/api-errors';
import {readFile} from 'node:fs/promises';
const ownerId='11111111-1111-4111-8111-111111111111';
const fixture=():Workspace=>({ownerId,revision:1,original:'Вела корпоративные продажи B2B.\nГотовила отчеты в Excel.',vacancy:'Требования:\nB2B',goal:'',facts:[{id:'e1',text:'Вела корпоративные продажи B2B.',source:'Вымышленный пример',verified:false},{id:'e2',text:'Готовила отчеты в Excel.',source:'Вымышленный пример',verified:false}],versions:[],applications:[]});
async function openAnalysis(page:import('@playwright/test').Page){
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →'}).click();
}
test('explicit inline confirmation recalculates score and saves a separate downloadable version',async({page})=>{
 let state=fixture();const actions:string[]=[];
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const body=route.request().postDataJSON();actions.push(body.action);expect(body.revision).toBe(state.revision);expect(body.expectedOwnerId).toBe(ownerId);
  if(body.action==='verify'){expect(body.ids).toEqual(['e1']);expect(body.verified).toBe(true);state={...state,revision:state.revision+1,facts:state.facts.map(f=>f.id==='e1'?{...f,verified:true}:f)};return route.fulfill({json:state});}
  const requirements=parseVacancy(state.vacancy);
  if(body.action==='analyze')return route.fulfill({json:{analysis:match(state.facts,requirements),edits:propose(state.facts,requirements)}});
  if(body.action==='version'){const edits=propose(state.facts,requirements).filter(e=>body.ids.includes(e.id));state={...state,revision:state.revision+1,versions:[{id:'v1',created:'2026-10-30T08:00:00Z',text:renderVersion(state.original,edits,state.facts),vacancy:state.vacancy,evidence_ids:['e1'],score:match(state.facts,requirements).score}]};return route.fulfill({json:state});}
  return route.fulfill({status:400,json:{error:'Unexpected action'}});
 });
 await page.setViewportSize({width:390,height:844});await openAnalysis(page);
 await expect(page.locator('.stats article').first()).toContainText('0 / 100');
 await page.getByText('Найдено в резюме, но не подтверждено (1)',{exact:true}).click();
 await expect(page.getByRole('table')).toContainText('Вела корпоративные продажи B2B.');expect(actions).toEqual(['analyze']);
 expect((await new AxeBuilder({page}).include('table').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.getByRole('button',{name:'Подтвердить весь факт e1 для требования req-2',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Match Score:'})).toContainText('Match Score: 0 → 100');
 await expect(page.locator('.stats article').first()).toContainText('100 / 100');
 expect(actions).toEqual(['analyze','verify','analyze']);expect(state.facts[1].verified).toBe(false);
 await page.getByRole('button',{name:'Принять все подтвержденные'}).click();
 await page.getByRole('button',{name:'Подтверждаю · сохранить версию'}).click();
 await expect(page.getByRole('heading',{name:'История резюме'})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать TXT',exact:true}).click();const downloaded=await download;expect(downloaded.suggestedFilename()).toBe('jobmatch-resume.txt');expect(await readFile((await downloaded.path())!,'utf8')).toBe(state.versions[0].text);
 expect(state.original).toBe(fixture().original);expect(state.versions[0].text).toContain('РЕЛЕВАНТНЫЙ ОПЫТ');
 await page.reload();await page.getByRole('navigation').getByRole('button',{name:'Мои версии',exact:true}).click();await expect(page.getByRole('button',{name:'Скачать TXT',exact:true})).toBeVisible();
});
for(const status of [409,503])test('failed confirmation '+status+' never raises score or retries',async({page})=>{
 const state=fixture();const actions:string[]=[];
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const b=route.request().postDataJSON();actions.push(b.action);
  if(b.action==='verify')return route.fulfill({status,json:{code:status===409?'REVISION_CONFLICT':'UPSTREAM_UNAVAILABLE',error:'PRIVATE_RAW'}});
  const req=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});
 });
 await openAnalysis(page);await page.getByText('Найдено в резюме, но не подтверждено (1)',{exact:true}).click();await page.getByRole('button',{name:'Подтвердить весь факт e1 для требования req-2',exact:true}).click();
 await expect(page.locator('main').getByRole('alert')).toContainText(status===409?apiErrors.REVISION_CONFLICT.ru:apiErrors.UPSTREAM_UNAVAILABLE.ru);await expect(page.locator('.stats article').first()).toContainText('0 / 100');expect(actions).toEqual(['analyze','verify']);expect(state.facts[0].verified).toBe(false);
});

test('English inline review preserves expansion and pending outcome across a locale switch without replay',async({page,baseURL})=>{
 let state=fixture();const actions:string[]=[];let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.context().addCookies([{name:'jobmatch-ui-locale',value:'en',url:baseURL!}]);
 await page.route('**/api/service',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const body=route.request().postDataJSON();actions.push(body.action);expect(body.revision).toBe(state.revision);expect(body.expectedOwnerId).toBe(ownerId);
  if(body.action==='verify'){await held;expect(body.ids).toEqual(['e1']);state={...state,revision:2,facts:state.facts.map(fact=>fact.id==='e1'?{...fact,verified:true}:fact)};return route.fulfill({json:state});}
  const req=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});
 });
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('navigation').getByRole('button',{name:en.navigation.vacancy,exact:true}).click();await page.getByRole('button',{name:'Analyze →',exact:true}).click();
 const t=requirementEvidenceCopy.en;await page.getByText(t.candidates(1),{exact:true}).click();await expect(page.getByText(t.help,{exact:true})).toBeVisible();
 expect((await new AxeBuilder({page}).include('table').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const confirmBox=await page.getByRole('button',{name:t.confirmLabel('e1','req-2'),exact:true}).boundingBox();expect(confirmBox).not.toBeNull();expect(confirmBox!.height).toBeLessThanOrEqual(88);expect(confirmBox!.width).toBeGreaterThanOrEqual(160);
 const jpeg=await page.getByRole('region',{name:editorCopy.en.region,exact:true}).screenshot({type:'jpeg',quality:45});console.log('JOBMATCH_SYNTHETIC_INLINE_EN_JPEG '+jpeg.toString('base64'));
 await page.getByRole('combobox').first().selectOption('ru');await expect(page.getByText(requirementEvidenceCopy.ru.help,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:requirementEvidenceCopy.ru.confirmLabel('e1','req-2'),exact:true}).click();await expect.poll(()=>actions.filter(action=>action==='verify').length).toBe(1);
 await page.getByRole('combobox').first().selectOption('en');release();
 await expect(page.getByRole('status').filter({hasText:'Fact confirmed.'})).toContainText('Match Score: 0 → 100');
 await expect(page.getByRole('table')).toContainText('Вела корпоративные продажи B2B.');await expect(page.getByRole('table')).toContainText(t.confirmed);
 expect(actions).toEqual(['analyze','verify','analyze']);expect(state.facts[1].verified).toBe(false);
});
test('late saved confirmation keeps a newer source draft and navigation and defers analysis',async({page})=>{
 let state=fixture();const actions:string[]=[];let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/service',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const body=route.request().postDataJSON();actions.push(body.action);
  if(body.action==='verify'){await held;state={...state,revision:2,facts:state.facts.map(fact=>fact.id==='e1'?{...fact,verified:true}:fact)};return route.fulfill({json:state});}
  const req=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});
 });
 await openAnalysis(page);await page.getByText(requirementEvidenceCopy.ru.candidates(1),{exact:true}).click();await page.getByRole('button',{name:requirementEvidenceCopy.ru.confirmLabel('e1','req-2'),exact:true}).click();
 await expect.poll(()=>actions.filter(action=>action==='verify').length).toBe(1);
 await page.getByRole('navigation').getByRole('button',{name:ru.navigation.profile,exact:true}).click();
 const draft=fixture().original+'\nLATER DRAFT 😀';await page.getByRole('textbox',{name:'Проверьте текст после импорта',exact:true}).fill(draft);
 release();await expect(page.getByRole('status').filter({hasText:workspaceFeedbackCopy.ru.notices.factConfirmedPending})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Проверьте текст после импорта',exact:true})).toHaveValue(draft);
 await expect(page.getByRole('heading',{level:1,name:ru.navigation.profile,exact:true})).toBeVisible();expect(actions).toEqual(['analyze','verify']);expect(state.facts[0].verified).toBe(true);
});
for(const problem of ['outage','tampered'] as const)test('confirmed fact remains explicit when reanalysis fails: '+problem,async({page})=>{
 let state=fixture(),analyses=0;const actions:string[]=[];
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const body=route.request().postDataJSON();actions.push(body.action);expect(body.revision).toBe(state.revision);
  if(body.action==='verify'){state={...state,revision:2,facts:state.facts.map(fact=>fact.id==='e1'?{...fact,verified:true}:fact)};return route.fulfill({json:state});}
  analyses++;const req=parseVacancy(state.vacancy),result={analysis:match(state.facts,req),edits:propose(state.facts,req)};
  if(analyses===2){if(problem==='outage')return route.fulfill({status:503,json:{code:'UPSTREAM_UNAVAILABLE',error:'PRIVATE_RAW'}});result.analysis.score=99;}
  return route.fulfill({json:result});
 });
 await openAnalysis(page);await page.getByText(requirementEvidenceCopy.ru.candidates(1),{exact:true}).click();await page.getByRole('button',{name:requirementEvidenceCopy.ru.confirmLabel('e1','req-2'),exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:workspaceFeedbackCopy.ru.notices.factConfirmedPending})).toBeVisible();await expect(page.locator('main').getByRole('alert').first()).toBeVisible();await expect(page.locator('main')).not.toContainText('PRIVATE_RAW');
 await expect(page.getByRole('heading',{name:editorCopy.ru.emptyTitle,exact:true})).toBeVisible();expect(state.facts[0].verified).toBe(true);expect(actions).toEqual(['analyze','verify','analyze']);
 await page.getByRole('button',{name:workspaceShellCopy.ru.syncLoad,exact:true}).click();
 await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →',exact:true}).click();await expect(page.locator('.stats article').first()).toContainText('100 / 100');expect(actions).toEqual(['analyze','verify','analyze','analyze']);
});
for(const problem of ['owner','other-fact'] as const)test('unrelated acknowledgement '+problem+' cannot install confirmation or trigger analysis',async({page})=>{
 const state=fixture();const actions:string[]=[];
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const body=route.request().postDataJSON();actions.push(body.action);
  if(body.action==='verify'){const saved={...state,revision:2,ownerId:problem==='owner'?'22222222-2222-4222-8222-222222222222':ownerId,facts:state.facts.map(fact=>({...fact,verified:problem==='other-fact'||fact.id==='e1'}))};return route.fulfill({json:saved});}
  const req=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});
 });
 await openAnalysis(page);await page.getByText(requirementEvidenceCopy.ru.candidates(1),{exact:true}).click();await page.getByRole('button',{name:requirementEvidenceCopy.ru.confirmLabel('e1','req-2'),exact:true}).click();
 await expect(page.locator('main').getByRole('alert').first()).toBeVisible();await expect(page.locator('.stats article').first()).toContainText('0 / 100');expect(actions).toEqual(['analyze','verify']);expect(state.facts.every(fact=>!fact.verified)).toBe(true);
 await expect(page.getByRole('button',{name:requirementEvidenceCopy.ru.confirmLabel('e1','req-2'),exact:true})).toBeDisabled();
});
test('dirty sources and unknown owner disable inline confirmation without a write',async({page})=>{
 const state=fixture();let known=true;const actions:string[]=[];
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET'){const snapshot={...state};if(!known)delete snapshot.ownerId;return route.fulfill({json:snapshot});}
  const body=route.request().postDataJSON();actions.push(body.action);const req=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});
 });
 await openAnalysis(page);await page.getByRole('navigation').getByRole('button',{name:ru.navigation.profile,exact:true}).click();await page.getByRole('textbox',{name:'Проверьте текст после импорта',exact:true}).fill(state.original+'\nUNSAVED');
 await page.getByRole('navigation').getByRole('button',{name:ru.navigation.editor,exact:true}).click();await page.getByText(requirementEvidenceCopy.ru.candidates(1),{exact:true}).click();await expect(page.getByRole('button',{name:requirementEvidenceCopy.ru.confirmLabel('e1','req-2'),exact:true})).toBeDisabled();
 known=false;await openAnalysis(page);await page.getByText(requirementEvidenceCopy.ru.candidates(1),{exact:true}).click();await expect(page.getByText(requirementEvidenceCopy.ru.ownerHelp,{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:requirementEvidenceCopy.ru.confirmLabel('e1','req-2'),exact:true})).toBeDisabled();expect(actions).toEqual(['analyze','analyze']);
});
