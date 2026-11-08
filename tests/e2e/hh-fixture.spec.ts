import {test,expect,type Page} from '@playwright/test';
import {runBrowserWorkflow,newBrowserJournal,type BrowserPort} from '../../browser/hh-workflow';
const consent={version:'hh-risk-v1' as const,accepted:true as const,acceptedAt:'2026-11-08T09:40:00.000Z'};
const plan={vacancyId:'fixture-job',resumeId:'fixture-resume',title:'Менеджер B2B',coverLetter:'Синтетический текст письма для изолированного теста.'};
async function fixture(page:Page,options:{captcha?:boolean;isolated?:boolean;lost?:boolean;ack?:boolean;saveAck?:boolean}={}):Promise<BrowserPort>{
 await page.setContent(`<main id="fixture" data-authenticated="true" data-challenge="${!!options.captcha}" data-isolated="${options.isolated!==false}" data-application="absent" data-saved-title="Специалист" data-save-count="0" data-submit-count="0"><input aria-label="Название резюме" value="Специалист"><button id="save">Сохранить</button><textarea aria-label="Письмо"></textarea><button id="apply">Откликнуться</button></main>`);
 await page.evaluate(({ack,saveAck})=>{
  const root=document.querySelector<HTMLElement>('#fixture')!;
  document.querySelector('#save')!.addEventListener('click',()=>{root.dataset.saveCount=String(Number(root.dataset.saveCount)+1);if(saveAck)root.dataset.savedTitle=document.querySelector('input')!.value;});
  document.querySelector('#apply')!.addEventListener('click',()=>{root.dataset.submitCount=String(Number(root.dataset.submitCount)+1);if(ack)root.dataset.application='present';});
 },{ack:options.ack!==false,saveAck:options.saveAck!==false});
 return {
  inspect:async()=>{const data=await page.locator('#fixture').evaluate(el=>({...((el as HTMLElement).dataset)}));return {authenticated:data.authenticated==='true',challenge:data.challenge==='true',fieldsAreResumeLocal:data.isolated==='true',vacancyId:plan.vacancyId,resumeId:plan.resumeId,savedTitle:data.savedTitle!,application:data.application as 'absent'|'present'|'unknown'};},
  saveTitle:async title=>{await page.getByLabel('Название резюме').fill(title);await page.locator('#save').click();},
  submitApplication:async letter=>{await page.getByLabel('Письмо').fill(letter);await page.locator('#apply').click();if(options.lost)throw new Error('synthetic lost response');}
 };
}
test('isolated fixture saves title and submits once, repeat sees existing response',async({page})=>{const port=await fixture(page),journal=newBrowserJournal();expect(await runBrowserWorkflow(port,plan,journal,consent)).toEqual({state:'done'});expect(await runBrowserWorkflow(port,plan,journal,consent)).toEqual({state:'already-applied'});await expect(page.locator('#fixture')).toHaveAttribute('data-submit-count','1');await expect(page.getByLabel('Письмо')).toHaveValue(plan.coverLetter);});
test('CAPTCHA stops without edits and no attempt to solve it',async({page})=>{const port=await fixture(page,{captcha:true});expect(await runBrowserWorkflow(port,plan,newBrowserJournal(),consent)).toEqual({state:'paused',reason:'captcha'});await expect(page.locator('#fixture')).toHaveAttribute('data-save-count','0');await expect(page.locator('#fixture')).toHaveAttribute('data-submit-count','0');});
test('unverified shared-profile scope stops before writing',async({page})=>{const port=await fixture(page,{isolated:false});expect(await runBrowserWorkflow(port,plan,newBrowserJournal(),consent)).toEqual({state:'paused',reason:'shared-profile'});await expect(page.locator('#fixture')).toHaveAttribute('data-save-count','0');});
test('lost submit response is reconciled by reading, never replayed',async({page})=>{const port=await fixture(page,{lost:true}),journal=newBrowserJournal();expect(await runBrowserWorkflow(port,plan,journal,consent)).toEqual({state:'done'});await expect(page.locator('#fixture')).toHaveAttribute('data-submit-count','1');});
test('unknown submit stays paused across retries without duplicate clicks',async({page})=>{const port=await fixture(page,{lost:true,ack:false}),journal=newBrowserJournal();expect(await runBrowserWorkflow(port,plan,journal,consent)).toEqual({state:'paused',reason:'application-unknown'});expect(await runBrowserWorkflow(port,plan,journal,consent)).toEqual({state:'paused',reason:'application-unknown'});await expect(page.locator('#fixture')).toHaveAttribute('data-submit-count','1');});

test('unsaved form value does not count as confirmed resume save',async({page})=>{const port=await fixture(page,{saveAck:false}),journal=newBrowserJournal();expect(await runBrowserWorkflow(port,plan,journal,consent)).toEqual({state:'paused',reason:'save-unknown'});expect(await runBrowserWorkflow(port,plan,journal,consent)).toEqual({state:'paused',reason:'save-unknown'});await expect(page.locator('#fixture')).toHaveAttribute('data-save-count','1');await expect(page.locator('#fixture')).toHaveAttribute('data-submit-count','0');});

test('without explicit current consent no browser action begins',async({page})=>{const port=await fixture(page);expect(await runBrowserWorkflow(port,plan,newBrowserJournal())).toEqual({state:'paused',reason:'consent-required'});await expect(page.locator('#fixture')).toHaveAttribute('data-save-count','0');await expect(page.locator('#fixture')).toHaveAttribute('data-submit-count','0');});
