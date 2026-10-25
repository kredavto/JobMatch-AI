import {test,expect} from '@playwright/test';
const initial={revision:1,original:'SQL',vacancy:'SQL',goal:'Аналитик',facts:[],versions:[],applications:[]};
for(const status of [403,408,429])test('definitive '+status+' rejection preserves draft without automatic retry',async({page})=>{
 let writes=0;
 await page.route('**/api/service',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:initial});
  writes++;return r.fulfill({status,json:{error:status===408?'Время загрузки истекло. Повторите попытку.':status===429?'Лимит запросов. Повторите позже.':'Доступ запрещен.'}});
 });
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 const field=page.getByLabel('Проверьте текст после импорта');await field.fill('Несохраненный текст');
 await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();
 await expect(page.locator('.error')).toContainText(status===408?'Время загрузки истекло':status===429?'Лимит запросов':'Доступ запрещен');
 await expect(field).toHaveValue('Несохраненный текст');
 await page.getByRole('navigation').getByRole('button',{name:'Обзор',exact:true}).click();
 await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 expect(writes).toBe(1);await expect(field).toHaveValue('Несохраненный текст');
});
test('malformed read offers retry instead of rendering an invalid workspace',async({page})=>{
 let bad=true;
 await page.route('**/api/service',r=>r.fulfill({json:bad?{...initial,facts:[{id:'bad',text:null,verified:true}]}:initial}));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Не удалось загрузить рабочее пространство'})).toBeVisible();
 bad=false;await page.getByRole('button',{name:'Повторить загрузку'}).click();await expect(page.getByRole('heading',{name:'Следующий шаг в карьере'})).toBeVisible();
});
test('malformed write response freezes further writes until explicit reload',async({page})=>{
 let writes=0;
 await page.route('**/api/service',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:initial});
  writes++;return r.fulfill({json:{...initial,revision:2,versions:[{id:'broken'}]}});
 });
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 const field=page.getByLabel('Проверьте текст после импорта');await field.fill('Черновик сохранен в памяти');
 await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();
 await expect(page.getByRole('button',{name:'Загрузить актуальные данные'})).toBeVisible();
 await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();expect(writes).toBe(1);
 await page.getByRole('button',{name:'Загрузить актуальные данные'}).click();
 await expect(field).toHaveValue('Черновик сохранен в памяти');
});
test('malformed extraction response never replaces the open resume draft',async({page})=>{
 let writes=0;
 await page.route('**/api/service',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({json:initial});});
 await page.route('**/api/import',r=>r.fulfill({json:{text:{unexpected:'schema'}}}));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 const field=page.getByLabel('Проверьте текст после импорта');await field.fill('Важный несохраненный текст');
 await page.getByLabel('Загрузить TXT, DOCX, PDF · до 4 МБ').setInputFiles({name:'fixture.txt',mimeType:'text/plain',buffer:Buffer.from('SQL')});
 await expect(page.locator('.error')).toContainText('Некорректный ответ импорта');
 await expect(field).toHaveValue('Важный несохраненный текст');expect(writes).toBe(0);
});
