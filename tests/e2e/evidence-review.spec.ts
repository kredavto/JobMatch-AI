import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {match,parseVacancy,propose} from '../../lib/engine';
test('contradictory evidence requires clarification and cannot enter letter',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);await page.setViewportSize({width:390,height:844});
 const state={revision:1,original:'SQL\nНе работал с SQL',vacancy:'Требования:\nSQL',goal:'',facts:[{id:'e1',text:'SQL',source:'Демо',verified:true},{id:'e2',text:'Не работал с SQL',source:'Демо',verified:true}],versions:[],applications:[]};let writes=0;
 await page.route('**/api/service',r=>{if(r.request().method()==='GET')return r.fulfill({json:state});if(r.request().postDataJSON().action!=='analyze')writes++;const req=parseVacancy(state.vacancy);return r.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →'}).click();
 await expect(page.getByRole('table')).toContainText('Уточните противоречие');
 const review=page.getByRole('region',{name:'Уточнение доказательств'});await review.locator('summary').click();await expect(review.getByText(/Есть отрицание/)).toBeVisible();
 await expect(page.getByRole('region',{name:'Сопроводительное письмо'}).getByRole('button',{name:'Подготовить черновик письма'})).toBeDisabled();
 expect((await new AxeBuilder({page}).include('[aria-label="Уточнение доказательств"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await review.getByRole('button',{name:'Уточнить факты в профиле'}).click();await expect(page.getByLabel('Проверьте текст после импорта')).toHaveValue(state.original);expect(writes).toBe(0);
});
