import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {ru,en} from '../../lib/i18n';
import {languageCopy} from '../../lib/i18n/preference';
import {structuredProfileCopy} from '../../lib/i18n/structured-profile';
import {structuredProposalCopy} from '../../lib/i18n/structured-proposals';
import type {StructuredProfile} from '../../lib/structured-profile';
const ownerId='11111111-1111-4111-8111-111111111111',entryId='22222222-2222-4222-8222-222222222222';
const source='😀 MANUAL\nEmployment\nPosition: Engineer\nOrganization: Orbit\nStart: 03/04/2020\nEnd: present';
const fields={title:{quote:'Engineer',start:30,end:38},organization:{quote:'Orbit',start:53,end:58},start:{quote:'03/04/2020',start:66,end:76},end:{quote:'present',start:82,end:89}};
const initial=():StructuredProfile=>({format:'jobmatch-structured-profile-v1',ownerId,revision:0,workspace_revision:1,source_workspace_revision:1,source_original:source,source_fact_ids:['f1'],source_matches:true,entries:[]});
const state={ownerId,revision:1,original:source,vacancy:'',goal:'',facts:[{id:'f1',text:'MANUAL',verified:false,source:'fixture'}],versions:[],applications:[]};
async function open(page:Page,locale:'ru'|'en'){
 await page.setViewportSize({width:390,height:844});await page.route('**/api/service',async route=>{expect(route.request().method()).toBe('GET');await route.fulfill({json:state});});
 await page.goto('/');if(locale==='en')await page.getByLabel(languageCopy.ru.label,{exact:true}).selectOption('en');
 await page.getByRole('navigation').getByRole('button',{name:(locale==='en'?en:ru).navigation.profile,exact:true}).click();
 await page.getByRole('button',{name:structuredProfileCopy(locale).open,exact:true}).click();
 return page.getByRole('region',{name:structuredProfileCopy(locale).title,exact:true});
}
for(const locale of ['ru','en'] as const){
 test(locale+' suggestions preview/cancel/copy do not write; explicit save remains unconfirmed until a separate command',async({page})=>{
  test.setTimeout(45000);let profile=initial(),writes=0;
  await page.route('**/api/structured-profile',async route=>{
   if(route.request().method()==='POST'){
    const body=route.request().postDataJSON();expect(body.expectedOwnerId).toBe(ownerId);expect(body.workspaceRevision).toBe(1);expect(body.profileRevision).toBe(profile.revision);writes++;
    if(body.command.action==='add'){expect(body.command).toEqual({action:'add',kind:'employment',fields});profile={...profile,revision:1,entries:[{id:entryId,kind:'employment',fields,confirmed:false,created:'2026-10-30T00:00:00Z'}]};}
    else{expect(body.command).toEqual({action:'confirm',id:entryId,confirmed:true});profile={...profile,revision:2,entries:profile.entries.map(entry=>({...entry,confirmed:true}))};}
   }await route.fulfill({json:profile});
  });
  const panel=await open(page,locale),t=structuredProposalCopy(locale),p=structuredProfileCopy(locale),proposals=panel.getByRole('region',{name:t.title,exact:true});
  await proposals.getByRole('button',{name:t.run,exact:true}).click();await expect(proposals.getByRole('note')).toHaveText(t.warnings['date-uninterpreted']);
  await expect(proposals).toContainText('Engineer');expect(writes).toBe(0);
  await proposals.getByRole('button',{name:t.close,exact:true}).click();await expect(proposals.getByRole('article')).toHaveCount(0);expect(writes).toBe(0);
  await proposals.getByRole('button',{name:t.run,exact:true}).click();
  expect((await new AxeBuilder({page}).include('[aria-labelledby="structured-profile-title"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(locale==='en'){const png=await proposals.screenshot();console.log('JOBMATCH_STRUCTURED_PROPOSAL_PNG '+png.toString('base64'));}
  await proposals.getByRole('button',{name:t.adopt(1),exact:true}).click();expect(writes).toBe(0);await expect(panel.getByRole('button',{name:p.add,exact:true})).toBeEnabled();
  await panel.getByRole('button',{name:p.add,exact:true}).click();await expect(panel.getByRole('checkbox',{name:p.confirm,exact:true})).not.toBeChecked();expect(writes).toBe(1);
  await panel.getByRole('checkbox',{name:p.confirm,exact:true}).check();await expect(panel.getByRole('checkbox',{name:p.confirm,exact:true})).toBeChecked();expect(writes).toBe(2);
 });
 test(locale+' a captured manual draft cannot be overwritten by a suggestion',async({page})=>{
  test.setTimeout(45000);let writes=0;await page.route('**/api/structured-profile',async route=>{if(route.request().method()==='POST')writes++;await route.fulfill({json:initial()});});
  const panel=await open(page,locale),t=structuredProposalCopy(locale),p=structuredProfileCopy(locale);
  await panel.getByLabel(p.source,{exact:true}).evaluate((element:HTMLTextAreaElement)=>{element.focus();element.setSelectionRange(3,9);});
  await panel.getByRole('button',{name:p.capture,exact:true}).click();await expect(panel.getByRole('definition')).toContainText('MANUAL');
  const proposals=panel.getByRole('region',{name:t.title,exact:true});await proposals.getByRole('button',{name:t.run,exact:true}).click();await expect(proposals.getByRole('button',{name:t.adopt(1),exact:true})).toBeDisabled();
  await panel.getByRole('button',{name:t.clear,exact:true}).click();await expect(proposals.getByRole('button',{name:t.adopt(1),exact:true})).toBeEnabled();
  await proposals.getByRole('button',{name:t.adopt(1),exact:true}).click();await expect(panel.getByRole('group',{name:p.addLegend,exact:true})).toContainText('Engineer');expect(writes).toBe(0);
 });
 test(locale+' locale change preserves suggestions and draft source without replaying a write',async({page})=>{
  test.setTimeout(45000);let reads=0,writes=0;await page.route('**/api/structured-profile',async route=>{if(route.request().method()==='GET')reads++;else writes++;await route.fulfill({json:initial()});});
  const panel=await open(page,locale),t=structuredProposalCopy(locale);await panel.getByRole('button',{name:t.run,exact:true}).click();await panel.getByRole('button',{name:t.adopt(1),exact:true}).click();
  const next=locale==='ru'?'en':'ru';await page.getByLabel(languageCopy[locale].label,{exact:true}).selectOption(next);
  const nextPanel=page.getByRole('region',{name:structuredProfileCopy(next).title,exact:true});await expect(nextPanel.getByRole('region',{name:structuredProposalCopy(next).title,exact:true})).toContainText('03/04/2020');
  await expect(nextPanel.getByRole('button',{name:structuredProposalCopy(next).adopt(1),exact:true})).toBeDisabled();await expect(nextPanel.getByRole('group',{name:structuredProfileCopy(next).addLegend,exact:true})).toContainText('Engineer');
  expect(reads).toBe(1);expect(writes).toBe(0);
 });
 test(locale+' changing only the loaded source clears proposals and blocks the preserved old draft',async({page})=>{
  test.setTimeout(45000);let profile=initial(),writes=0;await page.route('**/api/structured-profile',async route=>{if(route.request().method()==='POST')writes++;await route.fulfill({json:profile});});
  const panel=await open(page,locale),t=structuredProposalCopy(locale),p=structuredProfileCopy(locale);
  await panel.getByRole('button',{name:t.run,exact:true}).click();await panel.getByRole('button',{name:t.adopt(1),exact:true}).click();
  profile={...profile,source_original:source.replace('Engineer','NEW Engineer')};
  await panel.getByRole('button',{name:p.refresh,exact:true}).click();
  await expect(panel.getByRole('region',{name:t.title,exact:true}).getByRole('article')).toHaveCount(0);await expect(panel.getByRole('alert')).toHaveText(t.stale);
  await expect(panel.getByRole('group',{name:p.addLegend,exact:true})).toContainText('Engineer');await expect(panel.getByRole('button',{name:p.add,exact:true})).toBeDisabled();
  await panel.getByRole('button',{name:t.clear,exact:true}).click();await panel.getByRole('button',{name:t.run,exact:true}).click();await expect(panel.getByRole('region',{name:t.title,exact:true})).toContainText('NEW Engineer');expect(writes).toBe(0);
 });
 test(locale+' a lost save response preserves draft, blocks replay and requires an explicit read',async({page})=>{
  test.setTimeout(45000);let profile=initial(),writes=0;
  await page.route('**/api/structured-profile',async route=>{
   if(route.request().method()==='POST'){writes++;profile={...profile,revision:1,entries:[{id:entryId,kind:'employment',fields,confirmed:false,created:'2026-10-30T00:00:00Z'}]};await route.fulfill({status:503,json:{error:'Synthetic unavailable'}});return;}
   await route.fulfill({json:profile});
  });
  const panel=await open(page,locale),t=structuredProposalCopy(locale),p=structuredProfileCopy(locale);
  await panel.getByRole('button',{name:t.run,exact:true}).click();await panel.getByRole('button',{name:t.adopt(1),exact:true}).click();await panel.getByRole('button',{name:p.add,exact:true}).click();
  await expect(panel.getByRole('alert')).toContainText(p.noRetry);await expect(panel.getByRole('button',{name:p.add,exact:true})).toBeDisabled();await expect(panel.getByRole('button',{name:t.run,exact:true})).toBeDisabled();expect(writes).toBe(1);
  await panel.getByRole('button',{name:p.refresh,exact:true}).click();await expect(panel.getByRole('checkbox',{name:p.confirm,exact:true})).not.toBeChecked();expect(writes).toBe(1);
  await expect(panel.getByRole('group',{name:p.addLegend,exact:true})).toContainText('Engineer');
 });
 test(locale+' an outdated source offers no automatic proposals or writes',async({page})=>{
  test.setTimeout(45000);let writes=0;await page.route('**/api/structured-profile',async route=>{if(route.request().method()==='POST')writes++;await route.fulfill({json:{...initial(),source_matches:false}});});
  const panel=await open(page,locale);await expect(panel.getByRole('region',{name:structuredProposalCopy(locale).title,exact:true})).toHaveCount(0);await expect(panel).toContainText(structuredProfileCopy(locale).stale);expect(writes).toBe(0);
 });
}
