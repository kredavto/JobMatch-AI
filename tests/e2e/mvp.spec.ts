import {test,expect} from '@playwright/test';
const vacancy={title:'Менеджер B2B',company:'Пример',url:'https://example.com/job',text:'Нужен менеджер B2B, работа с Excel и CRM, ведение переговоров.',skills:['B2B','Excel','CRM']};
test('HH login and selection replace file upload as the first step',async({page})=>{
 const writes:string[]=[];page.on('request',request=>{if(/\/api\/mvp\/(import|adapt|export)/.test(new URL(request.url()).pathname))writes.push(request.url());});
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));
 await page.goto('/');
 const first=page.getByRole('region',{name:'Ваше резюме из hh.ru'});
 await expect(first.getByRole('link',{name:/Войти в hh.ru/})).toHaveAttribute('href','https://hh.ru/account/login');
 await expect(first.getByRole('link',{name:/Войти в hh.ru/})).toHaveAttribute('target','_blank');
 await expect(first.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Загрузить резюме',exact:true})).toHaveCount(0);
 await expect(page.locator('input[type=file], input[type=password]')).toHaveCount(0);
 await expect(page.locator('#hh-resume-unavailable')).toContainText('не авторизует JobMatch');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(first.getByRole('button')).toBeDisabled();
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
 await expect(page.getByRole('alert')).toContainText('Импорт hh.ru пока не подключён');
 await page.reload();await expect(page.getByLabel('Ссылка на вакансию')).toHaveValue('');
 await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
});
test('stale vacancy response cannot restore changed input',async({page})=>{
 let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/mvp/vacancy',async route=>{await wait;await route.fulfill({json:vacancy}).catch(()=>{});});
 await page.goto('/');await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();await page.getByLabel('Ссылка на вакансию').fill('https://example.com/new');release();await expect(page.locator('.vacancy-loaded')).toHaveCount(0);await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
});
