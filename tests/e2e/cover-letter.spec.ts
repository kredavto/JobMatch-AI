import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {match,parseVacancy,propose} from '../../lib/engine';
test('letter requires review, resets approval after editing and exports exact draft',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);await page.setViewportSize({width:390,height:844});let writes=0;
 const state={revision:1,original:'SQL\nPython',vacancy:'Требования:\nSQL\nPython',goal:'',facts:[{id:'e1',text:'SQL',source:'Демо',verified:true},{id:'e2',text:'Python',source:'Демо',verified:false}],versions:[],applications:[]};
 await page.route('**/api/service',r=>{if(r.request().method()==='GET')return r.fulfill({json:state});if(r.request().postDataJSON().action!=='analyze')writes++;const req=parseVacancy(state.vacancy);return r.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →'}).click();
 const panel=page.getByRole('region',{name:'Сопроводительное письмо'});
 await expect(panel.getByRole('button',{name:'Подготовить черновик письма'})).toBeDisabled();await panel.getByRole('checkbox',{name:/SQL/}).check();await panel.getByRole('button',{name:'Подготовить черновик письма'}).click();
 const draft=panel.getByLabel('Текст сопроводительного письма'),downloadButton=panel.getByRole('button',{name:'Скачать письмо (TXT)'});const original=await draft.inputValue();expect(original).toContain('\n\nSQL\n\n');expect(original).not.toContain('Python');await expect(downloadButton).toBeDisabled();
 const approval=panel.getByRole('checkbox',{name:'Я проверил письмо, факты и формулировки о своих намерениях'});await approval.check();await draft.fill(original+'\nМой ручной текст.');await expect(approval).not.toBeChecked();await expect(downloadButton).toBeDisabled();await expect(panel.getByText(/Новые формулировки не проверены/)).toBeVisible();
 await approval.check();await panel.getByRole('checkbox',{name:'Я просмотрел(а) изменение 1',exact:true}).check();const pending=page.waitForEvent('download');await downloadButton.click();const file=await pending;expect(await readFile((await file.path())!,'utf8')).toBe(original+'\nМой ручной текст.');
 await panel.getByRole('button',{name:'Восстановить шаблон письма'}).click();await expect(draft).toHaveValue(original);await expect(approval).not.toBeChecked();
 expect((await new AxeBuilder({page}).include('[aria-label="Сопроводительное письмо"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await panel.getByLabel('Стиль письма').selectOption('executive');await expect(draft).toHaveCount(0);await panel.getByRole('button',{name:'Подготовить черновик письма'}).click();await expect(draft).not.toHaveValue(original);expect(writes).toBe(0);
});
