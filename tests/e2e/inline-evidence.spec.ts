import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {match,parseVacancy,propose,renderVersion} from '../../lib/engine';
import type {Workspace} from '../../lib/db';
const fixture=():Workspace=>({revision:1,original:'Вела корпоративные продажи B2B.\nГотовила отчеты в Excel.',vacancy:'Требования:\nB2B',goal:'',facts:[{id:'e1',text:'Вела корпоративные продажи B2B.',source:'Вымышленный пример',verified:false},{id:'e2',text:'Готовила отчеты в Excel.',source:'Вымышленный пример',verified:false}],versions:[],applications:[]});
async function openAnalysis(page:import('@playwright/test').Page){
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →'}).click();
}
test('explicit inline confirmation recalculates score and saves a separate downloadable version',async({page})=>{
 let state=fixture();const actions:string[]=[];
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const body=route.request().postDataJSON();actions.push(body.action);expect(body.revision).toBe(state.revision);
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
 await page.getByRole('button',{name:'Подтвердить факт e1',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Match Score:'})).toContainText('Match Score: 0 → 100');
 await expect(page.locator('.stats article').first()).toContainText('100 / 100');
 expect(actions).toEqual(['analyze','verify','analyze']);expect(state.facts[1].verified).toBe(false);
 await page.getByRole('button',{name:'Принять все подтвержденные'}).click();
 await page.getByRole('button',{name:'Подтверждаю · сохранить версию'}).click();
 await expect(page.getByRole('heading',{name:'История резюме'})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать TXT',exact:true}).click();expect((await download).suggestedFilename()).toBe('jobmatch-resume.txt');
 expect(state.original).toBe(fixture().original);expect(state.versions[0].text).toContain('РЕЛЕВАНТНЫЙ ОПЫТ');
 await page.reload();await page.getByRole('navigation').getByRole('button',{name:'Мои версии',exact:true}).click();await expect(page.getByRole('button',{name:'Скачать TXT',exact:true})).toBeVisible();
});
for(const status of [409,503])test('failed confirmation '+status+' never raises score or retries',async({page})=>{
 const state=fixture();const actions:string[]=[];
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const b=route.request().postDataJSON();actions.push(b.action);
  if(b.action==='verify')return route.fulfill({status,json:{error:'Подтверждение не выполнено'}});
  const req=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});
 });
 await openAnalysis(page);await page.getByText('Найдено в резюме, но не подтверждено (1)',{exact:true}).click();await page.getByRole('button',{name:'Подтвердить факт e1',exact:true}).click();
 await expect(page.locator('main').getByRole('alert')).toContainText('Подтверждение не выполнено');await expect(page.locator('.stats article').first()).toContainText('0 / 100');expect(actions).toEqual(['analyze','verify']);expect(state.facts[0].verified).toBe(false);
});
