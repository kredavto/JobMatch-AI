import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const ownerId='11111111-1111-4111-8111-111111111111';
const state={ownerId,revision:1,original:'Saved profile',vacancy:'SQL',goal:'',facts:[],versions:[],applications:[]};
test('mobile OCR draft requires review and explicit saving; errors preserve it without retries',async({page})=>{
 await page.setViewportSize({width:390,height:844});let saves=0,uploads=0,reply:unknown={text:'OCR Иван Тестов SQL 2024',ocrPages:2},status=200;
 await page.route('**/api/service',r=>{if(r.request().method()==='GET')return r.fulfill({json:state});saves++;const body=r.request().postDataJSON();expect(body.action).toBe('import');expect(body.text).toBe('Проверенный вручную SQL 2025');return r.fulfill({json:{...state,revision:2,original:body.text}});});
 await page.route('**/api/import',r=>{uploads++;expect(r.request().headers()['x-jobmatch-owner']).toBe(ownerId);return r.fulfill({status,json:reply});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();const draft=page.getByLabel('Проверьте текст после импорта');
 const file=()=>page.getByLabel('Загрузить TXT, DOCX, PDF · до 4 МБ').setInputFiles({name:'synthetic-scan.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-synthetic')});
 await file();await expect(draft).toHaveValue('OCR Иван Тестов SQL 2024');await expect(page.getByRole('status')).toContainText('OCR (страниц: 2)');await expect(page.getByRole('status')).toContainText('Проверьте имена, даты и числа');expect(saves).toBe(0);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:test.info().outputPath('ocr-review.png')});
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await draft.fill('Проверенный вручную SQL 2025');status=400;reply={error:'Для OCR допускается не более 3 сканированных страниц.'};await file();await expect(page.locator('.error[role=alert]')).toContainText('не более 3');await expect(draft).toHaveValue('Проверенный вручную SQL 2025');expect(uploads).toBe(2);expect(saves).toBe(0);
 status=200;reply={text:'Untrusted output',ocrPages:99};await file();await expect(page.locator('.error[role=alert]')).toContainText('Некорректный ответ импорта');await expect(draft).toHaveValue('Проверенный вручную SQL 2025');expect(uploads).toBe(3);expect(saves).toBe(0);
 await page.getByRole('button',{name:'Сохранить мастер-профиль'}).click();await expect(page.getByRole('status')).toHaveText('Сохранено');expect(saves).toBe(1);
});
