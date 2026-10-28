import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {match,parseVacancy,propose} from '../../lib/engine';
const ownerId='11111111-1111-4111-8111-111111111111';
const state={ownerId,revision:1,original:'SQL',vacancy:'Требования:\nSQL',goal:'',facts:[{id:'f1',text:'SQL',source:'fixture',verified:true}],versions:[],applications:[]};
async function openEditor(page:import('@playwright/test').Page){
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const req=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});
 });
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →'}).click();
 return page.getByRole('region',{name:'AI-разбор требований'});
}
test('explicit consent, exact citations, no workspace writes and accessible result',async({page})=>{
 let requests=0,writes=0;page.on('request',request=>{if(request.url().endsWith('/api/service')&&request.method()==='POST'&&request.postDataJSON().action!=='analyze')writes++;});
 await page.route('**/api/ai-review',route=>{requests++;expect(route.request().postDataJSON()).toEqual({consent:true,revision:1,expectedOwnerId:ownerId});return route.fulfill({json:{ownerId,revision:1,review:{requirements:[{quote:'SQL',evidence_ids:['f1']}]}}});});
 const panel=await openEditor(page);await expect(panel.getByRole('button')).toBeDisabled();expect(requests).toBe(0);
 await panel.getByRole('checkbox').check();await panel.getByRole('button').click();await expect(panel.getByRole('blockquote')).toHaveText('SQL');await expect(panel.getByRole('listitem').last()).toHaveText('SQL');expect(writes).toBe(0);expect(requests).toBe(1);
 expect((await new AxeBuilder({page}).include('[aria-labelledby="ai-review-title"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.screenshot({path:'test-results/ai-review-mobile.png',fullPage:true});
});
test('rejects invented citations then retries explicitly',async({page})=>{
 let count=0;await page.route('**/api/ai-review',route=>{count++;return route.fulfill({json:{ownerId,revision:1,review:{requirements:[{quote:count===1?'Invented fact':'SQL',evidence_ids:['f1']}]}}});});
 const panel=await openEditor(page);await panel.getByRole('checkbox').check();await panel.getByRole('button').click();await expect(panel.getByRole('alert')).toContainText('не прошёл проверку');expect(count).toBe(1);await expect(panel.getByRole('blockquote')).toHaveCount(0);await panel.getByRole('button').click();await expect(panel.getByRole('blockquote')).toHaveText('SQL');expect(count).toBe(2);
});
test('disabled service is explicit and keeps normal analysis',async({page})=>{
 await page.route('**/api/ai-review',route=>route.fulfill({status:503,json:{error:'disabled'}}));
 const panel=await openEditor(page);await panel.getByRole('checkbox').check();await panel.getByRole('button').click();await expect(panel.getByRole('alert')).toContainText('пока не подключён');await expect(page.getByRole('button',{name:'Подтверждаю · сохранить версию'})).toBeVisible();
});
test('real route refuses unauthenticated access before inference',async({request,baseURL})=>{
 const response=await request.post('/api/ai-review',{headers:{origin:baseURL!},data:{consent:true,revision:1,expectedOwnerId:ownerId}});expect(response.status()).toBe(401);expect(response.headers()['cache-control']).toBe('no-store');
});
for(const mismatch of ['owner','revision'])test('rejects response from stale '+mismatch,async({page})=>{
 await page.route('**/api/ai-review',route=>route.fulfill({json:{ownerId:mismatch==='owner'?'22222222-2222-4222-8222-222222222222':ownerId,revision:mismatch==='revision'?2:1,review:{requirements:[{quote:'SQL',evidence_ids:['f1']}]}}}));
 const panel=await openEditor(page);await panel.getByRole('checkbox').check();await panel.getByRole('button').click();await expect(panel.getByRole('alert')).toContainText('не прошёл проверку');await expect(panel.getByRole('blockquote')).toHaveCount(0);
});
