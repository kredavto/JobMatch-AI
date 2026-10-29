import {test,expect} from '@playwright/test';
test('recovery request is explicit and does not expose account existence',async({page})=>{
 let calls=0;await page.route('**/api/recovery',r=>{calls++;return r.fulfill({json:{ok:true}});});
 await page.goto('/recover');await page.getByLabel('Электронная почта').fill('fixture@example.test');expect(calls).toBe(0);await page.getByRole('button',{name:'Получить письмо'}).click();await expect(page.getByRole('status')).toContainText('Если для адреса');expect(calls).toBe(1);
});
test('recovery checks code explicitly, clears URL and validates repeated password',async({page})=>{
 const actions:string[]=[];await page.route('**/api/recovery',r=>{const body=r.request().postDataJSON();actions.push(body.action);return r.fulfill({json:body.action==='update'?{ok:true,sessionsRevoked:true}:{ok:true}});});
 await page.setViewportSize({width:390,height:844});await page.goto('/recover?code=synthetic-fixture');await expect(page).toHaveURL(/\/recover$/);expect(actions).toEqual([]);
 await page.getByRole('button',{name:'Проверить ссылку'}).click();await page.getByLabel('Новый пароль',{exact:true}).fill('fixture-password-123');await page.getByLabel('Повторите пароль').fill('different-password');await page.getByRole('button',{name:'Сохранить новый пароль'}).click();await expect(page.locator('main').getByRole('alert')).toContainText('не совпадают');expect(actions).toEqual(['exchange']);
 await page.getByLabel('Повторите пароль').fill('fixture-password-123');await page.getByRole('button',{name:'Сохранить новый пароль'}).click();await expect(page.getByRole('status')).toContainText('Пароль изменён');expect(actions).toEqual(['exchange','update']);await expect(page.locator('input[type=password]')).toHaveCount(0);
});
test('failed recovery is not retried automatically and can restart',async({page})=>{
 let calls=0;await page.route('**/api/recovery',r=>{calls++;return r.fulfill({status:429,json:{error:'private provider detail'}});});await page.goto('/recover?code=expired');await page.getByRole('button',{name:'Проверить ссылку'}).click();await expect(page.locator('main').getByRole('alert')).toContainText('Подождите минуту');await expect(page.locator('main').getByRole('alert')).not.toContainText('private');expect(calls).toBe(1);await page.getByRole('button',{name:'Запросить новую ссылку'}).click();await expect(page.getByLabel('Электронная почта')).toBeVisible();expect(calls).toBe(1);
});
