import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {match,parseVacancy,propose} from '../../lib/engine';
const facts=[{id:'ev-1',text:'SQL',source:'Вымышленный пример',verified:true}];
const workspace={revision:1,original:'SQL',vacancy:'Обязательные требования:\nSQL\nPython',goal:'Аналитик',facts,versions:[{id:'v1',created:'2026-10-25T10:00:00Z',text:'SQL',vacancy:'SQL',evidence_ids:['ev-1'],evidence_snapshot:facts,score:50}],applications:[{id:'a1',title:'Вымышленная вакансия',status:'Приглашение',note:'Демо',created:'2026-10-25T10:00:00Z',resumeVersionId:'v1',events:[{status:'Приглашение',date:'2026-10-25T10:00:00Z'}]}]};
async function audit(page:import('@playwright/test').Page){
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
}
test('login supports skip navigation and automated accessibility checks',async({page})=>{
 await page.route('**/api/service',r=>r.fulfill({status:401,json:{error:'Войдите'}}));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Создать аккаунт'})).toBeVisible();
 await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Перейти к содержимому'})).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.getByRole('main')).toBeFocused();await audit(page);
});
for(const width of [1280,390])test('workspace accessibility and keyboard navigation at '+width,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.route('**/api/service',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:workspace});
  const requirements=parseVacancy(workspace.vacancy);
  return r.fulfill({json:{analysis:match(facts,requirements),edits:propose(facts,requirements)}});
 });
 await page.goto('/');await expect(page.getByRole('heading',{name:'Следующий шаг в карьере'})).toBeFocused();await audit(page);
 for(const tab of ['Мой профиль','Анализ вакансии','Редактор резюме','Мои версии','Отклики','Аналитика','Настройки']){
  const button=page.getByRole('navigation').getByRole('button',{name:tab,exact:true});
  await button.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:tab,exact:true})).toBeFocused();await audit(page);
 }
 await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();
 await page.getByRole('button',{name:/Проанализировать/}).click();
 await expect(page.getByRole('table')).toBeVisible();await audit(page);
 if(width===390){
  const region=page.getByRole('region',{name:'Таблица соответствия, горизонтальная прокрутка'});
  await region.focus();await page.keyboard.press('ArrowRight');
  await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 }
 await page.screenshot({path:'/tmp/jobmatch-accessibility-'+width+'.png',fullPage:true});
});
