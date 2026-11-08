import {test,expect} from '@playwright/test';
import {resumeDocx} from '../../lib/resume-docx';
const source='Анна Тестовая\nРаботала менеджером по продажам B2B.\nГотовила отчёты в Excel.\nКомпания А, 2020–2024.';
const vacancy={title:'Менеджер B2B',company:'Пример',url:'https://example.com/job',text:'Нужен менеджер B2B, работа с Excel и CRM, ведение переговоров.',skills:['B2B','Excel','CRM']};
test('four actions, actual import and adaptation, honest unavailable HH resume picker',async({page})=>{
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));
 const exportCalls:string[]=[];page.on('request',request=>{if(request.url().includes('/api/mvp/export'))exportCalls.push(request.url());});
 await page.goto('/');await expect(page.locator('.ai-status')).toContainText('ИИ пока не подключён');await expect(page.getByRole('button')).toHaveCount(4);await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Скачать резюме',exact:true})).toHaveCount(0);await expect(page.getByLabel('Формат скачивания')).toHaveCount(0);await expect(page.getByText('hh.ru не подключён.',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:/Войти в hh.ru/})).toHaveAttribute('href','https://hh.ru/account/login');await expect(page.getByRole('link',{name:/Войти в hh.ru/})).toHaveAttribute('target','_blank');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();await expect(page.locator('input[type=password]')).toHaveCount(0);
 await page.getByLabel('Файл резюме').setInputFiles({name:'resume.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from(await resumeDocx(source))});
 await expect(page.getByText('Файл загружен и готов к адаптации')).toBeVisible();
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();
 await page.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();
 await expect(page.getByText('Автоматическая адаптация',{exact:true})).toBeVisible();await expect(page.locator('.resume-preview')).toContainText(source.split('\n')[1]);
 await expect(page.getByLabel('Текст сопроводительного письма')).toHaveValue(/Менеджер B2B/);
 await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();await expect(page.locator('#hh-resume-unavailable')).toContainText('Загруженный файл служит источником данных');expect(exportCalls).toEqual([]);
 await page.getByLabel('Ссылка на вакансию').fill('https://example.com/other');await expect(page.getByRole('button',{name:'Выбрать резюме из списка',exact:true})).toBeDisabled();await expect(page.getByLabel('Текст сопроводительного письма')).toHaveCount(0);
});
test('mobile layout, errors and reset on reload',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('Ссылка на вакансию').fill('https://hh.ru/vacancy/123456');await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();await expect(page.locator('.error[role=alert]')).toContainText('Импорт hh.ru пока не подключён');
 await page.getByLabel('Файл резюме').setInputFiles({name:'resume.doc',mimeType:'application/msword',buffer:Buffer.from('not supported')});await expect(page.locator('.error[role=alert]').last()).toContainText('Импорт hh.ru');await expect(page.getByText(/Старый формат .doc не поддерживается/)).toBeVisible();
 await page.reload();await expect(page.getByLabel('Ссылка на вакансию')).toHaveValue('');await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
 if(process.env.MVP_SCREENSHOT)await page.screenshot({path:process.env.MVP_SCREENSHOT,fullPage:true});
});
test('stale vacancy response cannot restore changed input',async({page})=>{
 let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/mvp/vacancy',async route=>{await wait;await route.fulfill({json:vacancy}).catch(()=>{});});
 await page.goto('/');await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();await page.getByLabel('Ссылка на вакансию').fill('https://example.com/new');release();await expect(page.locator('.vacancy-loaded')).toHaveCount(0);await expect(page.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();
});
