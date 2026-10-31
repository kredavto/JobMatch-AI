import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {ru,en} from '../../lib/i18n';
import {languageCopy} from '../../lib/i18n/preference';
import {structuredProfileCopy} from '../../lib/i18n/structured-profile';
import {structuredProposalCopy} from '../../lib/i18n/structured-proposals';
import {aiProfileCopy} from '../../lib/i18n/ai-profile';
import type {StructuredProfile} from '../../lib/structured-profile';
const ownerId='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const paragraph='😀 Engineer at Orbit, 03/04/2020.',source=paragraph+'\n\nAnalyst at River.';
const initial=():StructuredProfile=>({format:'jobmatch-structured-profile-v1',ownerId,revision:0,workspace_revision:1,source_workspace_revision:1,source_original:source,source_fact_ids:['f1'],source_matches:true,entries:[]});
const state={ownerId,revision:1,original:source,vacancy:'',goal:'',facts:[{id:'f1',text:'Engineer',verified:false,source:'fixture'}],versions:[],applications:[]};
const reply=()=>({ownerId,workspaceRevision:1,profileRevision:0,preview:{format:'jobmatch-ai-profile-preview-v1',contractVersion:'paragraph-quotes-v2',promptVersion:'profile-paragraph-quotes-v2',semanticAssessment:'not-performed',acceptance:'not-accepted',origin:{model:'fixture-model',operatorDeclaredModelDigest:'sha256:'+'a'.repeat(64),modelIdentityVerified:false},sourceBlocks:{eligible:2,excluded:0,total:2},candidates:[{blockId:0,kind:'employment',context:{id:0,quote:paragraph,start:0,end:32},fields:{title:{quote:'Engineer',start:2,end:10},organization:{quote:'Orbit',start:14,end:19},start:{quote:'03/04/2020',start:21,end:31}},unknownFields:['end','description','credential'],dateInterpretation:'not-performed',warnings:['date-uninterpreted']}]}});
async function open(page:Page,locale:'ru'|'en'){
 await page.setViewportSize({width:390,height:844});await page.route('**/api/service',async route=>{expect(route.request().method()).toBe('GET');await route.fulfill({json:state});});
 await page.goto('/');if(locale==='en')await page.getByLabel(languageCopy.ru.label,{exact:true}).selectOption('en');
 await page.getByRole('navigation').getByRole('button',{name:(locale==='en'?en:ru).navigation.profile,exact:true}).click();await page.getByRole('button',{name:structuredProfileCopy(locale).open,exact:true}).click();
 return page.getByRole('region',{name:structuredProfileCopy(locale).title,exact:true});
}
for(const locale of ['ru','en'] as const){
 test(locale+' consent, literal preview, unknown dates and provenance download never write or confirm a record',async({page})=>{
  let writes=0,calls=0;await page.route('**/api/structured-profile',async route=>{if(route.request().method()==='POST')writes++;await route.fulfill({json:initial()});});
  await page.route('**/api/ai-profile',async route=>{calls++;expect(route.request().headers()['x-jobmatch-owner']).toBe(ownerId);expect(route.request().postDataJSON()).toEqual({consent:true,expectedOwnerId:ownerId,workspaceRevision:1,profileRevision:0});await route.fulfill({json:reply()});});
  const panel=await open(page,locale),t=aiProfileCopy(locale),ai=panel.getByRole('region',{name:t.title,exact:true});
  await expect(ai.getByRole('button',{name:t.run,exact:true})).toBeDisabled();await ai.getByRole('checkbox',{name:t.consent,exact:true}).check();await ai.getByRole('button',{name:t.run,exact:true}).click();
  await expect(ai.getByRole('article')).toHaveCount(1);await expect(ai).toContainText('03/04/2020');await expect(ai).toContainText(t.unknown);await expect(ai.getByRole('note')).toContainText(structuredProposalCopy(locale).warnings['date-uninterpreted']);await expect(ai.getByRole('checkbox')).not.toBeChecked();expect(calls).toBe(1);expect(writes).toBe(0);
  await ai.getByText(t.context,{exact:true}).click();await expect(ai.getByRole('blockquote')).toHaveText(paragraph);
  expect((await new AxeBuilder({page}).include('[aria-labelledby="structured-profile-title"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(locale==='en'){const png=await ai.screenshot();console.log('JOBMATCH_AI_PROFILE_PREVIEW_PNG '+png.toString('base64'));}
  const [download]=await Promise.all([page.waitForEvent('download'),ai.getByRole('button',{name:t.download,exact:true}).click()]);expect(download.suggestedFilename()).toBe('jobmatch-ai-profile-preview.json');const path=await download.path();expect(path).not.toBeNull();const saved=JSON.parse(await readFile(path!,'utf8'));expect(saved).toEqual({format:'jobmatch-ai-profile-preview-export-v1',ownerId,workspaceRevision:1,profileRevision:0,sourceOriginal:source,sourceFactIds:['f1'],preview:reply().preview});expect(writes).toBe(0);
  await ai.getByRole('button',{name:t.close,exact:true}).click();await expect(ai.getByRole('article')).toHaveCount(0);expect(writes).toBe(0);expect(calls).toBe(1);
 });
 test(locale+' locale changes preserve an in-flight request without replay and reset per-request consent',async({page})=>{
  let calls=0;let release!:()=>void;const ready=new Promise<void>(resolve=>{release=resolve;});await page.route('**/api/structured-profile',route=>route.fulfill({json:initial()}));await page.route('**/api/ai-profile',async route=>{calls++;await ready;await route.fulfill({json:reply()});});
  const panel=await open(page,locale),t=aiProfileCopy(locale);await panel.getByRole('checkbox',{name:t.consent,exact:true}).check();await panel.getByRole('button',{name:t.run,exact:true}).click();await expect(panel.getByRole('button',{name:t.busy,exact:true})).toBeDisabled();
  const next=locale==='en'?'ru':'en';await page.getByLabel(languageCopy[locale].label,{exact:true}).selectOption(next);await expect(page.getByRole('button',{name:aiProfileCopy(next).busy,exact:true})).toBeDisabled();release();
  const ai=page.getByRole('region',{name:aiProfileCopy(next).title,exact:true});await expect(ai.getByRole('article')).toHaveCount(1);await expect(ai).toContainText('Engineer');await expect(ai.getByRole('checkbox')).not.toBeChecked();expect(calls).toBe(1);
 });
 test(locale+' cancellation ignores a late reply and never starts another request',async({page})=>{
  let calls=0;let release!:()=>void;const ready=new Promise<void>(resolve=>{release=resolve;});await page.route('**/api/structured-profile',route=>route.fulfill({json:initial()}));await page.route('**/api/ai-profile',async route=>{calls++;await ready;await route.fulfill({json:reply()}).catch(()=>{});});
  const panel=await open(page,locale),t=aiProfileCopy(locale),ai=panel.getByRole('region',{name:t.title,exact:true});await ai.getByRole('checkbox').check();await ai.getByRole('button',{name:t.run,exact:true}).click();await ai.getByRole('button',{name:t.cancel,exact:true}).click();release();
  await expect(ai.getByRole('alert')).toHaveText(t.errors.interrupted);await expect(ai.getByRole('article')).toHaveCount(0);await expect(ai.getByRole('button',{name:t.run,exact:true})).toBeDisabled();expect(calls).toBe(1);
 });
 test(locale+' source refresh cancels late preview and preserves a manual draft without moving it to the new source',async({page})=>{
  let current=initial(),writes=0;let release!:()=>void;const ready=new Promise<void>(resolve=>{release=resolve;});await page.route('**/api/structured-profile',async route=>{if(route.request().method()==='POST')writes++;await route.fulfill({json:current});});await page.route('**/api/ai-profile',async route=>{await ready;await route.fulfill({json:reply()}).catch(()=>{});});
  const panel=await open(page,locale),t=aiProfileCopy(locale),p=structuredProfileCopy(locale);await panel.getByLabel(p.source).evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(3,11));await panel.getByRole('button',{name:p.capture,exact:true}).click();
  await panel.getByRole('checkbox',{name:t.consent,exact:true}).check();await panel.getByRole('button',{name:t.run,exact:true}).click();await expect(panel.getByRole('button',{name:t.busy,exact:true})).toBeDisabled();current={...current,source_original:'NEW '+source};await panel.getByRole('button',{name:p.refresh,exact:true}).click();release();
  await expect(panel.getByRole('region',{name:t.title,exact:true}).getByRole('article')).toHaveCount(0);await expect(panel.getByRole('alert')).toHaveText(structuredProposalCopy(locale).stale);await expect(panel.getByRole('group',{name:p.addLegend,exact:true})).toContainText('Engineer');await expect(panel.getByRole('button',{name:p.add,exact:true})).toBeDisabled();expect(writes).toBe(0);
 });
 test(locale+' explicit refresh of the same source clears preview and consent without replay',async({page})=>{
  let calls=0;await page.route('**/api/structured-profile',route=>route.fulfill({json:initial()}));await page.route('**/api/ai-profile',async route=>{calls++;await route.fulfill({json:reply()});});const panel=await open(page,locale),t=aiProfileCopy(locale),ai=panel.getByRole('region',{name:t.title,exact:true});await ai.getByRole('checkbox').check();await ai.getByRole('button',{name:t.run,exact:true}).click();await expect(ai.getByRole('article')).toHaveCount(1);await panel.getByRole('button',{name:structuredProfileCopy(locale).refresh,exact:true}).click();await expect(ai.getByRole('article')).toHaveCount(0);await expect(ai.getByRole('checkbox')).not.toBeChecked();expect(calls).toBe(1);
 });
 test(locale+' mismatching stored source offers no model request controls',async({page})=>{let calls=0;await page.route('**/api/structured-profile',route=>route.fulfill({json:{...initial(),source_matches:false}}));await page.route('**/api/ai-profile',async route=>{calls++;await route.fulfill({json:reply()});});const panel=await open(page,locale);await expect(panel.getByRole('region',{name:aiProfileCopy(locale).title,exact:true})).toHaveCount(0);expect(calls).toBe(0);});
 for(const variant of ['http','owner','range','acceptance','contract'] as const)test(locale+' refuses '+variant+' reply without leaking provider values or allowing export',async({page})=>{
  await page.route('**/api/structured-profile',route=>route.fulfill({json:initial()}));await page.route('**/api/ai-profile',async route=>{const value=reply();if(variant==='http'){await route.fulfill({status:502,json:{error:'PRIVATE provider text'}});return;}if(variant==='contract'){value.preview.contractVersion='paragraph-quotes-v1';value.preview.promptVersion='profile-paragraph-quotes-v1';}if(variant==='owner')value.ownerId=other;if(variant==='range')value.preview.candidates[0].fields.title.start++;if(variant==='acceptance')value.preview.acceptance='accepted';await route.fulfill({json:value});});
  const panel=await open(page,locale),t=aiProfileCopy(locale),ai=panel.getByRole('region',{name:t.title,exact:true});await ai.getByRole('checkbox').check();await ai.getByRole('button',{name:t.run,exact:true}).click();await expect(ai.getByRole('alert')).toHaveText(t.errors.invalid);await expect(ai).not.toContainText('PRIVATE');await expect(ai.getByRole('article')).toHaveCount(0);await expect(ai.getByRole('button',{name:t.download,exact:true})).toHaveCount(0);
 });
}
