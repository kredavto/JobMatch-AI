import {test,expect} from '@playwright/test';
const vacancy={title:'Менеджер B2B',company:'Пример',url:'https://example.com/job',text:'Нужен менеджер B2B, работа с Excel и CRM, ведение переговоров.',skills:['B2B','Excel','CRM']};
test('HH login and selection replace file upload as the first step',async({page})=>{
 const writes:string[]=[];page.on('request',request=>{if(/\/api\/mvp\/(import|adapt|export)/.test(new URL(request.url()).pathname))writes.push(request.url());});
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));
 await page.goto('/');
 const first=page.getByRole('region',{name:'Ваше резюме из hh.ru'});
 await expect(first.getByRole('button',{name:'Войти в hh.ru',exact:true})).toBeDisabled();
 await expect(first.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Загрузить резюме',exact:true})).toHaveCount(0);
 await expect(page.locator('input[type=file], input[type=password]')).toHaveCount(0);
 await expect(page.locator('#hh-resume-unavailable')).toContainText('ещё не настроено');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(first.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);
 await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();
 await expect(page.locator('.vacancy-loaded')).toContainText(vacancy.title);
 await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
 await page.reload();
 await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();
 expect(writes).toEqual([]);
});
test('mobile layout and vacancy errors remain usable while HH is unavailable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('Ссылка на вакансию').fill('https://hh.ru/vacancy/123456');
 await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();
 await expect(page.locator('.error[role=alert]')).toContainText('Подключение hh.ru ещё не настроено');
 await page.reload();await expect(page.getByLabel('Ссылка на вакансию')).toHaveValue('');
 await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
});
test('stale vacancy response cannot restore changed input',async({page})=>{
 let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/mvp/vacancy',async route=>{await wait;await route.fulfill({json:vacancy}).catch(()=>{});});
 await page.goto('/');await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();await page.getByLabel('Ссылка на вакансию').fill('https://example.com/new');release();await expect(page.locator('.vacancy-loaded')).toHaveCount(0);await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
});


test('mocked authorized HH selection enables adaptation, logout clears it',async({page})=>{
 await page.route('**/api/mvp/hh/session',route=>route.fulfill({json:{configured:true,authenticated:true}}));
 await page.route('**/api/mvp/hh/resumes',route=>route.fulfill({json:{items:[{id:'synthetic',title:'Тестовое резюме'}]}}));
 await page.route('**/api/mvp/hh/select',route=>route.fulfill({json:{text:'Тестовая компания. Разрабатывал отчёты на Python.',filename:'Тестовое резюме'}}));
 await page.route('**/api/mvp/hh/logout',route=>route.fulfill({json:{ok:true}}));
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));
 await page.goto('/');await page.getByRole('button',{name:'Выбрать резюме из списка',exact:true}).click();
 await page.getByRole('button',{name:'Тестовое резюме',exact:true}).click();
 await expect(page.getByText(/Резюме выбрано/)).toBeVisible();
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();
 await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Отключить hh.ru в JobMatch'}).click();
 await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Войти в hh.ru',exact:true})).toBeEnabled();
});
test('failed session lookup and revoked session can recover without reload',async({page})=>{
 let healthy=false;
 await page.route('**/api/mvp/hh/session',route=>route.fulfill(healthy?{json:{configured:true,authenticated:true}}:{status:503,json:{error:'Временно недоступно'}}));
 await page.route('**/api/mvp/hh/resumes',route=>route.fulfill({status:401,json:{error:'Войдите снова'}}));
 await page.goto('/');await expect(page.locator('.error[role=alert]')).toContainText('Временно недоступно');healthy=true;
 await page.getByRole('button',{name:'Проверить подключение снова'}).click();
 await page.getByRole('button',{name:'Выбрать резюме из списка',exact:true}).click();
 await expect(page.getByRole('button',{name:'Войти в hh.ru',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();
});

test('403 list refusal clears selected data but keeps identity and does not repeat login or reads',async({page})=>{
 let lists=0,starts=0,sessions=0;
 await page.route('**/api/mvp/hh/session',route=>{sessions++;return route.fulfill({json:{configured:true,authenticated:true}});});
 await page.route('**/api/mvp/hh/start',route=>{starts++;return route.abort();});
 await page.route('**/api/mvp/hh/resumes',route=>{
  lists++;return route.fulfill(lists===1?{json:{items:[{id:'synthetic',title:'Тестовое резюме'}]}}:{status:403,json:{error:'hh.ru отказал в доступе к запрошенным данным. Проверьте разрешения приложения в hh.ru.'}});
 });
 await page.route('**/api/mvp/hh/select',route=>route.fulfill({json:{text:'Тестовая компания. Разрабатывал отчёты на Python.',filename:'Тестовое резюме'}}));
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));
 await page.goto('/');await page.getByRole('button',{name:'Выбрать резюме из списка',exact:true}).click();
 await page.getByRole('button',{name:'Тестовое резюме',exact:true}).click();
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();
 await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Выбрать резюме из списка',exact:true}).click();
 await expect(page.locator('.error[role=alert]')).toContainText('отказал в доступе');
 await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
 await expect(page.getByText(/Резюме выбрано/)).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Войти в hh.ru',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Отключить hh.ru в JobMatch'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 expect(lists).toBe(2);expect(starts).toBe(0);expect(sessions).toBe(1);
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

test('late resume JSON after timeout cannot replace a newer selection even if transport ignores abort',async({page})=>{
 await page.clock.install();
 await page.addInitScript(()=>{
  const original=window.fetch.bind(window);let selectCount=0;
  Object.assign(window,{releaseOldSelection:()=>{}});
  window.fetch=async(input,init)=>{
   if(String(input).endsWith('/hh/select')){
    selectCount++;
    if(selectCount===1)return {ok:true,status:200,json:()=>new Promise(resolve=>{Object.assign(window,{releaseOldSelection:()=>resolve({text:'OLD_PRIVATE_RESUME must never be selected.',filename:'Old'})});})} as Response;
    return new Response(JSON.stringify({text:'NEW_RESUME Selected newer experience.',filename:'New'}),{status:200,headers:{'content-type':'application/json'}});
   }
   return original(input,init);
  };
 });
 await page.route('**/api/mvp/hh/session',route=>route.fulfill({json:{configured:true,authenticated:true}}));
 await page.route('**/api/mvp/hh/resumes',route=>route.fulfill({json:{items:[{id:'old',title:'Old'},{id:'new',title:'New'}]}}));
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));
 let sentResume='';
 await page.route('**/api/mvp/adapt',route=>{sentResume=route.request().postDataJSON().resume;return route.fulfill({status:503,json:{error:'Synthetic stop'}});});
 await page.goto('/');await page.getByRole('button',{name:'Выбрать резюме из списка',exact:true}).click();
 await page.getByRole('button',{name:'Old',exact:true}).click();await page.clock.fastForward(21000);
 await expect(page.locator('.error[role=alert]')).toContainText('не ответил вовремя');
 await page.getByRole('button',{name:'New',exact:true}).click();await expect(page.getByRole('button',{name:'New',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>{(window as unknown as {releaseOldSelection:()=>void}).releaseOldSelection();});
 await expect(page.getByRole('button',{name:'Old',exact:true})).toHaveAttribute('aria-pressed','false');
 await expect(page.getByRole('button',{name:'New',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();
 await page.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();await expect.poll(()=>sentResume).toContain('NEW_RESUME');expect(sentResume).not.toContain('OLD_PRIVATE_RESUME');
});


test('initial HH session 403 blocks retry and login without repeating requests',async({page})=>{
 let sessions=0,starts=0,resumeReads=0;
 await page.route('**/api/mvp/hh/session',route=>{sessions++;return route.fulfill({status:403,json:{error:'hh.ru отказал в доступе (проверка аккаунта).'}});});
 await page.route('**/api/mvp/hh/start',route=>{starts++;return route.abort();});
 await page.route('**/api/mvp/hh/resumes',route=>{resumeReads++;return route.abort();});
 await page.goto('/');
 await expect(page.locator('.error[role=alert]')).toContainText('отказал в доступе');
 await expect(page.locator('#hh-resume-unavailable')).toContainText('отказал в доступе');
 await expect(page.getByRole('button',{name:'Проверить подключение снова'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Войти в hh.ru',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 expect(sessions).toBe(1);expect(starts).toBe(0);expect(resumeReads).toBe(0);
});
