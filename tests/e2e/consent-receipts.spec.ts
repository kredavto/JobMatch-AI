import {test,expect,type Page,type Route} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {ru,en} from '../../lib/i18n';
import {consentCopy} from '../../lib/i18n/consent-receipts';
import {consentOwner,noticeFor,receiptFor,pageFromReceipts} from '../fixtures/consent-receipts';
import type {ConsentReceipt,ProcessingNotice} from '../../lib/consent-receipts';
const source=(locale:'ru'|'en')=>locale==='ru'?'SYNTHETIC ONLY 😀\r\nНе юридический текст.\n<script>window.__noticeExecuted=true</script>  ':'SYNTHETIC ONLY 😀\r\nNo legal approval.\n<script>window.__noticeExecuted=true</script>  ';
const workspace={ownerId:consentOwner,revision:0,original:'',vacancy:'',goal:'',facts:[],versions:[],applications:[]};
async function service(page:Page){await page.route('**/api/service',route=>route.fulfill({json:route.request().method()==='GET'?workspace:{ok:true}}));}
async function open(page:Page,baseURL:string,locale:'ru'|'en'='ru'){
 await page.context().addCookies([{name:'jobmatch-ui-locale',value:locale,url:baseURL}]);await page.goto('/');
 await page.getByRole('navigation').getByRole('button',{name:(locale==='en'?en:ru).navigation.settings,exact:true}).click();
 return page.getByRole('region',{name:consentCopy[locale].region,exact:true});
}
function query(route:Route){const url=new URL(route.request().url());expect(url.searchParams.get('expectedOwnerId')).toBe(consentOwner);return {locale:url.searchParams.get('locale') as 'ru'|'en',after:Number(url.searchParams.get('after')??0),through:url.searchParams.has('through')?Number(url.searchParams.get('through')):undefined};}
async function publication(){return {ru:await noticeFor('ru','synthetic-ru-v1',source('ru')),en:await noticeFor('en','synthetic-en-v1',source('en'))};}
for(const locale of ['ru','en'] as const)test(locale+' exact displayed notice survives UI language change and exports a complete receipt',async({page,baseURL})=>{
 await service(page);await page.setViewportSize({width:390,height:844});const notices=await publication(),records:ConsentReceipt[]=[],writes:Record<string,unknown>[]=[];let reads=0;
 await page.route('**/api/consent-receipts?*',async route=>{
  if(route.request().method()==='GET'){reads++;const q=query(route);return route.fulfill({json:{page:pageFromReceipts(records,notices[q.locale],q.after,q.through),acceptanceEnabled:true}});}
  const body=route.request().postDataJSON();writes.push(body);expect(Object.keys(body).sort()).toEqual(['acknowledged','commandId','expectedSequence','noticeLocale','noticeSha256','noticeVersion'].sort());expect(body.acknowledged).toBe(true);expect(body.noticeLocale).toBe(locale);expect(body.noticeSha256).toBe(notices[locale].sha256);expect(body.expectedSequence).toBe(0);
  const receipt={...await receiptFor(1,notices[locale]),commandId:body.commandId};records.push(receipt);return route.fulfill({json:receipt});
 });
 let panel=await open(page,baseURL!,locale);expect(reads).toBe(0);expect(writes).toHaveLength(0);
 await panel.getByRole('button',{name:consentCopy[locale].load,exact:true}).click();
 await expect(panel.getByRole('region',{name:consentCopy[locale].noticeTitle,exact:true})).toContainText('SYNTHETIC ONLY');
 expect(await panel.locator('.consent-text pre').textContent()).toBe(notices[locale].text);
 expect(await page.evaluate(()=>(window as unknown as {__noticeExecuted?:boolean}).__noticeExecuted)).toBeUndefined();
 await expect(panel.getByRole('button',{name:consentCopy[locale].accept,exact:true})).toBeDisabled();await panel.getByRole('checkbox').check();expect(writes).toHaveLength(0);
 if(locale==='en'){
  expect((await new AxeBuilder({page}).include('.consent-panel').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const jpeg=await panel.screenshot({type:'jpeg',quality:45});console.log('JOBMATCH_SYNTHETIC_CONSENT_EN_JPEG '+jpeg.toString('base64'));
 }
 const other=locale==='ru'?'en':'ru';await page.getByRole('combobox').first().selectOption(other);panel=page.getByRole('region',{name:consentCopy[other].region,exact:true});
 await expect(panel.getByRole('checkbox')).toBeChecked();await expect(panel.getByRole('combobox',{name:consentCopy[other].noticeLanguage,exact:true})).toHaveValue(locale);expect(await panel.locator('.consent-text pre').textContent()).toBe(notices[locale].text);expect(reads).toBe(1);
 await panel.getByRole('button',{name:consentCopy[other].accept,exact:true}).click();await expect(panel.getByRole('status')).toContainText(consentCopy[other].saved);await expect(panel).toContainText(consentCopy[other].already);
 expect(writes).toHaveLength(1);expect(reads).toBe(2);expect(records[0].notice.locale).toBe(locale);
 const downloaded=page.waitForEvent('download');await panel.getByRole('button',{name:consentCopy[other].export,exact:true}).click();const file=await downloaded;expect(file.suggestedFilename()).toBe('jobmatch-consent-receipts.json');
 const exported=JSON.parse(await readFile((await file.path())!,'utf8'));expect(exported).toMatchObject({format:'jobmatch-consent-receipts-v1',complete:true,ownerId:consentOwner,snapshotSequence:1,assurance:'user-reports-not-independent-legal-or-signature-proof'});expect(exported.receipts).toEqual(records);expect(exported.receipts[0].notice.text).toBe(notices[locale].text);expect(exported.legacyObservation.kind).toBe('legacy-workspace-observation');expect(exported.legacyObservation.observedAt).toBe('2020-01-01T00:00:00Z');
 await panel.getByText(consentCopy[other].legacy,{exact:true}).click();await expect(panel).toContainText(consentCopy[other].legacyHelp);expect(writes).toHaveLength(1);
});
test('pending acceptance is synchronous, follows the selected UI language and never replays on locale change',async({page,baseURL})=>{
 await service(page);const notice=await noticeFor(),records:ConsentReceipt[]=[];let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let writes=0;
 await page.route('**/api/consent-receipts?*',async route=>{
  if(route.request().method()==='GET'){const q=query(route);return route.fulfill({json:{page:pageFromReceipts(records,notice,q.after,q.through),acceptanceEnabled:true}});}
  writes++;const body=route.request().postDataJSON();const receipt={...await receiptFor(1,notice),commandId:body.commandId};records.push(receipt);await held;return route.fulfill({json:receipt});
 });
 let panel=await open(page,baseURL!);await panel.getByRole('button',{name:consentCopy.ru.load,exact:true}).click();await panel.getByRole('checkbox').check();
 await panel.getByRole('button',{name:consentCopy.ru.accept,exact:true}).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
 await expect.poll(()=>writes).toBe(1);await page.getByRole('combobox').first().selectOption('en');panel=page.getByRole('region',{name:consentCopy.en.region,exact:true});await expect(panel.getByRole('combobox',{name:consentCopy.en.noticeLanguage})).toHaveValue('ru');
 release();await expect(panel.getByRole('status')).toContainText(consentCopy.en.saved);expect(writes).toBe(1);expect(records).toHaveLength(1);
});
for(const committed of [true,false])test('lost acceptance response reconciles before manual action; committed='+committed,async({page,baseURL})=>{
 await service(page);const notice=await noticeFor(),records:ConsentReceipt[]=[],requests:Record<string,unknown>[]=[];let reads=0;
 await page.route('**/api/consent-receipts?*',async route=>{
  if(route.request().method()==='GET'){reads++;const q=query(route);return route.fulfill({json:{page:pageFromReceipts(records,notice,q.after,q.through),acceptanceEnabled:true}});}
  const body=route.request().postDataJSON();requests.push(body);
  if(requests.length===1){if(committed)records.push({...await receiptFor(1,notice),commandId:body.commandId});return route.abort('failed');}
  expect(body).toEqual(requests[0]);const receipt={...await receiptFor(1,notice),commandId:body.commandId};records.push(receipt);return route.fulfill({json:receipt});
 });
 const panel=await open(page,baseURL!);await panel.getByRole('button',{name:consentCopy.ru.load,exact:true}).click();await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:consentCopy.ru.accept,exact:true}).click();await expect(panel.getByRole('alert')).toContainText(consentCopy.ru.unknownOutcome);expect(requests).toHaveLength(1);expect(reads).toBe(1);
 await panel.getByRole('button',{name:consentCopy.ru.load,exact:true}).click();
 if(committed){await expect(panel).toContainText(consentCopy.ru.already);await expect(panel.getByRole('status')).toContainText(consentCopy.ru.saved);expect(requests).toHaveLength(1);}
 else{await expect(panel.getByRole('checkbox')).not.toBeChecked();await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:consentCopy.ru.accept,exact:true}).click();await expect(panel.getByRole('status')).toContainText(consentCopy.ru.saved);expect(requests).toHaveLength(2);}
 expect(records).toHaveLength(1);
});
test('a valid saved acknowledgement stays explicit when only the following read fails',async({page,baseURL})=>{
 await service(page);const notice=await noticeFor(),records:ConsentReceipt[]=[];let reads=0,writes=0;
 await page.route('**/api/consent-receipts?*',async route=>{
  if(route.request().method()==='GET'){reads++;if(reads===2)return route.fulfill({status:503,json:{code:'UPSTREAM_UNAVAILABLE',error:'PRIVATE_RAW'}});const q=query(route);return route.fulfill({json:{page:pageFromReceipts(records,notice,q.after,q.through),acceptanceEnabled:true}});}
  writes++;const body=route.request().postDataJSON();const receipt={...await receiptFor(1,notice),commandId:body.commandId};records.push(receipt);return route.fulfill({json:receipt});
 });
 const panel=await open(page,baseURL!);await panel.getByRole('button',{name:consentCopy.ru.load,exact:true}).click();await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:consentCopy.ru.accept,exact:true}).click();await expect(panel.getByRole('status')).toContainText(consentCopy.ru.savedReadFailed);await expect(panel).not.toContainText('PRIVATE_RAW');expect(writes).toBe(1);
 await panel.getByRole('button',{name:consentCopy.ru.load,exact:true}).click();await expect(panel).toContainText(consentCopy.ru.already);expect(writes).toBe(1);
});
test('an altered acceptance reply cannot install another owner or claim success',async({page,baseURL})=>{
 await service(page);const notice=await noticeFor();let writes=0;
 await page.route('**/api/consent-receipts?*',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{page:pageFromReceipts([],notice),acceptanceEnabled:true}});
  writes++;const body=route.request().postDataJSON();return route.fulfill({json:{...await receiptFor(1,notice),commandId:body.commandId,ownerId:'44444444-4444-4444-8444-444444444444'}});
 });
 const panel=await open(page,baseURL!);await panel.getByRole('button',{name:consentCopy.ru.load,exact:true}).click();await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:consentCopy.ru.accept,exact:true}).click();await expect(panel.getByRole('alert')).toContainText(consentCopy.ru.unknownOutcome);await expect(panel.getByRole('status')).toHaveCount(0);expect(writes).toBe(1);
});
test('an inconsistent later export page creates no partial download',async({page,baseURL})=>{
 await service(page);const notice=await noticeFor(),records=await Promise.all(Array.from({length:21},(_,i)=>receiptFor(i+1)));let downloads=0,continuations=0;page.on('download',()=>downloads++);
 await page.route('**/api/consent-receipts?*',route=>{
  const q=query(route),value=pageFromReceipts(records,notice,q.after,q.through);
  if(q.after){continuations++;value.ownerId='44444444-4444-4444-8444-444444444444';}
  return route.fulfill({json:{page:value,acceptanceEnabled:true}});
 });
 const panel=await open(page,baseURL!);await panel.getByRole('button',{name:consentCopy.ru.load,exact:true}).click();await expect(panel).toContainText(consentCopy.ru.count(21));await panel.getByRole('button',{name:consentCopy.ru.export,exact:true}).click();await expect(panel.getByRole('alert')).toContainText(consentCopy.ru.downloadFailed);expect(downloads).toBe(0);expect(continuations).toBe(1);
});
test('logout while a later export page is pending prevents the old-account download',async({page,baseURL})=>{
 await service(page);const notice=await noticeFor(),records=await Promise.all(Array.from({length:21},(_,i)=>receiptFor(i+1)));let downloads=0,continuations=0,released=false;let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});page.on('download',()=>downloads++);
 await page.route('**/api/consent-receipts?*',async route=>{
  const q=query(route);if(q.after){continuations++;await held;released=true;}await route.fulfill({json:{page:pageFromReceipts(records,notice,q.after,q.through),acceptanceEnabled:true}}).catch(()=>{});
 });
 const panel=await open(page,baseURL!);await panel.getByRole('button',{name:consentCopy.ru.load,exact:true}).click();await panel.getByRole('button',{name:consentCopy.ru.export,exact:true}).click();await expect.poll(()=>continuations).toBe(1);
 await page.getByRole('button',{name:ru.common.logout,exact:true}).click();await expect(page.locator('main.auth')).toBeVisible();release();await expect.poll(()=>released).toBe(true);await page.evaluate(()=>new Promise(requestAnimationFrame));expect(downloads).toBe(0);await expect(page.getByRole('region',{name:consentCopy.ru.region,exact:true})).toHaveCount(0);
});
test('an unpublished disabled protocol exports observations without inventing acceptance',async({page,baseURL})=>{
 await service(page);let writes=0;
 await page.route('**/api/consent-receipts?*',route=>{if(route.request().method()==='POST')writes++;return route.fulfill({json:{page:pageFromReceipts([],null),acceptanceEnabled:false}});});
 const panel=await open(page,baseURL!,'en');await panel.getByRole('button',{name:consentCopy.en.load,exact:true}).click();await expect(panel).toContainText(consentCopy.en.noNotice);await expect(panel).toContainText(consentCopy.en.off);await expect(panel.getByRole('checkbox')).toHaveCount(0);
 const downloaded=page.waitForEvent('download');await panel.getByRole('button',{name:consentCopy.en.export,exact:true}).click();const output=JSON.parse(await readFile((await (await downloaded).path())!,'utf8'));expect(output.receipts).toEqual([]);expect(output.snapshotSequence).toBe(0);expect(output.legacyObservation).toEqual({kind:'legacy-workspace-observation',version:'privacy-v1',observedAt:'2020-01-01T00:00:00Z'});expect(writes).toBe(0);
});
