import {test,expect} from '@playwright/test';
test('mobile tracker combines filters, resets and does not write on search',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);await page.setViewportSize({width:390,height:844});let writes=0;
 const created='2026-10-25T00:00:00Z';const state={revision:1,original:'SQL',vacancy:'SQL',goal:'',facts:[],versions:[{id:'v1',created,text:'SQL',vacancy:'SQL',score:50,evidence_ids:[]}],applications:[{id:'a',title:'Аналитик Орёл',note:'Обсудить SQL',status:'Интервью',created,resumeVersionId:'v1',events:[]},{id:'b',title:'Менеджер B2B',note:'Позвонить рекрутеру',status:'Планируется',created,events:[]}]};
 await page.route('**/api/service',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({json:state});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();
 const list=page.getByRole('region',{name:'Найти отклик'});await expect(list.getByRole('status')).toHaveText('Показано 2 из 2');
 await page.getByLabel('Поиск по вакансии и сохраненным заметкам').fill('ОРЕЛ sql');await expect(list.getByRole('heading',{name:'Аналитик Орёл'})).toBeVisible();await expect(list.getByRole('heading',{name:'Менеджер B2B'})).toBeHidden();
 await page.getByLabel('Фильтр по статусу').selectOption('Планируется');await expect(list.getByText('По этим фильтрам ничего не найдено.')).toBeVisible();
 await page.getByRole('button',{name:'Сбросить фильтры'}).click();await page.getByLabel('Фильтр по версии резюме').selectOption('unlinked');await expect(list.getByRole('status')).toHaveText('Показано 1 из 2');await expect(list.getByRole('heading',{name:'Менеджер B2B'})).toBeVisible();
 await page.getByLabel('Фильтр по версии резюме').selectOption('v1');await expect(list.getByRole('heading',{name:'Аналитик Орёл'})).toBeVisible();expect(writes).toBe(0);
 await page.getByRole('button',{name:'Сбросить фильтры'}).click();await expect(list.getByRole('status')).toHaveText('Показано 2 из 2');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
