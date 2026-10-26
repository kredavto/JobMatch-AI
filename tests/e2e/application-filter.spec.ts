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
test('note drafts survive filtering, tab changes and failed writes; save is explicit',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);let writes=0;let failed=true;
 const state={revision:1,original:'SQL',vacancy:'SQL',goal:'',facts:[],versions:[],applications:[{id:'a',title:'Аналитик',note:'Исходная заметка',status:'Планируется',created:'2026-10-26T00:00:00Z',events:[]}]};
 await page.route('**/api/service',async r=>{if(r.request().method()==='GET')return r.fulfill({json:state});writes++;if(failed)return r.fulfill({status:429,json:{error:'Лимит запросов'}});const body=r.request().postDataJSON();expect(body.note).toBe('Черновик заметки');state.applications[0].note=body.note;state.revision++;return r.fulfill({json:state});});
 await page.goto('/');const nav=page.getByRole('navigation');await nav.getByRole('button',{name:'Отклики',exact:true}).click();await page.getByLabel('Заметки',{exact:true}).fill('Черновик заметки');
 await page.getByLabel('Поиск по вакансии и сохраненным заметкам').fill('нет совпадения');await page.getByRole('button',{name:'Сбросить фильтры'}).click();await expect(page.getByLabel('Заметки',{exact:true})).toHaveValue('Черновик заметки');expect(writes).toBe(0);
 await nav.getByRole('button',{name:'Обзор',exact:true}).click();await nav.getByRole('button',{name:'Отклики',exact:true}).click();await expect(page.getByLabel('Заметки',{exact:true})).toHaveValue('Черновик заметки');await expect(page.getByLabel('Статус',{exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Сохранить заметку',exact:true}).click();await expect(page.locator('.error')).toContainText('Лимит');await expect(page.getByLabel('Заметки',{exact:true})).toHaveValue('Черновик заметки');expect(writes).toBe(1);
 failed=false;await page.getByRole('button',{name:'Сохранить заметку',exact:true}).click();await expect(page.getByRole('button',{name:'Сохранить заметку',exact:true})).toHaveCount(0);await expect(page.getByLabel('Статус',{exact:true})).toBeEnabled();expect(writes).toBe(2);
});
