import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {build,stop} from 'esbuild';
import {createServer,type Server} from 'node:http';
import {readFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
let server:Server,origin:string;
test.beforeAll(async()=>{
 const bundle=await build({entryPoints:['tests/fixtures/profile-panel.tsx'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
 const css=await readFile('app/globals.css','utf8'),script=bundle.outputFiles[0].text;
 server=createServer((request,response)=>{if(request.url==='/bundle.js'){response.writeHead(200,{'Content-Type':'application/javascript'});response.end(script);return;}if(request.url!=='/ru'&&request.url!=='/en'){response.writeHead(404);response.end();return;}const locale=request.url.slice(1);response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>Component locale fixture</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}main{max-width:800px;margin:auto;padding:16px}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
test.afterAll(async()=>{if(server)await new Promise<void>((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();});stop();});
const copy={ru:{region:'Мастер-профиль',goal:'Должность, уровень, город, формат, зарплата, отрасль',saveGoal:'Сохранить цель',resume:'Проверьте текст после импорта',saveResume:'Сохранить мастер-профиль',fact:'Уточнение или дополнительный факт',add:'Добавить неподтвержденный факт',refresh:'Обновить историю фактов',older:'Загрузить более ранние снимки',download:'Скачать снимок JSON',month:'октября'},en:{region:'Master profile',goal:'Role, level, city, work arrangement, salary, industry',saveGoal:'Save goal',resume:'Review the imported text',saveResume:'Save master profile',fact:'Clarification or additional fact',add:'Add unconfirmed fact',refresh:'Refresh fact history',older:'Load older snapshots',download:'Download snapshot JSON',month:'October'}};
const snapshot={id:2,workspace_revision:3,kind:'change',captured_at:'2026-10-29T00:15:00+00:00',facts:[{id:'old',text:'SQL — исторический факт',source:'Импорт',verified:true}]};
for(const locale of ['ru','en'] as const)test.describe(locale,()=>{test.use({timezoneId:'America/Los_Angeles'});
 test('controlled profile preserves user data, commands and immutable history in both languages',async({page})=>{
  const commands:unknown[]=[];await page.route('**/fixture-command',route=>{commands.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}});});
  const historyCalls:string[]=[];await page.route('**/fixture-history*',route=>{historyCalls.push(route.request().url());return route.fulfill({json:route.request().url().includes('before=2')?{rows:[{...snapshot,id:1,kind:'baseline',facts:[]}],next:null}:{rows:[snapshot],next:2}});});
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/'+locale);const t=copy[locale],panel=page.getByRole('region',{name:t.region,exact:true});
  await expect(panel.getByRole('textbox',{name:t.goal,exact:true})).toHaveValue('Москва · 150 000 ₽');await panel.getByRole('button',{name:t.saveGoal,exact:true}).click();await panel.getByRole('button',{name:t.saveResume,exact:true}).click();await panel.getByRole('checkbox',{name:/Python/}).click();await expect(panel.getByRole('checkbox',{name:/Python/})).toBeChecked();await panel.getByRole('textbox',{name:t.fact,exact:true}).fill('B2B — рост 12%, 2023');await panel.getByRole('button',{name:t.add,exact:true}).click();await expect(panel.getByRole('textbox',{name:t.fact,exact:true})).toHaveValue('');
  expect(commands).toEqual([{action:'goal',text:'Москва · 150 000 ₽'},{action:'import',text:'😀 Python — 2020–2024'},{action:'verify',ids:['f-исходный'],verified:true},{action:'fact',text:'B2B — рост 12%, 2023'}]);
  await panel.getByRole('button',{name:t.refresh,exact:true}).click();await panel.locator('summary').first().click();await expect(panel.locator('time').first()).toContainText(t.month);await expect(panel.locator('time').first()).toContainText('00:15:00 UTC');await expect(panel.locator('time').first()).toHaveAttribute('datetime',snapshot.captured_at);await expect(panel.getByText(snapshot.facts[0].text,{exact:true})).toBeVisible();
  const pending=page.waitForEvent('download');await panel.getByRole('button',{name:t.download,exact:true}).click();const download=await pending;expect(download.suggestedFilename()).toBe('jobmatch-facts-2.json');expect(JSON.parse(await readFile((await download.path())!,'utf8'))).toEqual(snapshot);
  await panel.getByRole('button',{name:t.older,exact:true}).click();await expect(panel.locator('summary')).toHaveCount(2);await expect(panel.getByRole('button',{name:t.older,exact:true})).toHaveCount(0);expect(historyCalls).toHaveLength(2);expect(historyCalls[1]).toContain('?before=2');expect(commands).toHaveLength(4);
  expect((await new AxeBuilder({page}).include('#fixture-main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(locale==='en')await panel.screenshot({path:'test-results/flat-profile-en-mobile.png'});
 });
});
test('changing locale preserves selection and next draft while a single add is pending',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});const commands:unknown[]=[];
 await page.route('**/fixture-command',async route=>{commands.push(route.request().postDataJSON());await held;return route.fulfill({json:{ok:true}});});await page.goto(origin+'/ru');const ru=copy.ru,en=copy.en;let panel=page.getByRole('region',{name:ru.region,exact:true});
 await panel.getByRole('textbox',{name:ru.resume,exact:true}).evaluate((e:HTMLTextAreaElement)=>{e.focus();e.setSelectionRange(3,9);});await page.getByRole('button',{name:'Switch test locale'}).click();panel=page.getByRole('region',{name:en.region,exact:true});expect(await panel.getByRole('textbox',{name:en.resume,exact:true}).evaluate((e:HTMLTextAreaElement)=>[e.selectionStart,e.selectionEnd])).toEqual([3,9]);
 await panel.getByRole('textbox',{name:en.fact,exact:true}).fill('Отправленный факт');await panel.getByRole('button',{name:en.add,exact:true}).evaluate((e:HTMLButtonElement)=>{e.click();e.click();});await expect.poll(()=>commands.length).toBe(1);await panel.getByRole('textbox',{name:en.fact,exact:true}).fill('Следующее уточнение');await page.getByRole('button',{name:'Switch test locale'}).click();release();panel=page.getByRole('region',{name:ru.region,exact:true});await expect(panel.getByRole('button',{name:ru.add,exact:true})).toBeEnabled();await expect(panel.getByRole('textbox',{name:ru.fact,exact:true})).toHaveValue('Следующее уточнение');expect(commands).toEqual([{action:'fact',text:'Отправленный факт'}]);
});
test('a rejected add retains the draft and requires a manual retry',async({page})=>{
 let requests=0;await page.route('**/fixture-command',route=>{requests++;return route.fulfill({status:409,json:{}});});await page.goto(origin+'/en');const panel=page.getByRole('region',{name:copy.en.region,exact:true});await panel.getByRole('textbox',{name:copy.en.fact,exact:true}).fill('Не терять факт');await panel.getByRole('button',{name:copy.en.add,exact:true}).click();await expect(panel.getByRole('button',{name:copy.en.add,exact:true})).toBeEnabled();await expect(panel.getByRole('textbox',{name:copy.en.fact,exact:true})).toHaveValue('Не терять факт');await page.getByRole('button',{name:'Switch test locale'}).click();expect(requests).toBe(1);
});
test('file callback only changes the review draft and permits selecting the same file again',async({page})=>{
 let writes=0;await page.route('**/fixture-command',route=>{writes++;return route.fulfill({json:{ok:true}});});await page.goto(origin+'/en');const input=page.locator('input[type=file]'),file={name:'resume.txt',mimeType:'text/plain',buffer:Buffer.from('Данные 😀\n2024 — 42%')};await input.setInputFiles(file);const draft=page.getByRole('textbox',{name:copy.en.resume,exact:true});await expect(draft).toHaveValue('Данные 😀\n2024 — 42%');await draft.fill('Проверенный вручную черновик');await input.setInputFiles(file);await expect(draft).toHaveValue('Данные 😀\n2024 — 42%');expect(writes).toBe(0);
});

for(const locale of ['ru','en'] as const)test(locale+' bulk skill selection requires explicit save and supports partial selection',async({page})=>{
 const commands:unknown[]=[];
 await page.route('**/fixture-command',route=>{commands.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}});});
 await page.goto(origin+'/'+locale);await page.getByRole('button',{name:'Load bulk fixture',exact:true}).click();
 const panel=page.getByRole('region',{name:copy[locale].region,exact:true}),all=panel.getByRole('checkbox',{name:locale==='ru'?'Выделить все':'Select all',exact:true});
 const save=panel.getByRole('button',{name:locale==='ru'?'Подтвердить и сохранить выбранные навыки':'Confirm and save selected skills',exact:true});
 await all.check();expect(commands).toEqual([]);await expect(panel.getByRole('checkbox',{name:/Existing skill/})).toBeDisabled();
 await panel.getByRole('checkbox',{name:/SQL/}).uncheck();await expect(all).toHaveAttribute('aria-checked','mixed');expect(commands).toEqual([]);if(locale==='ru'){await page.setViewportSize({width:390,height:844});await panel.screenshot({path:'test-results/select-all-skills-mobile.png'});}
 await all.check();await expect(panel.getByRole('checkbox',{name:/SQL/})).toBeChecked();await all.uncheck();await expect(save).toBeDisabled();expect(commands).toEqual([]);
 await panel.getByRole('checkbox',{name:/Python/}).check();await save.click();await expect.poll(()=>commands.length).toBe(1);expect(commands).toEqual([{action:'verify',ids:['one'],verified:true}]);
 await expect(panel.getByRole('checkbox',{name:/SQL/})).not.toBeChecked();await all.check();await panel.getByRole('button',{name:locale==='ru'?'Отменить выбор':'Cancel selection',exact:true}).click();await expect(panel.getByRole('checkbox',{name:/SQL/})).not.toBeChecked();expect(commands).toHaveLength(1);
 await page.getByRole('button',{name:'Empty facts',exact:true}).click();await expect(all).toBeDisabled();
});
test('bulk save failure retains selection across locale changes and does not retry automatically',async({page})=>{
 let writes=0;await page.route('**/fixture-command',route=>{writes++;return route.fulfill({status:409,json:{}});});
 await page.goto(origin+'/en');await page.getByRole('button',{name:'Load bulk fixture',exact:true}).click();await page.getByRole('checkbox',{name:'Select all',exact:true}).check();
 await page.getByRole('button',{name:'Confirm and save selected skills',exact:true}).click();await expect.poll(()=>writes).toBe(1);await expect(page.getByRole('button',{name:'Confirm and save selected skills',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Switch test locale',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Выделить все',exact:true})).toBeChecked();expect(writes).toBe(1);
});

test('bulk save is single-flight and stale source selection is not applied to replacement facts',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let writes=0;
 await page.route('**/fixture-command',async route=>{writes++;await held;return route.fulfill({json:{ok:true}});});
 await page.goto(origin+'/en');await page.getByRole('button',{name:'Load bulk fixture',exact:true}).click();await page.getByRole('checkbox',{name:'Select all',exact:true}).check();
 const save=page.getByRole('button',{name:'Confirm and save selected skills',exact:true});await save.evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect.poll(()=>writes).toBe(1);await expect(save).toBeDisabled();await expect(page.getByRole('checkbox',{name:'Select all',exact:true})).toBeDisabled();release();await expect(save).toHaveCount(0);expect(writes).toBe(1);
 await page.getByRole('button',{name:'Load bulk fixture',exact:true}).click();await page.getByRole('checkbox',{name:'Select all',exact:true}).check();await page.getByRole('button',{name:'Empty facts',exact:true}).click();await expect(save).toBeDisabled();expect(writes).toBe(1);
});
