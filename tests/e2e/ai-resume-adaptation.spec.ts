import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {match,parseVacancy,propose} from '../../lib/engine';
const ownerId='11111111-1111-4111-8111-111111111111';
const state={ownerId,revision:1,original:'Name\nSQL',vacancy:'Требования:\nSQL',goal:'',facts:[{id:'f1',text:'SQL',source:'fixture',verified:true}],versions:[],applications:[]};
const preview={format:'jobmatch-ai-resume-adaptation-v1',generator:'ai-selected-literal',modelAcceptance:'not-accepted',review:{requirements:[{quote:'SQL',evidence_ids:['f1']}]}};
async function openEditor(page:import('@playwright/test').Page){
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:state});const req=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →'}).click();
 return page.getByRole('region',{name:'AI-адаптация резюме · эксперимент'});
}
test('click requires consent; manually select and review before literal draft; no writes',async({page})=>{
 let requests=0,writes=0;page.on('request',request=>{if(request.url().endsWith('/api/service')&&request.method()==='POST'&&request.postDataJSON().action!=='analyze')writes++;});
 await page.route('**/api/ai-resume-adaptation',route=>{requests++;expect(route.request().postDataJSON()).toEqual({consent:true,revision:1,expectedOwnerId:ownerId});return route.fulfill({json:{ownerId,revision:1,preview}});});
 const panel=await openEditor(page);await expect(panel.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();expect(requests).toBe(0);
 await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();
 await expect(panel.getByRole('blockquote')).toHaveText('SQL');await expect(panel.getByRole('textbox')).toHaveCount(0);
 await expect(panel.getByRole('button',{name:'Показать проверенный мной черновик'})).toBeDisabled();
 await panel.getByRole('checkbox',{name:'SQL',exact:true}).check();await panel.getByRole('checkbox',{name:'Я проверил(а) выбранные строки и их уместность для вакансии'}).check();await panel.getByRole('button',{name:'Показать проверенный мной черновик'}).click();
 await expect(panel.getByRole('textbox')).toHaveValue(/SQL/);await expect(panel.getByRole('textbox')).toHaveValue(/Name/);expect(writes).toBe(0);expect(requests).toBe(1);
 expect((await new AxeBuilder({page}).include('[aria-labelledby="ai-adaptation-title"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await panel.getByRole('checkbox',{name:'SQL',exact:true}).uncheck();await expect(panel.getByRole('textbox')).toHaveCount(0);
});
for(const kind of ['owner','revision','invented','disabled'])test(`rejects ${kind}, never fabricates a draft`,async({page})=>{
 let calls=0;await page.route('**/api/ai-resume-adaptation',route=>{calls++;return route.fulfill({status:kind==='disabled'?503:200,json:{ownerId:kind==='owner'?'22222222-2222-4222-8222-222222222222':ownerId,revision:kind==='revision'?2:1,preview:kind==='invented'?{...preview,text:'Invented skill'}:preview}});});
 const panel=await openEditor(page);await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();await expect(panel.getByRole('alert')).toBeVisible();await expect(panel.getByRole('textbox')).toHaveCount(0);expect(calls).toBe(1);
});
test('leaving editor discards a draft and late response',async({page})=>{
 let release:()=>void=()=>{};const wait=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/ai-resume-adaptation',async route=>{await wait;await route.fulfill({json:{ownerId,revision:1,preview}}).catch(()=>{});});
 const panel=await openEditor(page);await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();await expect(panel.getByRole('button',{name:'Подбираем строки…'})).toBeDisabled();
 await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();release();await page.getByRole('button',{name:'Проанализировать →'}).click();await expect(panel.getByRole('blockquote')).toHaveCount(0);await expect(panel.getByRole('checkbox').first()).not.toBeChecked();
});
