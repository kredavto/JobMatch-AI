import {test,expect} from '@playwright/test';
import {resumeDocx} from '../../lib/resume-docx';
import {readFile} from 'node:fs/promises';
import mammoth from 'mammoth';
const source='Анна Тестовая\nРаботала менеджером по продажам B2B.\nГотовила отчёты в Excel.\nКомпания А, 2020–2024.';
const vacancy={title:'Менеджер B2B',company:'Пример',url:'https://example.com/job',text:'Нужен менеджер B2B, работа с Excel и CRM, ведение переговоров.',skills:['B2B','Excel','CRM']};
test('four actions, actual DOCX import, adaptation and Word/PDF downloads',async({page})=>{
 await page.route('**/api/mvp/vacancy',route=>route.fulfill({json:vacancy}));
 await page.goto('/');await expect(page.getByRole('button')).toHaveCount(4);
 await page.getByLabel('Файл резюме').setInputFiles({name:'resume.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from(await resumeDocx(source))});
 await expect(page.getByText('Файл загружен и готов к адаптации')).toBeVisible();
 await page.getByLabel('Ссылка на вакансию').fill(vacancy.url);await page.getByRole('button',{name:'Загрузить вакансию',exact:true}).click();
 await page.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();
 await expect(page.getByText('Автоматическая адаптация',{exact:true})).toBeVisible();await expect(page.locator('.resume-preview')).toContainText(source.split('\n')[1]);
 await expect(page.getByLabel('Текст сопроводительного письма')).toHaveValue(/Менеджер B2B/);
 let pending=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать резюме',exact:true}).click();const word=await pending;expect(word.suggestedFilename()).toBe('Менеджер B2B.docx');expect((await mammoth.extractRawText({buffer:await readFile((await word.path())!)})).value).toContain('Компания А, 2020–2024.');
 await page.getByLabel('Формат скачивания').selectOption('pdf');pending=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать резюме',exact:true}).click();const pdf=await pending;expect((await readFile((await pdf.path())!)).subarray(0,5).toString()).toBe('%PDF-');
 await page.getByLabel('Ссылка на вакансию').fill('https://example.com/other');await expect(page.getByRole('button',{name:'Скачать резюме',exact:true})).toBeDisabled();await expect(page.getByLabel('Текст сопроводительного письма')).toHaveCount(0);
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
