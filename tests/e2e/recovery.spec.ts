import {test,expect} from '@playwright/test';
const initial={revision:1,original:'Первоначальное резюме',vacancy:'SQL',goal:'Аналитик',facts:[],versions:[],applications:[]};
test('server failure on startup offers retry, not signup',async({page})=>{
 let unavailable=true;
 await page.route('**/api/service',r=>r.fulfill({status:unavailable?503:200,json:unavailable?{error:'Сервис недоступен'}:initial}));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Не удалось загрузить рабочее пространство'})).toBeVisible();await expect(page.getByRole('heading',{name:'Создать аккаунт'})).toHaveCount(0);
 unavailable=false;await page.getByRole('button',{name:'Повторить загрузку'}).click();await expect(page.getByRole('heading',{name:'Следующий шаг в карьере'})).toBeVisible();
});
for(const failure of ['conflict','lost-response'] as const)test(`${failure}: preserve draft and require reload before another write`,async({page})=>{
 let workspace={...initial};let writes=0;
 await page.route('**/api/service',async r=>{if(r.request().method()==='GET')return r.fulfill({json:workspace});writes++;workspace={...workspace,revision:2,original:'Из другой вкладки'};if(failure==='lost-response')return r.abort('failed');return r.fulfill({status:409,json:{error:'Данные изменены в другой вкладке'}});});
 await page.goto('/');await page.getByRole('button',{name:'Мой профиль',exact:false}).click();const field=page.getByLabel('Проверьте текст после импорта');await field.fill('Мой несохраненный текст');await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();
 await expect(page.getByRole('button',{name:'Загрузить актуальные данные'})).toBeVisible();await expect(field).toHaveValue('Мой несохраненный текст');await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();expect(writes).toBe(1);
 await page.getByRole('button',{name:'Загрузить актуальные данные'}).click();await expect(page.getByRole('status')).toContainText('Актуальные данные загружены');await expect(field).toHaveValue('Мой несохраненный текст');await page.getByText('Сохраненные на сервере тексты').click();await expect(page.getByText('Из другой вкладки',{exact:true})).toBeVisible();expect(writes).toBe(1);
});
test('two tabs use revision conflict recovery without silently replacing draft',async({context})=>{
 let workspace={...initial};
 await context.route('**/api/service',async r=>{
  if(r.request().method()==='GET')return r.fulfill({json:workspace});
  const body=r.request().postDataJSON();
  if(body.revision!==workspace.revision)return r.fulfill({status:409,json:{error:'Конфликт ревизий'}});
  workspace={...workspace,original:body.text,revision:workspace.revision+1};return r.fulfill({json:workspace});
 });
 const first=await context.newPage(),second=await context.newPage();
 for(const page of [first,second]){await page.goto('/');await page.getByRole('button',{name:'Мой профиль',exact:false}).click();}
 await second.getByLabel('Проверьте текст после импорта').fill('Черновик второй вкладки');
 await first.getByLabel('Проверьте текст после импорта').fill('Запись первой вкладки');await first.getByRole('button',{name:'Сохранить мастер-профиль'}).click();await expect(first.getByRole('status')).toHaveText('Сохранено');
 await second.getByRole('button',{name:'Сохранить мастер-профиль'}).click();await expect(second.getByRole('button',{name:'Загрузить актуальные данные'})).toBeVisible();
 await second.getByRole('button',{name:'Загрузить актуальные данные'}).click();await expect(second.getByRole('status')).toContainText('Актуальные данные загружены');await expect(second.getByLabel('Проверьте текст после импорта')).toHaveValue('Черновик второй вкладки');
 expect(workspace.original).toBe('Запись первой вкладки');await second.getByRole('button',{name:'Сохранить мастер-профиль'}).click();await expect(second.getByRole('status')).toHaveText('Сохранено');expect(workspace.revision).toBe(3);expect(workspace.original).toBe('Черновик второй вкладки');
});
