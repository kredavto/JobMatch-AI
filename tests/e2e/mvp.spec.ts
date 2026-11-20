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

test('mobile explicit version survives reload and profile deletion, preserves source and sends no resume',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const source='Синтетический пример: составлял отчёты Excel и работал с CRM.';
 const leaked:string[]=[];page.on('request',r=>{if((r.postData()||'').includes(source))leaked.push(r.url());});
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));await page.goto('/');
 await page.getByLabel('Название профиля',{exact:true}).fill('Тест версии');await page.getByLabel('Текст вашего резюме',{exact:true}).fill(source);await page.getByRole('button',{name:'Сохранить и выбрать',exact:true}).click();
 const profiles=await page.evaluate(()=>localStorage.getItem('jobmatch.local-profiles.v1'));
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();await page.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();
 const result=await page.getByLabel('Текст адаптированного резюме',{exact:true}).inputValue();
 expect(await page.evaluate(()=>localStorage.getItem('jobmatch.local-versions.v1'))).toBeNull();
 await page.getByText('Сравнить исходник и текущий результат',{exact:true}).click();await expect(page.locator('#current-review-source')).toHaveValue(source);
 await page.getByRole('button',{name:'Сохранить как отдельную версию',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('jobmatch.local-profiles.v1'))).toBe(profiles);
 await page.getByLabel('Текст вашего резюме',{exact:true}).fill('Изменённый синтетический исходник без прежнего опыта.');await expect(page.getByLabel('Текст адаптированного резюме',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Сохранить как отдельную версию',exact:true})).toHaveCount(0);await expect(page.locator('#saved-review-source')).toHaveValue(source);
 await page.reload();await page.getByLabel('Сохранённые версии',{exact:true}).selectOption({index:1});await expect(page.locator('#saved-review-source')).toHaveValue(source);await expect(page.locator('#saved-review-adapted')).toHaveValue(result);
 await page.getByLabel('Сохранённые профили',{exact:true}).selectOption({label:'Тест версии'});page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Удалить профиль',exact:true}).click();await expect(page.locator('#saved-review-source')).toHaveValue(source);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Удалить отдельную версию',exact:true}).click();await page.reload();await expect(page.locator('#version-list option')).toHaveCount(1);expect(leaked).toEqual([]);
});

test('corrupt version storage is preserved and does not block unsaved profile use',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('jobmatch.local-versions.v1','corrupt'));
 await page.goto('/');await expect(page.getByRole('alert').filter({hasText:'Не удалось прочитать версии'})).toBeVisible();
 await page.getByLabel('Название профиля',{exact:true}).fill('Синтетика');await page.getByLabel('Текст вашего резюме',{exact:true}).fill('Синтетический опыт работы с Excel.');await page.getByRole('button',{name:'Использовать без сохранения',exact:true}).click();
 expect(await page.evaluate(()=>localStorage.getItem('jobmatch.local-versions.v1'))).toBe('corrupt');
});

test('quota failure leaves current comparison and profile intact without reporting save',async({page})=>{
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));await page.goto('/');
 await page.getByLabel('Название профиля',{exact:true}).fill('Синтетика квоты');await page.getByLabel('Текст вашего резюме',{exact:true}).fill('Синтетический опыт: отчёты Excel и работа с CRM.');await page.getByRole('button',{name:'Использовать без сохранения',exact:true}).click();
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();await page.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();
 const result=await page.getByLabel('Текст адаптированного резюме',{exact:true}).inputValue();
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='jobmatch.local-versions.v1')throw new DOMException('Full','QuotaExceededError');original.call(this,key,value);};});
 await page.getByRole('button',{name:'Сохранить как отдельную версию',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Не удалось сохранить версию'})).toBeVisible();await expect(page.getByLabel('Текст адаптированного резюме',{exact:true})).toHaveValue(result);expect(await page.evaluate(()=>localStorage.getItem('jobmatch.local-versions.v1'))).toBeNull();await expect(page.getByRole('status').filter({hasText:'Отдельная версия сохранена'})).toHaveCount(0);
});

test('fresh unnamed resume can adapt without saving; blank explicit save writes nothing',async({page})=>{
 const source='Синтетическое резюме: работал с Excel и CRM.';
 await page.addInitScript(()=>{
  const writes:string[]=[];
  Object.defineProperty(window,'__profileStorageWrites',{value:writes});
  const setItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key:string,value:string){if(this===localStorage)writes.push(key);return setItem.call(this,key,value);};
 });
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));
 await page.goto('/');
 const name=page.getByLabel('Название профиля',{exact:true});
 await expect(name).toHaveValue('');
 await page.getByLabel('Текст вашего резюме',{exact:true}).fill(source);
 await page.getByRole('button',{name:'Сохранить и выбрать',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveText('Введите название профиля до 100 символов.');
 await expect(page.getByLabel('Сохранённые профили').locator('option')).toHaveCount(1);
 await page.getByRole('button',{name:'Использовать без сохранения',exact:true}).click();
 await expect(page.getByText(/Текст выбран для этой вкладки/)).toBeVisible();
 await expect(name).toHaveValue('');
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);
 await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();
 await page.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();
 await expect(page.getByLabel('Текст адаптированного резюме',{exact:true})).toHaveValue(vacancy.title+'\n\n'+source);
 expect(await page.evaluate(()=>Reflect.get(window,'__profileStorageWrites'))).toEqual([]);
 expect(await page.evaluate(()=>localStorage.getItem('jobmatch.local-profiles.v1'))).toBeNull();
 await page.reload();
 await expect(page.getByLabel('Текст вашего резюме',{exact:true})).toHaveValue('');
});
