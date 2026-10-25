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
