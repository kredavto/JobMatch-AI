import {test,expect} from '@playwright/test';
const vacancy={title:'Менеджер B2B',company:'Пример',url:'https://example.com/job',text:'Нужен менеджер B2B, работа с Excel и CRM, ведение переговоров.',skills:['B2B','Excel','CRM']};
test('stale vacancy response cannot restore changed input',async({page})=>{
 let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/mvp/vacancy',async route=>{await wait;await route.fulfill({json:vacancy}).catch(()=>{});});
 await page.goto('/');await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();await page.getByLabel('Ссылка на вакансию').fill('https://example.com/new');release();await expect(page.locator('.vacancy-loaded')).toHaveCount(0);await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
});


test('HH vacancy 403 blocks clicks, Enter and changed HH URLs but not public pages or explicit recovery',async({page})=>{
 let hhReads=0,publicReads=0;
 await page.route('**/api/mvp/vacancy',route=>{
  const url=new URL(route.request().postDataJSON().url);
  if(url.hostname.endsWith('hh.ru')){hhReads++;return route.fulfill({status:403,json:{error:'hh.ru отказал в доступе (чтение вакансии).'}});}
  publicReads++;return route.fulfill({json:vacancy});
 });
 await page.goto('/');const input=page.getByLabel('Ссылка на вакансию'),load=page.getByRole('button',{name:'Загрузить вакансию',exact:true});
 await input.fill('https://hh.ru/vacancy/12345');await load.click();
 await expect(load).toBeDisabled();await input.press('Enter');expect(hhReads).toBe(1);
 await input.fill('https://spb.hh.ru/vacancy/54321');await input.press('Enter');await expect(load).toBeDisabled();expect(hhReads).toBe(1);
 await input.fill(vacancy.url);await expect(load).toBeEnabled();await load.click();await expect(page.locator('.vacancy-loaded')).toContainText(vacancy.title);expect(publicReads).toBe(1);
 await input.fill('https://hh.ru/vacancy/54321');await expect(load).toBeDisabled();
 await page.reload();await input.fill('https://hh.ru/vacancy/54321');await input.press('Enter');await expect(load).toBeDisabled();expect(hhReads).toBe(1);
 await page.getByRole('button',{name:'Разрешить повтор после проверки доступа'}).click();await expect(load).toBeEnabled();expect(hhReads).toBe(1);
 await input.press('Enter');await expect(load).toBeDisabled();expect(hhReads).toBe(2);
});

test('late aborted vacancy refusal cannot block a newer URL',async({page})=>{
 let release!:()=>void;const waiting=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/mvp/vacancy',async route=>{
  if(route.request().postDataJSON().url.includes('hh.ru')){await waiting;await route.fulfill({status:403,json:{error:'Late refusal'}}).catch(()=>{});}
  else await route.fulfill({json:vacancy});
 });
 await page.goto('/');const input=page.getByLabel('Ссылка на вакансию'),load=page.getByRole('button',{name:'Загрузить вакансию',exact:true});
 await input.fill('https://hh.ru/vacancy/12345');await load.click();await input.fill(vacancy.url);await load.click();release();
 await expect(page.locator('.vacancy-loaded')).toContainText(vacancy.title);
 await expect(page.getByRole('button',{name:'Разрешить повтор после проверки доступа'})).toHaveCount(0);
});

test('local profile save, reload, select, adapt, edit and delete without sending resume',async({page})=>{
 const disallowed:string[]=[];page.on('request',r=>{if(/\/api\/mvp\/(import|adapt|export|hh)/.test(new URL(r.url()).pathname))disallowed.push(r.url());});
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));await page.goto('/');
 await expect(page.locator('input[type=file],input[type=password]')).toHaveCount(0);
 await page.getByLabel('Название профиля',{exact:true}).fill('Синтетический профиль');await page.getByLabel('Текст вашего резюме',{exact:true}).fill('Работал с Excel и CRM в синтетической компании.');
 await page.getByRole('button',{name:'Сохранить и выбрать',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Профиль сохранён'})).toBeVisible();
 await page.reload();await page.getByLabel('Сохранённые профили',{exact:true}).selectOption({label:'Синтетический профиль'});
 await expect(page.getByLabel('Текст вашего резюме',{exact:true})).toHaveValue('Работал с Excel и CRM в синтетической компании.');
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();await expect(page.locator('.vacancy-loaded')).toBeVisible();
 await page.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();await expect(page.getByLabel('Текст сопроводительного письма')).toContainText('Excel');
 await expect(page.getByRole('region',{name:'Сопоставление навыков'})).toContainText('B2B');
 await page.getByLabel('Текст вашего резюме',{exact:true}).fill('Изменённый синтетический опыт работы с Excel.');await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();await expect(page.getByLabel('Текст сопроводительного письма')).toHaveCount(0);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Удалить профиль',exact:true}).click();await page.reload();await expect(page.getByLabel('Сохранённые профили').locator('option')).toHaveCount(1);expect(disallowed).toEqual([]);
});
test('unsaved text does not survive reload and mobile layout fits',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByLabel('Название профиля',{exact:true}).fill('Временный');await page.getByLabel('Текст вашего резюме',{exact:true}).fill('Синтетический опыт разработки SQL отчётов.');await page.getByRole('button',{name:'Использовать без сохранения'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.reload();await expect(page.getByLabel('Текст вашего резюме',{exact:true})).toHaveValue('');
});
test('synthetic rewrite preview is read-only and can be rejected without network mutations',async({page})=>{
 const mutations:string[]=[];page.on('request',r=>{if(r.method()!=='GET')mutations.push(r.url());});
 await page.goto('/rewrite-demo');await expect(page.getByRole('heading',{name:'Демонстрация проверки черновика'})).toBeVisible();await expect(page.getByRole('region',{name:'Проверка предложений переписывания'})).toContainText('Непроверенный черновик');await expect(page.getByRole('heading',{name:'Исходный факт',exact:true})).toHaveCount(3);await expect(page.getByRole('button',{name:'Применить',exact:true})).toHaveCount(0);await expect(page.locator('input,textarea')).toHaveCount(0);
 await page.getByRole('button',{name:'Отклонить все предложения',exact:true}).click();await expect(page.getByRole('status')).toContainText('Исходный текст не изменён');expect(mutations).toEqual([]);
});
test('mobile copy fallback selects exact resume without network mutation',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}});});
 const mutations:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().endsWith('/api/mvp/vacancy'))mutations.push(r.url());});
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));await page.goto('/');await page.getByLabel('Название профиля',{exact:true}).fill('Временный тест');await page.getByLabel('Текст вашего резюме',{exact:true}).fill('Работал с Excel и CRM в синтетической компании.');await page.getByRole('button',{name:'Использовать без сохранения',exact:true}).click();await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();await page.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();
 await page.getByRole('button',{name:'Копировать: Текст адаптированного резюме',exact:true}).click();await expect(page.getByText('Текст выделен. Используйте команду «Копировать» в меню устройства. Автоматическое копирование не выполнялось.',{exact:true})).toBeVisible();
 const selection=await page.getByLabel('Текст адаптированного резюме',{exact:true}).evaluate((el:HTMLTextAreaElement)=>({start:el.selectionStart,end:el.selectionEnd,length:el.value.length}));expect(selection).toEqual({start:0,end:selection.length,length:selection.length});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(mutations).toEqual([]);
});
