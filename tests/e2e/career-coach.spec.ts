import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {match,parseVacancy,propose} from '../../lib/engine';
test('career plan filters gaps, exports evidence and never writes facts',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);
 await page.setViewportSize({width:390,height:844});let writes=0;
 const workspace={revision:1,original:'SQL',vacancy:'Требования:\nSQL\nPython',goal:'',facts:[{id:'ev1',text:'SQL',source:'Демо',verified:true}],versions:[],applications:[]};
 await page.route('**/api/service',r=>{if(r.request().method()==='GET')return r.fulfill({json:workspace});if(r.request().postDataJSON().action!=='analyze')writes++;const requirements=parseVacancy(workspace.vacancy);return r.fulfill({json:{analysis:match(workspace.facts,requirements),edits:propose(workspace.facts,requirements)}});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →'}).click();
 const panel=page.getByRole('region',{name:'Карьерный помощник'});
 await expect(panel.getByRole('status')).toHaveText('Показано: 2 из 2');
 await panel.getByLabel('Показать требования').selectOption('unconfirmed');
 await panel.locator('summary').click();await expect(panel.getByText(/Создайте небольшой скрипт/)).toBeVisible();
 const pending=page.waitForEvent('download');await panel.getByRole('button',{name:'Скачать план подготовки (TXT)'}).click();const download=await pending;const text=await readFile((await download.path())!,'utf8');expect(text).toContain('Требование: Python');expect(text).not.toContain('Требование: SQL');expect(text).toContain('Не подтверждено');
 await panel.getByLabel('Показать требования').selectOption('supported');await panel.locator('summary').click();await expect(panel.getByText(/Evidence: ev1/)).toBeVisible();
 expect((await new AxeBuilder({page}).include('[aria-label="Карьерный помощник"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await panel.getByRole('button',{name:'Добавить уточнение в профиль'}).click();await expect(page.getByLabel('Уточнение или дополнительный факт')).toBeVisible();expect(writes).toBe(0);
});
