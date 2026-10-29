import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const ownerId='11111111-1111-4111-8111-111111111111',entryId='22222222-2222-4222-8222-222222222222';
const state={ownerId,revision:1,original:'😀 Python\nОрбита',vacancy:'',goal:'',facts:[{id:'f1',text:'😀 Python',verified:false,source:'fixture'}],versions:[],applications:[]};
const initial=()=>({format:'jobmatch-structured-profile-v1',ownerId,revision:0,workspace_revision:1,source_workspace_revision:1,source_original:state.original,source_fact_ids:['f1'],source_matches:true,entries:[] as {id:string;kind:string;fields:Record<string,unknown>;confirmed:boolean;created:string}[]});
async function open(page:Page){await page.setViewportSize({width:390,height:844});await page.route('**/api/service',route=>route.fulfill({json:state}));await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();return page.getByRole('region',{name:'Структурированный профиль',exact:true});}
async function selectTitle(page:Page){await page.getByLabel('Сохранённый источник структуры').evaluate((element:HTMLTextAreaElement)=>{element.focus();element.setSelectionRange(3,9);});await page.getByRole('button',{name:'Взять выделенный фрагмент',exact:true}).click();}
test('manual source capture → unconfirmed record → explicit confirmation → export; mobile a11y',async({page})=>{
 let profile=initial(),writes=0,workspaceWrites=0;
 page.on('request',request=>{if(request.url().endsWith('/api/service')&&request.method()==='POST')workspaceWrites++;});
 await page.route('**/api/structured-profile',route=>{if(route.request().method()==='POST'){
  const body=route.request().postDataJSON();expect(body.expectedOwnerId).toBe(ownerId);expect(body.workspaceRevision).toBe(1);expect(body.profileRevision).toBe(profile.revision);writes++;
  if(body.command.action==='add'){expect(body.command).toEqual({action:'add',kind:'employment',fields:{title:{quote:'Python',start:2,end:8}}});profile={...profile,revision:profile.revision+1,entries:[{id:entryId,kind:'employment',fields:body.command.fields,confirmed:false,created:'2026-10-29T00:00:00Z'}]};}
  else{expect(body.command).toEqual({action:'confirm',id:entryId,confirmed:true});profile={...profile,revision:profile.revision+1,entries:profile.entries.map(row=>({...row,confirmed:true}))};}
 }return route.fulfill({json:profile});});
 const panel=await open(page);expect(writes).toBe(0);await panel.getByRole('button',{name:'Открыть структурированный профиль'}).click();await selectTitle(page);await panel.getByRole('button',{name:'Сохранить неподтверждённую запись'}).click();
 const checkbox=panel.getByRole('checkbox',{name:'Подтверждаю точность и смысл всех полей этой записи'});await expect(checkbox).not.toBeChecked();await checkbox.click();await expect(checkbox).toBeChecked();expect(writes).toBe(2);expect(workspaceWrites).toBe(0);
 const pending=page.waitForEvent('download');await panel.getByRole('button',{name:'Скачать структуру и источник'}).click();expect((await pending).suggestedFilename()).toBe('jobmatch-structured-profile.json');
 expect((await new AxeBuilder({page}).include('[aria-labelledby="structured-profile-title"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/structured-profile-mobile.png',fullPage:true});
});
test('stale source is retained until explicit reset; no automatic write',async({page})=>{
 let profile={...initial(),revision:1,source_workspace_revision:0,source_original:'Old SQL',source_fact_ids:['old-id'],source_matches:false},writes=0;
 await page.route('**/api/structured-profile',route=>{if(route.request().method()==='POST'){writes++;expect(route.request().postDataJSON().command).toEqual({action:'reset',confirm:'RESET_STRUCTURED_PROFILE'});profile={...initial(),revision:2};}return route.fulfill({json:profile});});
 const panel=await open(page);await panel.getByRole('button',{name:'Открыть структурированный профиль'}).click();await expect(panel.getByLabel('Сохранённый источник структуры')).toHaveValue('Old SQL');await expect(panel.getByText(/Прежняя структура сохранена/)).toBeVisible();expect(writes).toBe(0);
 await panel.getByText('Явный сброс структуры',{exact:true}).click();await expect(panel.getByRole('button',{name:'Сбросить структуру',exact:true})).toBeDisabled();await panel.getByRole('checkbox',{name:'Разрешаю удалить все записи структуры и заменить её источник'}).check();await panel.getByRole('button',{name:'Сбросить структуру',exact:true}).click();await expect(panel.getByLabel('Сохранённый источник структуры')).toHaveValue(state.original);expect(writes).toBe(1);
});
test('lost write leaves draft and blocks retries until explicit reload',async({page})=>{
 let writes=0;await page.route('**/api/structured-profile',route=>{if(route.request().method()==='POST'){writes++;return route.fulfill({status:503,json:{error:'Synthetic unavailable'}});}return route.fulfill({json:initial()});});
 const panel=await open(page);await panel.getByRole('button',{name:'Открыть структурированный профиль'}).click();await selectTitle(page);await panel.getByRole('button',{name:'Сохранить неподтверждённую запись'}).click();await expect(panel.getByRole('alert')).toContainText('Synthetic unavailable');await expect(panel.getByRole('button',{name:'Сохранить неподтверждённую запись'})).toBeDisabled();await expect(panel.getByRole('definition')).toContainText('Python');expect(writes).toBe(1);
});
test('foreign or forged profile cannot display private entries',async({page})=>{
 await page.route('**/api/structured-profile',route=>route.fulfill({json:{...initial(),ownerId:entryId,source_original:'private other-owner source'}}));const panel=await open(page);await panel.getByRole('button',{name:'Открыть структурированный профиль'}).click();await expect(panel.getByRole('alert')).toBeVisible();await expect(panel.getByLabel('Сохранённый источник структуры')).toHaveCount(0);await expect(panel).not.toContainText('private other-owner source');
});
