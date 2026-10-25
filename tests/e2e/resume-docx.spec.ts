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
 const pending=page.waitForEvent('download');await page.getByRole('link',{name:'Скачать DOCX'}).click();const file=await pending;expect(file.suggestedFilename()).toBe('jobmatch-resume.docx');expect((await mammoth.extractRawText({buffer:await readFile((await file.path())!)})).value).toBe('Вел продажи B2B.\n\nРаботал в Битрикс24.\n\n');
});
