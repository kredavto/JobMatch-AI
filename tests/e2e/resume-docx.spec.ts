import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import mammoth from 'mammoth';
import {resumeDocx} from '../../lib/resume-docx';
test('saved version DOCX download binds the owner and preserves text on mobile',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);await page.setViewportSize({width:390,height:844});
 const ownerId='11111111-1111-4111-8111-111111111111',text='Вел продажи B2B.\nРаботал в Битрикс24.';
 await page.route('**/api/service',r=>r.fulfill({json:{ownerId,revision:1,original:'Другой мастер-профиль',vacancy:'SQL',goal:'',facts:[],applications:[],versions:[{id:'saved',created:'2026-10-25T00:00:00Z',text,vacancy:'B2B',score:50,evidence_ids:[]}]}}));
 await page.route('**/api/resume-export?*',async r=>{const url=new URL(r.request().url());expect(url.searchParams.get('id')).toBe('saved');expect(url.searchParams.get('expectedOwnerId')).toBe(ownerId);await r.fulfill({body:Buffer.from(await resumeDocx(text)),headers:{'content-type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','content-disposition':'attachment; filename="jobmatch-resume.docx"'}});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мои версии',exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать DOCX'}).click();const file=await pending;expect(file.suggestedFilename()).toBe('jobmatch-resume.docx');expect((await mammoth.extractRawText({buffer:await readFile((await file.path())!)})).value).toBe('Вел продажи B2B.\n\nРаботал в Битрикс24.\n\n');
});
for(const status of [401,409,429,503,200])test(`DOCX ${status} error stays in workspace and allows explicit retry`,async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);
 const ownerId='11111111-1111-4111-8111-111111111111';
 await page.route('**/api/service',r=>r.fulfill({json:{ownerId,revision:1,original:'Сохраненный профиль',vacancy:'SQL',goal:'',facts:[],applications:[],versions:[{id:'saved',created:'2026-10-25T00:00:00Z',text:'SQL',vacancy:'SQL',score:50,evidence_ids:[]}]}}));
 let requests=0,downloads=0;page.on('download',()=>downloads++);
 await page.route('**/api/resume-export?*',async r=>{requests++;if(requests===1)await r.fulfill({status,json:{error:'untrusted upstream text'}});else await r.fulfill({body:Buffer.from(await resumeDocx('SQL')),contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мои версии',exact:true}).click();await page.getByRole('button',{name:'Скачать DOCX'}).click();
 await expect(page.locator('p[role=alert]')).toBeVisible();await expect(page.getByRole('heading',{name:'История резюме'})).toBeVisible();expect(requests).toBe(1);expect(downloads).toBe(0);await expect(page.getByText('untrusted upstream text')).toHaveCount(0);
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать DOCX'}).click();await pending;expect(requests).toBe(2);await expect(page.locator('p[role=alert]')).toHaveCount(0);
});
test('leaving versions cancels pending DOCX without late download',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);let downloads=0;page.on('download',()=>downloads++);
 await page.route('**/api/service',r=>r.fulfill({json:{ownerId:'11111111-1111-4111-8111-111111111111',revision:1,original:'SQL',vacancy:'SQL',goal:'',facts:[],applications:[],versions:[{id:'saved',created:'2026-10-25T00:00:00Z',text:'SQL',vacancy:'SQL',score:50,evidence_ids:[]}]}}));
 let release!:()=>void;const blocked=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/resume-export?*',async r=>{await blocked;await r.fulfill({body:Buffer.from(await resumeDocx('SQL')),contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}).catch(()=>{});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мои версии',exact:true}).click();await page.getByRole('button',{name:'Скачать DOCX'}).click();await expect(page.getByRole('button',{name:'Подготовка DOCX…'})).toBeDisabled();
 await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();release();await expect(page.getByLabel('Проверьте текст после импорта')).toBeVisible();expect(downloads).toBe(0);
});
