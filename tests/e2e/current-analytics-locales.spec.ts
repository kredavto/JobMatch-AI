import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {fork,type ChildProcess} from 'node:child_process';
import {resolve} from 'node:path';
let child:ChildProcess,origin:string;
test.describe.configure({timeout:60000});
test.beforeAll(async()=>{
 const env:NodeJS.ProcessEnv={NODE_ENV:'test',JOBMATCH_LOCAL_SOURCE_LOCALES:'1'};
 for(const key of ['PATH','TMPDIR','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy'])if(process.env[key])env[key]=process.env[key];
 child=fork(resolve(__dirname,'../fixtures/source-locale-server.mjs'),[],{execArgv:[],env,stdio:['ignore','ignore','ignore','ipc']});
 origin=await new Promise<string>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Owned auth fixture startup timed out'));},20000);child.once('error',()=>{clearTimeout(timer);fail(Error('Owned auth fixture failed'));});child.once('exit',()=>{clearTimeout(timer);fail(Error('Owned auth fixture exited'));});child.once('message',value=>{clearTimeout(timer);const port=(value as {port?:unknown})?.port;if(!Number.isInteger(port)||Number(port)<1024||Number(port)>65535){child.kill();fail(Error('Owned auth fixture refused'));return;}done('http://127.0.0.1:'+port);});});
});
test.afterAll(async()=>{if(!child||child.exitCode!==null)return;await new Promise<void>((done,fail)=>{const timer=setTimeout(()=>{child.kill();fail(Error('Owned auth fixture cleanup timed out'));},15000);child.once('exit',code=>{clearTimeout(timer);if(code===0)done();else fail(Error('Owned auth fixture cleanup failed'));});child.send('close');});});


const ownerId='11111111-1111-4111-8111-111111111111';
const initial={ownerId,revision:7,original:'PRIVATE RESUME',vacancy:'SQL',goal:'',facts:[],versions:[{id:'v1',created:'2026-09-01',text:'SQL',vacancy:'SQL',evidence_ids:[],score:0}],applications:[
 {id:'day',title:'=Demo 🧑‍💻, "company"',status:'Интервью',note:'PRIVATE NOTE',created:'2026-09-01',resumeVersionId:'v1',events:[{status:'Отклик отправлен',date:'2026-10-10'},{status:'Интервью',date:'2026-11-02T12:00:00Z'}]},
 {id:'local',title:'Unplaced literal',status:'Просмотрено',note:'PRIVATE NOTE',created:'2026-09-01',resumeVersionId:'v1',events:[{status:'Отклик отправлен',date:'2026-10-01T00:30:00'},{status:'Просмотрено',date:'2026-11-01T12:00:00Z'}]},
 {id:'prior',title:'Prior literal',status:'Просмотрено',note:'',created:'2026-09-01',events:[{status:'Просмотрено',date:'2026-10-08'}]},
 {id:'planned',title:'Planned literal',status:'Планируется',note:'',created:'2026-10-10',events:[]}
]};
async function setup(page:Page,state=initial){let reads=0,posts=0;await page.route('**/api/service',route=>{if(route.request().method()!=='GET'){posts++;throw Error('Unexpected analytics write');}reads++;return route.fulfill({json:state});});await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Аналитика',exact:true}).click();return {counts:()=>({reads,posts})};}
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
const panel=(page:Page)=>page.locator('#application-analytics');

test('offset-less application cannot acquire a UTC monthly cohort from the device zone',async({browser})=>{
 const context=await browser.newContext({timezoneId:'Pacific/Honolulu'});try{const page=await context.newPage(),s=await setup(page,{...initial,applications:[initial.applications[1]]});const monthly=page.getByRole('region',{name:'Результаты по месяцам отправки',exact:true});await expect(monthly.locator('tbody tr')).toHaveCount(0);expect(s.counts()).toEqual({reads:1,posts:0});}finally{await context.close();}
});
test('the current analytics screen resolves English presentation without refetching data',async({page})=>{
 const s=await setup(page);await language(page,'en');await expect(page.getByRole('heading',{name:'Period and resume version',exact:true})).toBeVisible();expect(s.counts()).toEqual({reads:1,posts:0});
});

async function csv(page:Page,kind:'selection'|'monthly'){const pending=page.waitForEvent('download');await panel(page).locator(kind==='selection'?'[data-action="export-analytics"]':'[data-action="export-monthly"]').click();const file=await pending;expect(file.suggestedFilename()).toBe(kind==='selection'?'jobmatch-applications.csv':'jobmatch-monthly-results.csv');return readFile((await file.path())!,'utf8');}
const dataRows=(text:string)=>text.split('\r\n').slice(1).join('\r\n');
test('date/version filters, numeric comparison and canonical CSV rows survive language changes',async({page})=>{
 const s=await setup(page);await panel(page).locator('#analytics-from').fill('2026-10-10');await panel(page).locator('#analytics-to').fill('2026-10-11');
 const comparison=panel(page).getByRole('region',{name:'Сравнение с предыдущим периодом',exact:true});await expect(comparison.getByRole('row').nth(1)).toContainText('100% (1/1)');await expect(comparison.getByRole('row').nth(2)).toContainText('0% (0/1)');
 await panel(page).locator('#analytics-version').selectOption('v1');const ru=await csv(page,'selection'),ruMonthly=await csv(page,'monthly');await language(page,'en');await expect(panel(page).locator('#analytics-from')).toHaveValue('2026-10-10');await expect(panel(page).locator('#analytics-to')).toHaveValue('2026-10-11');await expect(panel(page).locator('#analytics-version')).toHaveValue('v1');const en=await csv(page,'selection'),enMonthly=await csv(page,'monthly');expect(dataRows(en)).toBe(dataRows(ru));expect(dataRows(enMonthly)).toBe(dataRows(ruMonthly));expect(en).toContain('"Vacancy"');expect(ru).toContain('"Вакансия"');expect(en).toContain('"Интервью"');expect(en).toContain('2026-10-10');expect(en).not.toContain('2026-10-10T00:00:00');expect(en).not.toContain('Unplaced literal');expect(en).not.toContain('Prior literal');for(const text of [en,enMonthly,ru,ruMonthly]){expect(text).not.toContain('PRIVATE RESUME');expect(text).not.toContain('PRIVATE NOTE');}expect(s.counts()).toEqual({reads:1,posts:0});
});
test('two device zones produce the same recorded UTC months and exact CSV data',async({browser})=>{
 const results:{selection:string;monthly:string}[]=[];
 for(const zone of ['Pacific/Honolulu','Asia/Kathmandu']){const context=await browser.newContext({timezoneId:zone});try{const page=await context.newPage(),state={...initial,applications:[...initial.applications,{...initial.applications[0],id:'offset',title:'Offset literal',events:[{status:'Оффер',date:'2026-10-01T00:30:00+03:00'}]}]},s=await setup(page,state);
  await expect(panel(page).locator('[data-unplaced]')).toContainText('1');const monthly=panel(page).getByRole('region',{name:'Результаты по месяцам отправки',exact:true});await expect(monthly.locator('tbody tr')).toHaveCount(2);await expect(monthly.locator('tbody tr').nth(0)).toContainText('2026-09');await expect(monthly.locator('tbody tr').nth(1)).toContainText('2026-10');results.push({selection:await csv(page,'selection'),monthly:await csv(page,'monthly')});expect(s.counts()).toEqual({reads:1,posts:0});
 }finally{await context.close();}}
 expect(results[0]).toEqual(results[1]);expect(results[0].selection).toContain('2026-09-30T21:30:00.000Z');expect(results[0].selection).not.toContain('2026-10-01T00:30:00.000Z');
});
test('unplaced notice follows version scope while date filters exclude unknown cohorts',async({page})=>{
 const s=await setup(page);await expect(panel(page).locator('[data-unplaced]')).toContainText('1');await expect(panel(page).locator('.stats article').nth(1).locator('strong')).toHaveText('3');
 await panel(page).locator('#analytics-from').fill('2026-10-01');await panel(page).locator('#analytics-to').fill('2026-10-31');await panel(page).locator('#analytics-version').selectOption('v1');await expect(panel(page).locator('[data-unplaced]')).toContainText('1');await expect(panel(page).locator('.stats article').nth(1).locator('strong')).toHaveText('1');
 await language(page,'en');await expect(panel(page).locator('[data-unplaced]')).toContainText('Applications with unplaced times: 1');await panel(page).locator('#analytics-version').selectOption('unlinked');await expect(panel(page).locator('[data-unplaced]')).toHaveCount(0);await expect(panel(page).locator('.stats article').nth(1).locator('strong')).toHaveText('1');expect(s.counts()).toEqual({reads:1,posts:0});
});
test('reversed periods translate without losing filter values or exporting invalid results',async({page})=>{
 const s=await setup(page);await panel(page).locator('#analytics-from').fill('2026-10-12');await panel(page).locator('#analytics-to').fill('2026-10-10');await expect(panel(page).getByRole('alert')).toHaveText('Начало периода не может быть позже окончания.');await language(page,'en');await expect(panel(page).getByRole('alert')).toHaveText('Start date must not be after end date.');await expect(panel(page).locator('#analytics-from')).toHaveValue('2026-10-12');await expect(panel(page).locator('[data-action^="export-"]')).toHaveCount(0);await panel(page).getByRole('button',{name:'Reset filters',exact:true}).click();await expect(panel(page).locator('#analytics-from')).toHaveValue('');await expect(panel(page).locator('#analytics-to')).toHaveValue('');await expect(panel(page).getByRole('alert')).toHaveCount(0);expect(s.counts()).toEqual({reads:1,posts:0});
});
test('both CSV failures are redacted and translated without automatic replay; retry is explicit',async({page})=>{
 const s=await setup(page);await panel(page).locator('#analytics-from').fill('2026-10-10');await panel(page).locator('#analytics-to').fill('2026-10-11');
 await page.evaluate(()=>{const w=window as typeof window&{analyticsCreate?:typeof URL.createObjectURL;analyticsCalls?:number};w.analyticsCreate=URL.createObjectURL;w.analyticsCalls=0;URL.createObjectURL=()=>{w.analyticsCalls!++;throw Error('PRIVATE CSV PATH');};});
 await panel(page).locator('[data-action="export-analytics"]').click();await panel(page).locator('[data-action="export-monthly"]').click();await expect(panel(page).getByRole('alert')).toHaveText(['Не удалось завершить скачивание CSV. Повторите скачивание по желанию.','Не удалось завершить скачивание CSV. Повторите скачивание по желанию.']);await language(page,'en');await expect(panel(page).getByRole('alert')).toHaveText(['The CSV download could not be completed. You may try downloading again.','The CSV download could not be completed. You may try downloading again.']);expect(await page.evaluate(()=>(window as typeof window&{analyticsCalls?:number}).analyticsCalls)).toBe(2);await expect(panel(page)).not.toContainText('PRIVATE CSV PATH');
 await page.evaluate(()=>{URL.createObjectURL=(window as typeof window&{analyticsCreate?:typeof URL.createObjectURL}).analyticsCreate!;});expect(await csv(page,'selection')).not.toContain('Unplaced literal');await csv(page,'monthly');await expect(panel(page).getByRole('alert')).toHaveCount(0);await expect(panel(page).locator('#analytics-from')).toHaveValue('2026-10-10');expect(s.counts()).toEqual({reads:1,posts:0});
});
test('both CSV paths revoke Blob URLs when anchor clicks fail and retain manual retry',async({page})=>{
 const s=await setup(page);await page.evaluate(()=>{const w=window as typeof window&{analyticsClick?:typeof HTMLAnchorElement.prototype.click;analyticsUrls?:string[];analyticsRevoked?:string[]};w.analyticsClick=HTMLAnchorElement.prototype.click;w.analyticsUrls=[];w.analyticsRevoked=[];const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=create(blob);w.analyticsUrls!.push(url);return url;};URL.revokeObjectURL=url=>{w.analyticsRevoked!.push(url);revoke(url);};HTMLAnchorElement.prototype.click=()=>{throw Error('PRIVATE ANCHOR CSV');};});
 await panel(page).locator('[data-action="export-analytics"]').click();await panel(page).locator('[data-action="export-monthly"]').click();await expect(panel(page).getByRole('alert')).toHaveCount(2);await expect.poll(()=>page.evaluate(()=>{const w=window as typeof window&{analyticsUrls?:string[];analyticsRevoked?:string[]};return w.analyticsUrls?.length===2&&w.analyticsRevoked?.length===2&&w.analyticsUrls.every(url=>w.analyticsRevoked!.includes(url));})).toBe(true);await expect(panel(page)).not.toContainText('PRIVATE ANCHOR CSV');await page.evaluate(()=>{HTMLAnchorElement.prototype.click=(window as typeof window&{analyticsClick?:typeof HTMLAnchorElement.prototype.click}).analyticsClick!;});await csv(page,'selection');await csv(page,'monthly');await expect(panel(page).getByRole('alert')).toHaveCount(0);expect(s.counts()).toEqual({reads:1,posts:0});
});
test('English mobile analytics tables stay readable inside accessible horizontal scroll regions',async({page})=>{
 const s=await setup(page);await page.setViewportSize({width:390,height:844});await panel(page).locator('#analytics-from').fill('2026-10-10');await panel(page).locator('#analytics-to').fill('2026-10-11');await language(page,'en');
 expect((await new AxeBuilder({page}).include('#application-analytics').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const dimensions=await panel(page).locator('.table-wrap th[scope="row"]').evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));expect(dimensions.length).toBeGreaterThan(0);for(const size of dimensions){expect(size.width).toBeGreaterThanOrEqual(180);expect(size.height).toBeLessThan(180);}for(const region of await panel(page).locator('.table-wrap').all())await expect(region).toHaveAttribute('tabindex','0');expect(s.counts()).toEqual({reads:1,posts:0});
});
test('empty monthly results disable only that export while no-period canonical rows remain downloadable',async({page})=>{
 const s=await setup(page,{...initial,applications:[initial.applications[1]]});await language(page,'en');await expect(panel(page).locator('[data-unplaced]')).toContainText('1');await expect(panel(page).locator('[data-action="export-monthly"]')).toBeDisabled();const text=await csv(page,'selection');expect(text).toContain('"Unplaced literal","Просмотрено","2026-09-01","","v1"');expect(text).not.toContain('PRIVATE NOTE');await expect(panel(page)).toContainText('Comparisons do not establish a causal effect of edits');expect(s.counts()).toEqual({reads:1,posts:0});
});
