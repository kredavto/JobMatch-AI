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
const state={ownerId,revision:7,original:'PRIVATE RESUME',vacancy:'SQL',goal:'',facts:[],versions:[],applications:[{id:'a1',title:'Demo 🧑‍💻 company',status:'Планируется',note:'PRIVATE TRACKER NOTE',created:'2026-11-01',events:[]}]};
async function setup(page:Page){let reads=0,posts=0;await page.route('**/api/service',route=>{if(route.request().method()!=='GET'){posts++;throw Error('Unexpected calendar write');}reads++;return route.fulfill({json:state});});await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();return{counts:()=>({reads,posts})};}
const panel=(page:Page)=>page.getByRole('region',{name:/^(Напоминание по отклику|Application calendar reminder)$/});
const when=(page:Page)=>panel(page).locator('input[type="datetime-local"]');
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
async function prepare(page:Page,value='2026-11-02T10:30'){await panel(page).getByLabel('Отклик для напоминания',{exact:false}).selectOption('a1');await when(page).fill(value);}

test('repeated device-local time cannot export until the user chooses an occurrence',async({browser})=>{
 const context=await browser.newContext({timezoneId:'America/New_York'});try{const page=await context.newPage(),s=await setup(page);await prepare(page,'2026-11-01T01:30');await expect(panel(page).getByRole('button',{name:'Скачать напоминание (ICS)',exact:true})).toBeDisabled();await expect(panel(page).getByLabel('Выберите повторяющееся время',{exact:true})).toBeVisible();expect(s.counts()).toEqual({reads:1,posts:0});}finally{await context.close();}
});
test('calendar download failure never displays unknown exception text',async({page})=>{
 const s=await setup(page);await prepare(page);await page.evaluate(()=>{URL.createObjectURL=()=>{throw Error('PRIVATE CALENDAR PATH /SECRET');};});await panel(page).getByRole('button',{name:'Скачать напоминание (ICS)',exact:true}).click();await expect(panel(page).getByRole('alert')).toBeVisible();await expect(panel(page).getByRole('alert')).not.toContainText('PRIVATE CALENDAR PATH');expect(s.counts()).toEqual({reads:1,posts:0});
});

async function file(page:Page){const pending=page.waitForEvent('download');await panel(page).locator('#calendar-download').click();const downloaded=await pending;expect(downloaded.suggestedFilename()).toBe('jobmatch-reminder.ics');return readFile((await downloaded.path())!,'utf8');}
const uid=(ics:string)=>ics.match(/\r\nUID:([^\r]+)\r\n/)?.[1];
test('explicit second New York occurrence exports the intended UTC instant',async({page})=>{
 const s=await setup(page);await prepare(page,'2026-11-01T01:30');await panel(page).locator('#calendar-zone').fill('America/New_York');
 await expect(panel(page).locator('#calendar-download')).toBeDisabled();await panel(page).locator('#calendar-offset').selectOption('-300');
 const text=await file(page);expect(text).toContain('DTSTART:20261101T063000Z');expect(text).toContain('DTEND:20261101T070000Z');expect(s.counts()).toEqual({reads:1,posts:0});
});
test('a spring gap, invalid zone and unsupported year cannot export',async({page})=>{
 const s=await setup(page);await prepare(page,'2026-03-08T02:30');await panel(page).locator('#calendar-zone').fill('America/New_York');
 await expect(panel(page).getByRole('alert')).toContainText('Местное время не найдено');await expect(panel(page).locator('#calendar-download')).toBeDisabled();
 await language(page,'en');await expect(panel(page).getByRole('alert')).toContainText('not found in the supported offset range');
 await panel(page).locator('#calendar-zone').fill('Unknown/Zone');await expect(panel(page).getByRole('alert')).toHaveText('Enter an available named IANA time zone.');
 await panel(page).locator('#calendar-zone').fill('UTC');await when(page).fill('2100-01-01T10:30');await expect(panel(page).getByRole('alert')).toContainText('from 2000 to 2099');await expect(panel(page).locator('#calendar-download')).toBeDisabled();expect(s.counts()).toEqual({reads:1,posts:0});
});
test('half-hour repeated times and quarter-hour offsets export precisely',async({page})=>{
 const s=await setup(page);await prepare(page,'2026-04-05T01:45');await panel(page).locator('#calendar-zone').fill('Australia/Lord_Howe');
 await expect(panel(page).locator('#calendar-offset option')).toHaveCount(3);await panel(page).locator('#calendar-offset').selectOption('630');expect(await file(page)).toContain('DTSTART:20260404T151500Z');
 await panel(page).locator('#calendar-zone').fill('Asia/Kathmandu');await when(page).fill('2026-11-02T10:30');expect(await file(page)).toContain('DTSTART:20261102T044500Z');expect(s.counts()).toEqual({reads:1,posts:0});
});
test('locale preserves the draft, occurrence, caret and identical frozen-clock ICS bytes',async({page})=>{
 const s=await setup(page);await page.clock.setFixedTime(new Date('2026-11-02T00:00:00Z'));await prepare(page,'2026-11-01T01:30');await panel(page).locator('#calendar-zone').fill('America/New_York');await panel(page).locator('#calendar-offset').selectOption('-240');
 await panel(page).locator('#calendar-kind').selectOption('Повторный контакт');await panel(page).locator('#calendar-duration').selectOption('60');const description=panel(page).locator('#calendar-description');await description.fill('Мой текст 🧑‍💻, raw;\nATTENDEE:example');await description.evaluate((node:HTMLTextAreaElement)=>{node.focus();node.setSelectionRange(3,8);});
 const before=await file(page);await language(page,'en');await expect(description).toHaveValue('Мой текст 🧑‍💻, raw;\nATTENDEE:example');expect(await description.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd])).toEqual([3,8]);
 await expect(panel(page).locator('#calendar-application')).toHaveValue('a1');await expect(panel(page).locator('#calendar-kind')).toHaveValue('Повторный контакт');await expect(panel(page).locator('#calendar-duration')).toHaveValue('60');await expect(panel(page).locator('#calendar-offset')).toHaveValue('-240');await expect(panel(page).getByLabel('Add a reminder 15 minutes before',{exact:true})).toBeChecked();
 expect(await file(page)).toBe(before);await expect(panel(page).getByRole('status')).toContainText('No event has been created yet');expect(s.counts()).toEqual({reads:1,posts:0});
});
test('English controls retain canonical Russian event types and exclude private sources',async({page})=>{
 const s=await setup(page);await prepare(page);await panel(page).locator('#calendar-zone').fill('UTC');await language(page,'en');await panel(page).getByLabel('Event type',{exact:true}).selectOption({label:'Interview preparation'});await panel(page).getByLabel('Event description',{exact:true}).fill('Raw; comma,\nATTENDEE:external');
 const text=await file(page),unfolded=text.replace(/\r\n /g,'');expect(unfolded).toContain('SUMMARY:Подготовка к интервью — Demo 🧑‍💻 company');expect(unfolded).toContain('DESCRIPTION:Raw\\; comma\\,\\nATTENDEE:external');expect(text).toContain('CLASS:PRIVATE');
 for(const forbidden of ['PRIVATE RESUME','PRIVATE TRACKER NOTE','\r\nATTENDEE:','\r\nMETHOD:'])expect(text).not.toContain(forbidden);
 await expect(panel(page)).toContainText('The event type in the file remains Russian');expect(s.counts()).toEqual({reads:1,posts:0});
});
test('only business edits replace UID and time edits clear an earlier occurrence choice',async({page})=>{
 const s=await setup(page);await prepare(page,'2026-11-01T01:30');await panel(page).locator('#calendar-zone').fill('America/New_York');await panel(page).locator('#calendar-offset').selectOption('-240');const first=uid(await file(page));expect(first).toBeTruthy();await language(page,'en');expect(uid(await file(page))).toBe(first);
 await panel(page).locator('#calendar-description').fill('Changed description');const second=uid(await file(page));expect(second).not.toBe(first);await panel(page).getByLabel('Add a reminder 15 minutes before',{exact:true}).uncheck();const third=await file(page);expect(uid(third)).not.toBe(second);expect(third).not.toContain('BEGIN:VALARM');
 await when(page).fill('2026-11-01T01:45');await expect(panel(page).locator('#calendar-offset')).toHaveValue('');await expect(panel(page).locator('#calendar-download')).toBeDisabled();expect(s.counts()).toEqual({reads:1,posts:0});
});
test('safe error is retranslated and retry is manual without replay or refetch',async({page})=>{
 const s=await setup(page);await prepare(page);await page.evaluate(()=>{const w=window as typeof window&{calendarCreate?:typeof URL.createObjectURL;calendarCalls?:number};w.calendarCreate=URL.createObjectURL;w.calendarCalls=0;URL.createObjectURL=()=>{w.calendarCalls!++;throw Error('PRIVATE CALENDAR PATH /SECRET');};});
 await panel(page).locator('#calendar-download').click();await expect(panel(page).getByRole('alert')).toHaveText('Не удалось подготовить файл. Повторите скачивание по желанию.');await language(page,'en');await expect(panel(page).getByRole('alert')).toHaveText('The file could not be prepared. You may try downloading again.');
 expect(await page.evaluate(()=>(window as typeof window&{calendarCalls?:number}).calendarCalls)).toBe(1);
 await page.evaluate(()=>{const w=window as typeof window&{calendarCreate?:typeof URL.createObjectURL};URL.createObjectURL=w.calendarCreate!;});await file(page);await expect(panel(page).getByRole('alert')).toHaveCount(0);await expect(panel(page).getByRole('status')).toContainText('No event has been created yet');expect(s.counts()).toEqual({reads:1,posts:0});
});
test('a failed anchor click still revokes its Blob URL and permits an explicit retry',async({page})=>{
 const s=await setup(page);await prepare(page);await page.evaluate(()=>{const w=window as typeof window&{calendarClick?:typeof HTMLAnchorElement.prototype.click;calendarUrls?:string[];calendarRevoked?:string[]};w.calendarClick=HTMLAnchorElement.prototype.click;w.calendarUrls=[];w.calendarRevoked=[];const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=create(blob);w.calendarUrls!.push(url);return url;};URL.revokeObjectURL=url=>{w.calendarRevoked!.push(url);revoke(url);};HTMLAnchorElement.prototype.click=()=>{throw Error('PRIVATE ANCHOR FAILURE');};});
 await panel(page).locator('#calendar-download').click();await expect(panel(page).getByRole('alert')).not.toContainText('PRIVATE');
 await expect.poll(()=>page.evaluate(()=>{const w=window as typeof window&{calendarUrls?:string[];calendarRevoked?:string[]};return w.calendarRevoked?.[0]===w.calendarUrls?.[0]&&w.calendarUrls?.length===1;})).toBe(true);
 await page.evaluate(()=>{HTMLAnchorElement.prototype.click=(window as typeof window&{calendarClick?:typeof HTMLAnchorElement.prototype.click}).calendarClick!;});await file(page);expect(s.counts()).toEqual({reads:1,posts:0});
});
test('English mobile calendar controls have no automated axe violations or horizontal overflow',async({page})=>{
 const s=await setup(page);await page.setViewportSize({width:390,height:844});await prepare(page,'2026-11-01T01:30');await panel(page).locator('#calendar-zone').fill('America/New_York');await language(page,'en');
 expect((await new AxeBuilder({page}).include('#application-calendar').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(s.counts()).toEqual({reads:1,posts:0});
});
