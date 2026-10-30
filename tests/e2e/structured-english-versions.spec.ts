import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {snapshot,owner,previewFor,versionFor} from '../fixtures/structured-version';
import {structuredVersionCopy} from '../../lib/i18n/structured-version';
import {languageCopy} from '../../lib/i18n/preference';
const EN='structured-literal-en-v1' as const;
const state={ownerId:owner,revision:1,original:snapshot.source_original,vacancy:'',goal:'',facts:[{id:'f1',text:'Python',verified:false,source:'fixture'}],versions:[],applications:[]};
async function open(page:Page){
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/service',route=>route.fulfill({json:state}));
 await page.route('**/api/structured-profile',route=>route.fulfill({json:snapshot}));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 await page.getByRole('button',{name:'Открыть структурированный профиль'}).click();
 return page.getByRole('region',{name:structuredVersionCopy('ru').title,exact:true});
}
const summary=(v:Awaited<ReturnType<typeof versionFor>>)=>({id:v.id,created:v.created,template_version:v.template_version,profile_revision:2,workspace_revision:1,text_length:Array.from(v.text).length,preview_hash:v.preview_hash});
test('explicit English document survives UI locale changes; mixed history and exact JSON/TXT exports',async({page})=>{
 const ru=structuredVersionCopy('ru'),en=structuredVersionCopy('en'),preview=await previewFor(snapshot,EN),version=await versionFor(snapshot,EN),legacy={...await versionFor(),id:'44444444-4444-4444-8444-444444444444'};
 const writes:unknown[]=[];let reads=0;
 await page.route('**/api/structured-versions*',route=>{
  if(route.request().method()==='GET'){reads++;return route.fulfill({json:route.request().url().includes('?id=')?(route.request().url().includes(legacy.id)?legacy:version):{format:'jobmatch-structured-version-list-v1',ownerId:owner,versions:[summary(legacy),summary(version)]}});}
  const body=route.request().postDataJSON();writes.push(body);expect(body.templateVersion).toBe(EN);expect(body.expectedOwnerId).toBe(owner);
  return route.fulfill({json:body.action==='save'?version:preview});
 });
 let panel=await open(page);await expect(panel.getByLabel(ru.templateLabel)).toHaveValue('structured-literal-v1');
 await panel.getByLabel(ru.templateLabel).selectOption(EN);await panel.getByRole('checkbox',{name:'Включить: Python'}).check();
 await panel.getByRole('button',{name:ru.preview,exact:true}).click();await panel.getByRole('checkbox',{name:ru.accept,exact:true}).check();
 await page.getByLabel(languageCopy.ru.label,{exact:true}).selectOption('en');panel=page.getByRole('region',{name:en.title,exact:true});
 await expect(panel.getByLabel(en.templateLabel)).toHaveValue(EN);await expect(panel.getByRole('checkbox',{name:en.accept,exact:true})).toBeChecked();await expect(panel.locator('pre').first()).toHaveText(preview.text);expect(writes).toHaveLength(1);
 await panel.getByRole('button',{name:en.save,exact:true}).click();await expect(panel.getByText(en.savedTitle,{exact:true})).toBeVisible();expect(writes).toHaveLength(2);
 const jsonPending=page.waitForEvent('download');await panel.getByRole('button',{name:en.downloadJson,exact:true}).click();const json=JSON.parse(await readFile((await (await jsonPending).path())!,'utf8'));expect(json).toEqual(version);
 const txtPending=page.waitForEvent('download');await panel.getByRole('button',{name:en.downloadText,exact:true}).click();expect(await readFile((await (await txtPending).path())!,'utf8')).toBe(version.text);
 await panel.getByLabel(en.templateLabel).selectOption('structured-literal-v1');await expect(panel.locator('pre').first()).toHaveText(version.text);
 await panel.getByRole('button',{name:en.history,exact:true}).click();await panel.getByRole('button',{name:en.open(legacy.id),exact:true}).click();await expect(panel.locator('pre').first()).toHaveText(legacy.text);
 await panel.getByRole('button',{name:en.open(version.id),exact:true}).click();await expect(panel.locator('pre').first()).toHaveText(version.text);expect(reads).toBe(3);expect(writes).toHaveLength(2);
 expect((await new AxeBuilder({page}).include('[aria-labelledby="structured-profile-title"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const jpeg=await panel.screenshot({type:'jpeg',quality:75,path:'test-results/structured-english-mobile.jpg'});console.log('JOBMATCH_SYNTHETIC_STRUCTURED_ENGLISH_JPEG '+jpeg.toString('base64'));
});
test('changing document template discards preview/approval and a valid alternate-language reply is rejected',async({page})=>{
 const ru=structuredVersionCopy('ru'),enPreview=await previewFor(snapshot,EN),legacy=await previewFor();let requests=0;
 await page.route('**/api/structured-versions',route=>{requests++;return route.fulfill({json:requests===1?enPreview:enPreview});});
 const panel=await open(page);await panel.getByLabel(ru.templateLabel).selectOption(EN);await panel.getByRole('checkbox',{name:'Включить: Python'}).check();await panel.getByRole('button',{name:ru.preview,exact:true}).click();await panel.getByRole('checkbox',{name:ru.accept,exact:true}).check();
 await panel.getByLabel(ru.templateLabel).selectOption('structured-literal-v1');await expect(panel.getByRole('button',{name:ru.save,exact:true})).toHaveCount(0);await expect(panel.getByRole('checkbox',{name:ru.accept,exact:true})).toHaveCount(0);
 await panel.getByRole('button',{name:ru.preview,exact:true}).click();await expect(panel.getByRole('alert')).toHaveCount(2);await expect(panel.locator('pre')).toHaveCount(0);expect(requests).toBe(2);expect(enPreview.preview_hash).not.toBe(legacy.preview_hash);
});
test('pending English preview locks template and selection while global locale changes do not replay',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let writes=0;
 await page.route('**/api/structured-versions',async route=>{writes++;expect(route.request().postDataJSON().templateVersion).toBe(EN);await held;return route.fulfill({json:await previewFor(snapshot,EN)});});
 const ru=structuredVersionCopy('ru'),en=structuredVersionCopy('en');let panel=await open(page);
 await panel.getByLabel(ru.templateLabel).selectOption(EN);await panel.getByRole('checkbox',{name:'Включить: Python'}).check();
 await panel.getByRole('button',{name:ru.preview,exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect.poll(()=>writes).toBe(1);
 await expect(panel.getByLabel(ru.templateLabel)).toBeDisabled();await page.getByLabel(languageCopy.ru.label,{exact:true}).selectOption('en');
 panel=page.getByRole('region',{name:en.title,exact:true});await expect(panel.getByLabel(en.templateLabel)).toHaveValue(EN);release();await expect(panel.getByText(en.previewTitle,{exact:true})).toBeVisible();await expect(panel.getByRole('button',{name:en.save,exact:true})).toBeDisabled();expect(writes).toBe(1);
});
test('lost English save requires manual history reconciliation without a write retry or implicit language change',async({page})=>{
 const ru=structuredVersionCopy('ru'),version=await versionFor(snapshot,EN);let saves=0;
 await page.route('**/api/structured-versions*',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:route.request().url().includes('?id=')?version:{format:'jobmatch-structured-version-list-v1',ownerId:owner,versions:[summary(version)]}});
  if(route.request().postDataJSON().action==='preview')return route.fulfill({json:await previewFor(snapshot,EN)});saves++;return route.fulfill({status:503,json:{error:'synthetic lost acknowledgement'}});
 });
 const panel=await open(page);await panel.getByLabel(ru.templateLabel).selectOption(EN);await panel.getByRole('checkbox',{name:'Включить: Python'}).check();await panel.getByRole('button',{name:ru.preview,exact:true}).click();await panel.getByRole('checkbox',{name:ru.accept,exact:true}).check();await panel.getByRole('button',{name:ru.save,exact:true}).click();
 await expect(panel.getByLabel(ru.templateLabel)).toBeDisabled();await panel.getByRole('button',{name:ru.history,exact:true}).click();await panel.getByRole('button',{name:ru.open(version.id),exact:true}).click();await expect(panel.getByText(ru.savedTitle,{exact:true})).toBeVisible();await expect(panel.getByRole('button',{name:ru.save,exact:true})).toBeDisabled();expect(saves).toBe(1);
});
