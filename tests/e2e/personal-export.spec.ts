import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const workspace={revision:1,original:'Вымышленный профиль SQL',vacancy:'',goal:'',facts:[],versions:[],applications:[]};
const archive={format:'jobmatch-personal-data-v1',complete:true,scope:'workspace-audit-consent',exported_at:'2026-10-25T00:00:00Z',fact_history_export:'/api/fact-history?export=1',user:{id:'fixture',email:'demo@example.test'},workspace,audit:[],consent:[]};
test('valid personal archive downloads with explicit scope and separate history instructions',async({page})=>{
 await page.route('**/api/service',r=>r.fulfill({json:r.request().method()==='GET'?workspace:archive}));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Настройки',exact:true}).click();
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт профиля, версий и откликов'}).click();
 const file=await downloading;expect(file.suggestedFilename()).toBe('jobmatch-personal-data.json');
 const content=JSON.parse(await readFile((await file.path())!,'utf8'));expect(content).toEqual(archive);
 await expect(page.getByRole('status')).toContainText('Полную историю фактов скачайте отдельно');
});
test('invalid export produces no download and can recover after explicit reload',async({page})=>{
 let downloads=0,valid=false;page.on('download',()=>downloads++);
 await page.route('**/api/service',r=>r.fulfill({json:r.request().method()==='GET'?workspace:valid?archive:{...archive,complete:false,audit:null}}));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Настройки',exact:true}).click();
 await page.getByRole('button',{name:'Экспорт профиля, версий и откликов'}).click();
 await expect(page.locator('.error')).toContainText('Файл не создан');expect(downloads).toBe(0);
 valid=true;await page.getByRole('button',{name:'Загрузить актуальные данные'}).click();
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт профиля, версий и откликов'}).click();await downloading;
 expect(downloads).toBe(1);
});

test('saved-letter archive link is owner-bound and discloses all four source-bearing archive files',async({page})=>{
 const ownerId='11111111-1111-4111-8111-111111111111';
 await page.route('**/api/service',r=>r.fulfill({json:{...workspace,ownerId}}));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Настройки',exact:true}).click();
 await expect(page.getByRole('link',{name:'Скачать историю серверных писем (NDJSON)'})).toHaveAttribute('href','/api/letter-versions?export=1&expectedOwnerId='+ownerId);
 await expect(page.getByText(/Для полного архива скачайте JSON, обе истории и JSON структурированного профиля/)).toContainText('выбранные источники и текст вакансии');
 await expect(page.getByText(/Для полного архива скачайте JSON, обе истории/)).toContainText('четыре файла не являются единым транзакционным снимком');
});
test('missing owner hides saved-letter archive link',async({page})=>{
 await page.route('**/api/service',r=>r.fulfill({json:workspace}));await page.goto('/');
 await page.getByRole('navigation').getByRole('button',{name:'Настройки',exact:true}).click();
 await expect(page.getByRole('link',{name:'Скачать историю серверных писем (NDJSON)'})).toHaveCount(0);
});
