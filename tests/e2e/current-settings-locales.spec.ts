import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {fork,type ChildProcess} from 'node:child_process';
import {resolve} from 'node:path';
let child:ChildProcess,origin:string;
test.describe.configure({timeout:60000});
test.beforeAll(async()=>{
 const env:NodeJS.ProcessEnv={NODE_ENV:'test',JOBMATCH_LOCAL_SOURCE_LOCALES:'1',JOBMATCH_LOCAL_SETTINGS_EXPORT_FIXTURE:'1'};
 for(const key of ['PATH','TMPDIR','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy'])if(process.env[key])env[key]=process.env[key];
 child=fork(resolve(__dirname,'../fixtures/source-locale-server.mjs'),[],{execArgv:[],env,stdio:['ignore','ignore','ignore','ipc']});
 origin=await new Promise<string>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Owned auth fixture startup timed out'));},20000);child.once('error',()=>{clearTimeout(timer);fail(Error('Owned auth fixture failed'));});child.once('exit',()=>{clearTimeout(timer);fail(Error('Owned auth fixture exited'));});child.once('message',value=>{clearTimeout(timer);const port=(value as {port?:unknown})?.port;if(!Number.isInteger(port)||Number(port)<1024||Number(port)>65535){child.kill();fail(Error('Owned auth fixture refused'));return;}done('http://127.0.0.1:'+port);});});
});
test.afterAll(async()=>{if(!child||child.exitCode!==null)return;await new Promise<void>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Owned auth fixture cleanup timed out'));},15000);child.once('exit',code=>{clearTimeout(timer);if(code===0)done();else fail(Error('Owned auth fixture cleanup failed'));});child.send('close');});});


const ownerId='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222';
const initial={ownerId,revision:7,original:'PRIVATE RESUME',vacancy:'SQL',goal:'',facts:[],versions:[],applications:[]};
const archive={format:'jobmatch-personal-data-v1',complete:true,scope:'workspace-audit-consent',exported_at:'2026-11-02T00:00:00Z',fact_history_export:'/api/fact-history?export=1',saved_letters_export:'/api/letter-versions?export=1',source_versions_export:'/api/source-versions?export=1',user:{id:ownerId},workspace:initial,audit:[],consent:[]};
async function openSettings(page:Page){await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Настройки',exact:true}).click();}
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
const exportButton=(page:Page)=>page.getByRole('button',{name:/^(Экспорт профиля, версий и откликов|Export profile, versions and applications)$/});
const panel=(page:Page)=>page.locator('#workspace-settings');

test('valid-shaped export from another user cannot create a personal file',async({page})=>{
 let files=0;page.on('download',()=>files++);await page.route('**/api/service',route=>route.fulfill({json:route.request().method()==='GET'?initial:{...archive,user:{id:otherId}}}));
 await openSettings(page);await exportButton(page).click();await expect.poll(async()=>files+await page.locator('.error').count()).toBeGreaterThan(0);expect(files).toBe(0);await expect(exportButton(page)).toBeDisabled();
});
test('a paused workspace cannot expose active settings history download links',async({page})=>{
 await page.route('**/api/service',route=>route.request().method()==='GET'?route.fulfill({json:initial}):route.fulfill({status:503,json:{error:'Unavailable'}}));
 await openSettings(page);await exportButton(page).click();await expect(page.locator('.error')).toBeVisible();await expect(page.getByRole('link',{name:/Скачать.*историю.*NDJSON/})).toHaveCount(0);
});

async function personalFile(page:Page){const pending=page.waitForEvent('download');await exportButton(page).click();const file=await pending;expect(file.suggestedFilename()).toBe('jobmatch-personal-data.json');return JSON.parse(await readFile((await file.path())!,'utf8'));}
test('a workspace owner mismatch creates no file and keeps all exports paused',async({page})=>{
 let files=0,writes=0;page.on('download',()=>files++);await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});writes++;return route.fulfill({json:{...archive,workspace:{...initial,ownerId:otherId}}});});
 await openSettings(page);await exportButton(page).click();await expect(page.locator('.error')).toBeVisible();await expect(exportButton(page)).toBeDisabled();await expect(panel(page).getByRole('link')).toHaveCount(0);expect(files).toBe(0);expect(writes).toBe(1);
});
test('locale preserves the canonical confirmation and accurate disclosures without requests',async({page})=>{
 let reads=0;const posts:unknown[]=[];await page.route('**/api/service',route=>{if(route.request().method()==='GET'){reads++;return route.fulfill({json:initial});}const body=route.request().postDataJSON();posts.push(body);return route.fulfill({json:body.action==='export'?archive:{ok:true}});});
 await openSettings(page);await panel(page).locator('#settings-delete-confirm').fill('DELETE');await expect(panel(page).locator('#settings-delete')).toBeDisabled();await panel(page).locator('#settings-delete-confirm').fill('УДАЛИТЬ');await panel(page).locator('#settings-delete-confirm').evaluate((input:HTMLInputElement)=>{input.focus();input.setSelectionRange(2,5);});
 await language(page,'en');await expect(panel(page).locator('#settings-delete-confirm')).toHaveValue('УДАЛИТЬ');expect(await panel(page).locator('#settings-delete-confirm').evaluate((input:HTMLInputElement)=>[input.selectionStart,input.selectionEnd])).toEqual([2,5]);
 await expect(panel(page)).toContainText('This screen does not verify the actual region');await expect(panel(page)).toContainText('Real registration and recovery delivery');await expect(panel(page)).toContainText('six files are not one transactional snapshot');await expect(panel(page)).not.toContainText('Germany');expect(reads).toBe(1);expect(posts).toEqual([]);
 expect(await personalFile(page)).toEqual(archive);expect(posts).toEqual([{action:'export',revision:7,expectedOwnerId:ownerId}]);await panel(page).locator('#settings-delete').click();await expect(panel(page)).toHaveCount(0);expect(posts).toEqual([{action:'export',revision:7,expectedOwnerId:ownerId},{action:'delete',revision:7,confirm:'УДАЛИТЬ',expectedOwnerId:ownerId}]);expect(reads).toBe(1);
});
test('unknown identity keeps actions and links inactive across locale changes',async({page})=>{
 let writes=0;const {ownerId:ignored,...legacy}=initial;void ignored;await page.route('**/api/service',route=>{if(route.request().method()!=='GET')writes++;return route.fulfill({json:legacy});});await openSettings(page);await panel(page).locator('#settings-delete-confirm').fill('УДАЛИТЬ');await language(page,'en');
 await expect(panel(page).getByRole('alert')).toContainText('profile owner is unknown');await expect(exportButton(page)).toBeDisabled();await expect(panel(page).locator('#settings-delete')).toBeDisabled();await expect(panel(page).getByRole('link')).toHaveCount(0);await expect(panel(page).locator('#settings-delete-confirm')).toHaveValue('УДАЛИТЬ');expect(writes).toBe(0);
});
test('one Root guard survives duplicate export clicks, locale and tab remount without replay',async({page})=>{
 let reads=0,release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;}),posts:unknown[]=[];await page.route('**/api/service',async route=>{if(route.request().method()==='GET'){reads++;return route.fulfill({json:initial});}posts.push(route.request().postDataJSON());await held;return route.fulfill({json:archive});});
 await openSettings(page);await panel(page).locator('#settings-delete-confirm').fill('УДАЛИТЬ');await exportButton(page).evaluate((button:HTMLButtonElement)=>{button.click();button.click();(document.querySelector('#settings-delete') as HTMLButtonElement).click();});await expect.poll(()=>posts.length).toBe(1);
 await language(page,'en');await expect(exportButton(page)).toBeDisabled();await expect(panel(page).getByRole('link')).toHaveCount(0);await page.getByRole('navigation').getByRole('button',{name:'Overview',exact:true}).click();await page.getByRole('navigation').getByRole('button',{name:'Settings',exact:true}).click();await expect(exportButton(page)).toBeDisabled();await expect(panel(page).locator('#settings-delete-confirm')).toHaveValue('УДАЛИТЬ');
 const pending=page.waitForEvent('download');release();await pending;await expect(exportButton(page)).toBeEnabled();expect(posts).toEqual([{action:'export',revision:7,expectedOwnerId:ownerId}]);expect(reads).toBe(1);
});
test('a pending synthetic deletion preserves its literal token and sends no second settings action',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;}),posts:unknown[]=[];await page.route('**/api/service',async route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});posts.push(route.request().postDataJSON());await held;return route.fulfill({json:{ok:true}});});
 await openSettings(page);await panel(page).locator('#settings-delete-confirm').fill('УДАЛИТЬ');await panel(page).locator('#settings-delete').evaluate((button:HTMLButtonElement)=>{button.click();button.click();(document.querySelector('#settings-export') as HTMLButtonElement).click();});await expect.poll(()=>posts.length).toBe(1);await language(page,'en');await expect(panel(page).locator('#settings-delete')).toBeDisabled();await expect(panel(page).getByRole('link')).toHaveCount(0);release();await expect(panel(page)).toHaveCount(0);expect(posts).toEqual([{action:'delete',revision:7,confirm:'УДАЛИТЬ',expectedOwnerId:ownerId}]);
});
test('a failed export requires deliberate current-data read before a new request',async({page})=>{
 let valid=false,reads=0,writes=0;await page.route('**/api/service',route=>{if(route.request().method()==='GET'){reads++;return route.fulfill({json:initial});}writes++;return valid?route.fulfill({json:archive}):route.fulfill({status:503,json:{error:'PRIVATE EXPORT PATH'}});});
 await openSettings(page);await exportButton(page).click();await expect(page.locator('.error')).toBeVisible();await language(page,'en');await expect(panel(page).getByRole('alert')).toContainText('Export and deletion are paused');await expect(exportButton(page)).toBeDisabled();expect(writes).toBe(1);expect(reads).toBe(1);valid=true;
 await page.getByRole('button',{name:'Load current data',exact:true}).click();await expect(exportButton(page)).toBeEnabled();expect(reads).toBe(2);expect(await personalFile(page)).toEqual(archive);expect(writes).toBe(2);
});
test('all three current history links download owner-bound separate NDJSON files',async({page})=>{
 const paths=['/api/fact-history','/api/letter-versions','/api/source-versions'],gets:string[]=[];let posts=0;await page.route('**/api/service',route=>{if(route.request().method()!=='GET')posts++;return route.fulfill({json:initial});});
 await openSettings(page);await language(page,'en');const links=panel(page).getByRole('link');await expect(links).toHaveCount(3);
 for(let i=0;i<paths.length;i++){await expect(links.nth(i)).toHaveAttribute('href',paths[i]+'?export=1&expectedOwnerId='+ownerId);const pending=page.waitForEvent('download');await links.nth(i).click();const file=await pending;expect(file.suggestedFilename()).toBe('synthetic-settings.ndjson');const text=await readFile((await file.path())!,'utf8');expect(text).toBe(JSON.stringify({format:'synthetic-settings-fixture',path:paths[i],ownerId,method:'GET',query:[['export','1'],['expectedOwnerId',ownerId]]})+'\n'+JSON.stringify({complete:true})+'\n');gets.push(JSON.parse(text.split('\n')[0]).path);}
 expect(gets).toEqual(paths);expect(posts).toBe(0);await expect(panel(page)).toContainText('Every NDJSON must end with a complete: true record');
});
test('failed personal-file click revokes the Blob URL, redacts the error and supports manual retry',async({page})=>{
 let writes=0;await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});writes++;return route.fulfill({json:archive});});await openSettings(page);
 await page.evaluate(()=>{const w=window as typeof window&{settingsClick?:typeof HTMLAnchorElement.prototype.click;settingsUrls?:string[];settingsRevoked?:string[]};w.settingsClick=HTMLAnchorElement.prototype.click;w.settingsUrls=[];w.settingsRevoked=[];const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=create(blob);w.settingsUrls!.push(url);return url;};URL.revokeObjectURL=url=>{w.settingsRevoked!.push(url);revoke(url);};HTMLAnchorElement.prototype.click=()=>{throw Error('PRIVATE EXPORT PATH');};});
 await exportButton(page).click();await expect(page.locator('.error')).toBeVisible();await expect(page.locator('.error')).not.toContainText('PRIVATE');await expect.poll(()=>page.evaluate(()=>{const w=window as typeof window&{settingsUrls?:string[];settingsRevoked?:string[]};return w.settingsUrls?.length===1&&w.settingsRevoked?.[0]===w.settingsUrls?.[0];})).toBe(true);await language(page,'en');expect(writes).toBe(1);
 await page.evaluate(()=>{HTMLAnchorElement.prototype.click=(window as typeof window&{settingsClick?:typeof HTMLAnchorElement.prototype.click}).settingsClick!;});expect(await personalFile(page)).toEqual(archive);expect(writes).toBe(2);
});
test('English mobile settings have no automated axe violations or horizontal overflow',async({page})=>{
 await page.route('**/api/service',route=>route.fulfill({json:initial}));await page.setViewportSize({width:390,height:844});await openSettings(page);await language(page,'en');expect((await new AxeBuilder({page}).include('#workspace-settings').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
