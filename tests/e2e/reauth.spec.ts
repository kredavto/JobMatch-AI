import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const ownerId='11111111-1111-4111-8111-111111111111';
const otherId='22222222-2222-4222-8222-222222222222';
const initial={ownerId,revision:1,original:'SQL',vacancy:'SQL',goal:'Аналитик',facts:[],versions:[],applications:[]};
test('same-account reauthentication keeps drafts and requires explicit saving',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 let expired=true,attempts=0,saves=0;
 await page.route('**/api/service',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:{...initial,revision:expired?1:2,original:expired?'SQL':'Текст с сервера'}});
  const body=r.request().postDataJSON();expect(body.expectedOwnerId).toBe(ownerId);
  if(body.action==='login'){
   attempts++;if(body.email==='other@example.test')return r.fulfill({status:409,json:{error:'Повторный вход выполнен в другой аккаунт.'}});
   expired=false;return r.fulfill({json:{ok:true}});
  }
  if(expired)return r.fulfill({status:401,json:{error:'Сессия истекла'}});
  saves++;return r.fulfill({json:{...initial,revision:3,original:body.text}});
 });
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 const draft=page.getByLabel('Проверьте текст после импорта');await draft.fill('Мой открытый черновик');
 await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();
 await expect(page.getByRole('heading',{name:'Восстановить вход'})).toBeVisible();
 await page.getByLabel('Почта исходного аккаунта').fill('other@example.test');await page.getByLabel('Пароль для повторного входа').fill('fixture-password-123');
 await page.getByRole('button',{name:'Войти повторно',exact:true}).click();
 await expect(page.locator('.error')).toContainText('другой аккаунт');await expect(draft).toHaveValue('Мой открытый черновик');expect(saves).toBe(0);
 await expect(page.getByLabel('Пароль для повторного входа')).toHaveValue('');
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.getByLabel('Почта исходного аккаунта').fill('original@example.test');await page.getByLabel('Пароль для повторного входа').fill('fixture-password-123');
 await page.getByRole('button',{name:'Войти повторно',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Вход восстановлен');await expect(draft).toHaveValue('Мой открытый черновик');expect(saves).toBe(0);expect(attempts).toBe(2);
 await page.getByText('Сохраненные на сервере тексты',{exact:true}).click();await expect(page.getByText('Текст с сервера',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();await expect(page.getByRole('status')).toHaveText('Сохранено');expect(saves).toBe(1);
});
test('reload from another account does not merge its profile into the open draft',async({page})=>{
 let changed=false;
 await page.route('**/api/service',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:changed?{...initial,ownerId:otherId,original:'Чужой профиль'}:initial});
  changed=true;return r.fulfill({status:409,json:{error:'Аккаунт изменился'}});
 });
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 const draft=page.getByLabel('Проверьте текст после импорта');await draft.fill('Исходный черновик');
 await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();await page.getByRole('button',{name:'Загрузить актуальные данные'}).click();
 await expect(page.getByRole('heading',{name:'Восстановить вход'})).toBeVisible();await expect(draft).toHaveValue('Исходный черновик');
 await expect(page.getByText('Чужой профиль',{exact:true})).toHaveCount(0);
});
test('ordinary logout clears unsaved auxiliary fields before a different account signs in',async({page})=>{
 let owner=ownerId;
 await page.route('**/api/service',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:{...initial,ownerId:owner}});
  const action=r.request().postDataJSON().action;if(action==='login')owner=otherId;
  return r.fulfill({json:{ok:true}});
 });
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 await page.getByLabel('Уточнение или дополнительный факт').fill('Личный черновик первого аккаунта');
 await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();
 await page.getByLabel('Вакансия / компания',{exact:true}).fill('Компания первого аккаунта');
 await page.getByRole('button',{name:'Выйти',exact:true}).click();
 await page.getByRole('button',{name:'Уже есть аккаунт? Войти'}).click();
 await page.getByLabel('Электронная почта').fill('other@example.test');await page.getByLabel('Пароль · минимум 12 символов').fill('fixture-password-123');
 await page.getByRole('button',{name:'Войти →',exact:true}).click();
 await expect(page.getByRole('navigation')).toBeVisible();
 await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 await expect(page.getByLabel('Уточнение или дополнительный факт')).toHaveValue('');
 await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();
 await expect(page.getByLabel('Вакансия / компания',{exact:true})).toHaveValue('');
});
for(const endpoint of ['history','import'])test(endpoint+' expiration opens recovery without losing text',async({page})=>{
 await page.route('**/api/service',r=>r.fulfill({json:initial}));
 await page.route('**/api/fact-history*',r=>r.fulfill({status:401,json:{error:'Сессия истекла'}}));
 await page.route('**/api/import',r=>r.fulfill({status:401,json:{error:'Сессия истекла'}}));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 const draft=page.getByLabel('Проверьте текст после импорта');await draft.fill('Сохранить этот черновик');
 if(endpoint==='history')await page.getByRole('button',{name:'Обновить историю фактов'}).click();
 else await page.getByLabel('Загрузить TXT, DOCX, PDF · до 4 МБ').setInputFiles({name:'fixture.txt',mimeType:'text/plain',buffer:Buffer.from('SQL')});
 await expect(page.getByRole('heading',{name:'Восстановить вход'})).toBeVisible();await expect(draft).toHaveValue('Сохранить этот черновик');
});
