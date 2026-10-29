import {test,expect} from '@playwright/test';
const workspace={revision:1,original:'SQL',vacancy:'',goal:'',facts:[],versions:[],applications:[]};
test('malformed refresh cannot open a workspace and retry can recover',async({page})=>{
 let good=false,refreshed=false,reads=0;
 await page.route('**/api/service',r=>{
  if(r.request().method()==='GET'){reads++;return r.fulfill({status:refreshed?200:401,json:refreshed?workspace:{error:'Войдите'}});}
  refreshed=good;return r.fulfill({json:good?{ok:true}:{confirmationRequired:true}});
 });
 await page.goto('/');await expect(page.getByRole('heading',{name:'Не удалось загрузить рабочее пространство'})).toBeVisible();expect(reads).toBe(1);
 good=true;await page.getByRole('button',{name:'Повторить загрузку'}).click();
 await expect(page.getByRole('heading',{name:'Следующий шаг в карьере'})).toBeVisible();
});
test('malformed logout acknowledgment leaves the open draft available',async({page})=>{
 await page.route('**/api/service',r=>r.fulfill({json:r.request().method()==='GET'?workspace:{ok:false}}));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 const field=page.getByLabel('Проверьте текст после импорта');await field.fill('Несохраненный черновик');
 await page.getByRole('button',{name:'Выйти',exact:true}).click();
 await expect(page.locator('.error')).toContainText('некорректный ответ');await expect(field).toHaveValue('Несохраненный черновик');
 await expect(page.getByRole('heading',{name:'Создать аккаунт'})).toHaveCount(0);
});
test('a confirmation response to login is not treated as successful authentication',async({page})=>{
 let reads=0;
 await page.route('**/api/service',r=>{
  if(r.request().method()==='GET'){reads++;return r.fulfill({status:401,json:{error:'Войдите'}});}
  return r.fulfill({json:r.request().postDataJSON().action==='refresh'?{ok:true}:{confirmationRequired:true}});
 });
 await page.goto('/');await page.getByRole('button',{name:'Уже есть аккаунт? Войти'}).click();
 await page.getByLabel('Электронная почта').fill('demo@example.test');await page.getByLabel('Пароль · минимум 12 символов').fill('fixture-password-123');
 const before=reads;await page.getByRole('button',{name:'Войти →',exact:true}).click();
 await expect(page.locator('.error')).toContainText('некорректный ответ');expect(reads).toBe(before);
 await expect(page.getByRole('heading',{name:'С возвращением'})).toBeVisible();
});
test('refresh outage offers retry; an ended session on retry opens login instead of retaining outage',async({page})=>{
 let outage=true,refreshes=0;
 await page.route('**/api/service',r=>{if(r.request().method()==='GET')return r.fulfill({status:401,json:{error:'Войдите'}});refreshes++;return r.fulfill({status:outage?503:401,json:{error:outage?'Сервис временно недоступен':'Войдите'}});});
 await page.goto('/');await expect(page.getByRole('heading',{name:'Не удалось загрузить рабочее пространство'})).toBeVisible();expect(refreshes).toBe(1);
 outage=false;await page.getByRole('button',{name:'Повторить загрузку'}).click();await expect(page.getByLabel('Электронная почта')).toBeVisible();await expect(page.getByRole('heading',{name:'Не удалось загрузить рабочее пространство'})).toHaveCount(0);expect(refreshes).toBe(2);
});
test('refresh during draft reload binds original owner and offers reauthentication on mismatch',async({page})=>{
 const owner='11111111-1111-4111-8111-111111111111';let expired=false,refreshes=0;
 await page.route('**/api/service',r=>{if(r.request().method()==='GET')return r.fulfill({status:expired?401:200,json:expired?{error:'Войдите'}:{...workspace,ownerId:owner}});const b=r.request().postDataJSON();if(b.action==='refresh'){expect(b.expectedOwnerId).toBe(owner);refreshes++;return r.fulfill({status:409,json:{error:'Другой аккаунт'}});}expired=true;return r.fulfill({status:409,json:{error:'Обновите данные'}});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();const draft=page.getByLabel('Проверьте текст после импорта');await draft.fill('Открытый черновик');await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();await page.getByRole('button',{name:'Загрузить актуальные данные'}).click();await expect(page.getByRole('heading',{name:'Восстановить вход'})).toBeVisible();await expect(draft).toHaveValue('Открытый черновик');expect(refreshes).toBe(1);
});
test('signup confirmation is opaque and guides an existing account back to login',async({page})=>{
 let signups=0;await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({status:401,json:{error:'Войдите'}});
  const action=route.request().postDataJSON().action;
  if(action==='register'){signups++;return route.fulfill({json:{confirmationRequired:true}});}
  return route.fulfill({status:401,json:{error:'Войдите'}});
 });
 await page.goto('/');await page.getByLabel('Электронная почта').fill('existing@example.test');await page.getByLabel('Пароль · минимум 12 символов').fill('fixture-password-123');await page.getByRole('checkbox').check();await page.locator('form button.primary').click();
 await expect(page.getByRole('status')).toContainText('Если аккаунт уже создан, войдите с прежним паролем');await expect(page.getByRole('status')).toContainText('Повторная регистрация не меняет пароль');expect(signups).toBe(1);await expect(page.getByRole('heading',{name:'С возвращением'})).toBeVisible();await expect(page.getByLabel('Пароль · минимум 12 символов')).toHaveValue('');
});
