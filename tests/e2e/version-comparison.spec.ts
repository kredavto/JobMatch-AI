import {test,expect} from '@playwright/test';
test('compares saved versions on mobile without edits or misleading score delta',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);await page.setViewportSize({width:390,height:844});let writes=0;
 const base={created:'2026-10-26T00:00:00Z',evidence_ids:[],score:50};
 const state={revision:1,original:'SQL',vacancy:'SQL',goal:'',facts:[],applications:[],versions:[{...base,id:'one',text:'SQL\nPython',vacancy:'SQL'},{...base,id:'two',text:'Python\nSQL\nExcel',vacancy:'Excel',score:70}]};
 await page.route('**/api/service',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({json:state});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мои версии',exact:true}).click();
 const panel=page.getByRole('region',{name:'Сравнение версий',exact:true});await expect(panel.getByText(/Разницу баллов не интерпретируем/)).toBeVisible();await expect(panel.getByText('Версии подготовлены для разных текстов вакансий.')).toBeVisible();
 const diff=panel.getByRole('region',{name:'Изменения текста'});await expect(diff.locator('.diff-added')).toContainText(['SQL','Excel']);await expect(diff.locator('.diff-removed')).toContainText(['SQL']);
 await page.getByLabel('Сравниваемая версия',{exact:true}).selectOption('one');await expect(panel.getByText('Выбрана одна и та же версия.')).toBeVisible();await expect(diff).toHaveCount(0);
 await page.getByLabel('Исходная версия',{exact:true}).selectOption('two');await expect(panel.getByRole('region',{name:'Изменения текста'})).toBeVisible();expect(writes).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
