import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {match,parseVacancy,propose,renderVersion} from '../../lib/engine';
import {editorCopy} from '../../lib/i18n/editor';
import {versionsCopy} from '../../lib/i18n/versions';
import {ru,en} from '../../lib/i18n';
import {build,stop} from 'esbuild';
import {createServer,type Server} from 'node:http';
import {readFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
let server:Server,origin:string;
test.beforeAll(async()=>{
 const bundle=await build({entryPoints:['tests/fixtures/workspace-page.tsx'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
 const css=await readFile('app/globals.css','utf8'),script=bundle.outputFiles[0].text;
 server=createServer((request,response)=>{if(request.url==='/bundle.js'){response.writeHead(200,{'Content-Type':'application/javascript'});response.end(script);return;}if(request.url!=='/ru'&&request.url!=='/en'){response.writeHead(404);response.end();return;}const locale=request.url.slice(1);response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>Component locale fixture</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}main{max-width:800px;margin:auto;padding:16px}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
test.afterAll(async()=>{if(server)await new Promise<void>((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();});stop();});
const ownerId='11111111-1111-4111-8111-111111111111';
const initial={ownerId,revision:1,original:'SYNTHETIC PROFILE\nSQL\nPython',vacancy:'Must-have:\nSQL\nPython',goal:'',facts:[{id:'f1',text:'SQL',source:'SYNTHETIC fixture',verified:true},{id:'f2',text:'Python',source:'SYNTHETIC fixture',verified:true}],versions:[],applications:[]};
function result(state=initial){const requirements=parseVacancy(state.vacancy);return {analysis:match(state.facts,requirements),edits:propose(state.facts,requirements)};}
function version(){return {id:'version-1',created:'2026-10-29T12:00:00.000Z',text:renderVersion(initial.original,result().edits,initial.facts),vacancy:initial.vacancy,evidence_ids:['f1','f2'],score:100,evidence_snapshot:initial.facts,profile_revision:1,engine_version:'rules-v1'};}
async function nav(page:Page,tab:keyof typeof ru.navigation,locale:'ru'|'en'){await page.getByRole('navigation').getByRole('button',{name:(locale==='en'?en:ru).navigation[tab],exact:true}).click();}
async function analyze(page:Page,locale:'ru'|'en'){await nav(page,'vacancy',locale);await page.getByRole('button',{name:locale==='en'?'Analyze →':'Проанализировать →',exact:true}).click();await expect(page.getByRole('region',{name:editorCopy[locale].region,exact:true})).toBeVisible();}
for(const locale of ['ru','en'] as const)test(locale+' editor keeps quotes, choice history and saved JSON unchanged across locale changes',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);let reads=0,analyses=0,versions=0;
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET'){reads++;return route.fulfill({json:initial});}
  const body=route.request().postDataJSON();
  if(body.action==='analyze'){analyses++;expect(body).toEqual({action:'analyze',revision:1,expectedOwnerId:ownerId});return route.fulfill({json:result()});}
  expect(body).toEqual({action:'version',revision:1,ids:['edit-f1','edit-f2'],expectedOwnerId:ownerId});versions++;return route.fulfill({json:{...initial,revision:2,versions:[version()]}});
 });
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/'+locale);await analyze(page,locale);
 const t=editorCopy[locale];let panel=page.getByRole('region',{name:t.region,exact:true});
 await expect(panel.getByRole('table')).toContainText('f1');await expect(panel.getByRole('table')).toContainText('f2');
 await expect(panel.locator('.stats').getByText('100',{exact:false}).first()).toBeVisible();
 await panel.getByRole('button',{name:t.acceptAll,exact:true}).click();await expect(panel.getByRole('checkbox').first()).toBeChecked();
 await panel.getByRole('button',{name:t.original,exact:true}).click();await expect(panel.getByRole('checkbox').first()).not.toBeChecked();
 await panel.getByRole('button',{name:t.undo,exact:true}).click();await expect(panel.getByRole('checkbox').first()).toBeChecked();
 const preview=await panel.locator('.compare section').last().locator('pre').innerText();expect(preview).toBe(version().text+'\n');
 await page.getByRole('button',{name:'Switch test locale'}).click();const other=locale==='en'?'ru':'en';panel=page.getByRole('region',{name:editorCopy[other].region,exact:true});
 await expect(panel.getByRole('checkbox').first()).toBeChecked();expect(await panel.locator('.compare section').last().locator('pre').innerText()).toBe(preview);expect(reads).toBe(1);expect(analyses).toBe(1);expect(versions).toBe(0);
 await page.getByRole('button',{name:'Switch test locale'}).click();panel=page.getByRole('region',{name:t.region,exact:true});
 if(locale==='en'){
  await expect(panel.locator('.compare section').first()).toContainText('SYNTHETIC PROFILE');
  expect((await new AxeBuilder({page}).include('[aria-label="Saved source editor"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const screenshot=await panel.screenshot({path:'test-results/editor-en-mobile.png'});console.log('JOBMATCH_SYNTHETIC_EDITOR_PNG '+screenshot.toString('base64'));
 }
 await panel.getByRole('button',{name:t.save,exact:true}).click();await expect(page.getByRole('heading',{name:versionsCopy[locale].historyTitle,exact:true})).toBeVisible();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:versionsCopy[locale].json,exact:true}).click();const download=await downloaded,path=await download.path();expect(path).toBeTruthy();expect(JSON.parse(await readFile(path!,'utf8'))).toEqual(version());expect(versions).toBe(1);expect(analyses).toBe(1);expect(reads).toBe(1);
});
test('unsaved sources block analysis and version selection without losing saved context or chosen edits',async({page})=>{
 let analyses=0,writes=0;
 await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});if(route.request().postDataJSON().action==='analyze'){analyses++;return route.fulfill({json:result()});}writes++;return route.fulfill({json:initial});});
 await page.goto(origin+'/en');await analyze(page,'en');await page.getByRole('button',{name:editorCopy.en.acceptAll,exact:true}).click();
 await nav(page,'profile','en');await page.getByRole('textbox',{name:'Review the imported text',exact:true}).fill(initial.original+'\nLATER DRAFT 😀');
 await nav(page,'editor','en');let panel=page.getByRole('region',{name:editorCopy.en.region,exact:true});await expect(panel).toContainText(editorCopy.en.dirtyHelp);
 await expect(panel.getByRole('button',{name:editorCopy.en.save,exact:true})).toBeDisabled();await expect(panel.getByRole('button',{name:editorCopy.en.acceptAll,exact:true})).toBeDisabled();await expect(panel.getByRole('checkbox').first()).toBeDisabled();await expect(panel.getByRole('checkbox').first()).toBeChecked();
 await panel.getByText(editorCopy.en.sourceDetails,{exact:true}).click();await expect(panel.getByRole('heading',{name:editorCopy.en.sourceResume,exact:true}).locator('..')).toContainText(initial.original);await expect(panel).not.toContainText('LATER DRAFT');
 await page.getByRole('button',{name:'Switch test locale'}).click();panel=page.getByRole('region',{name:editorCopy.ru.region,exact:true});await expect(panel).toContainText(editorCopy.ru.dirtyHelp);await expect(panel.getByRole('checkbox').first()).toBeChecked();
 await nav(page,'vacancy','ru');await expect(page.getByRole('button',{name:'Проанализировать →',exact:true})).toBeDisabled();
 await nav(page,'profile','ru');await expect(page.getByRole('textbox',{name:'Проверьте текст после импорта',exact:true})).toHaveValue(initial.original+'\nLATER DRAFT 😀');await page.getByRole('textbox',{name:'Проверьте текст после импорта',exact:true}).fill(initial.original);
 await nav(page,'editor','ru');panel=page.getByRole('region',{name:editorCopy.ru.region,exact:true});await expect(panel.getByRole('button',{name:editorCopy.ru.save,exact:true})).toBeEnabled();await expect(panel.getByRole('checkbox').first()).toBeChecked();expect(analyses).toBe(1);expect(writes).toBe(0);
 await nav(page,'vacancy','ru');await page.getByRole('textbox',{name:'Текст вакансии',exact:true}).fill(initial.vacancy+'\nNEW VACANCY DRAFT');await nav(page,'editor','ru');await expect(page.getByRole('button',{name:editorCopy.ru.save,exact:true})).toBeDisabled();expect(writes).toBe(0);
});
test('late analysis keeps a later profile draft and navigation while exposing the saved result read-only',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let analyses=0,writes=0;
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});if(route.request().postDataJSON().action==='analyze'){analyses++;await held;return route.fulfill({json:result()});}writes++;return route.fulfill({json:initial});});
 await page.goto(origin+'/ru');await nav(page,'vacancy','ru');await page.getByRole('button',{name:'Проанализировать →',exact:true}).click();await expect.poll(()=>analyses).toBe(1);
 await nav(page,'profile','ru');await page.getByRole('textbox',{name:'Проверьте текст после импорта',exact:true}).fill('LATE SYNTHETIC DRAFT 😀');
 await page.getByRole('button',{name:'Switch test locale'}).click();release();await expect(page.getByRole('status')).toHaveCount(0);await expect(page.getByRole('textbox',{name:'Review the imported text',exact:true})).toHaveValue('LATE SYNTHETIC DRAFT 😀');
 await nav(page,'editor','en');const panel=page.getByRole('region',{name:editorCopy.en.region,exact:true});await expect(panel.getByRole('table')).toBeVisible();await expect(panel.getByRole('button',{name:editorCopy.en.save,exact:true})).toBeDisabled();expect(analyses).toBe(1);expect(writes).toBe(0);
});
test('late version save retains a newer vacancy draft and navigation without replaying the write',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let versions=0;
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});if(route.request().postDataJSON().action==='analyze')return route.fulfill({json:result()});versions++;await held;return route.fulfill({json:{...initial,revision:2,versions:[version()]}});});
 await page.goto(origin+'/en');await analyze(page,'en');await page.getByRole('button',{name:editorCopy.en.acceptAll,exact:true}).click();await page.getByRole('button',{name:editorCopy.en.save,exact:true}).click();await expect.poll(()=>versions).toBe(1);
 await nav(page,'vacancy','en');await page.getByRole('textbox',{name:'Vacancy text',exact:true}).fill('NEWER SYNTHETIC VACANCY 😀');await page.getByRole('button',{name:'Switch test locale'}).click();release();await expect(page.getByRole('status')).toHaveText('Сохранено');await expect(page.getByRole('textbox',{name:'Текст вакансии',exact:true})).toHaveValue('NEWER SYNTHETIC VACANCY 😀');
 await nav(page,'versions','ru');await expect(page.getByRole('heading',{name:'История резюме',exact:true})).toBeVisible();await expect(page.locator('pre').filter({hasText:'РЕЛЕВАНТНЫЙ ОПЫТ'}).first()).toContainText('SYNTHETIC PROFILE');expect(versions).toBe(1);
});
test('English clarification explains a conservative exclusion without translating evidence or awarding a skill',async({page})=>{
 const state={...initial,original:'SYNTHETIC PROFILE\nSQL\nНе работал с SQL',vacancy:'Must-have:\nSQL',facts:[initial.facts[0],{id:'negative-1',text:'Не работал с SQL',source:'SYNTHETIC fixture',verified:true}]};let writes=0;
 const requirements=parseVacancy(state.vacancy),payload={analysis:match(state.facts,requirements),edits:propose(state.facts,requirements)},before=JSON.stringify(payload);
 await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:state});if(route.request().postDataJSON().action!=='analyze')writes++;return route.fulfill({json:payload});});
 await page.goto(origin+'/en');await analyze(page,'en');const panel=page.getByRole('region',{name:editorCopy.en.region,exact:true}),review=panel.getByRole('region',{name:editorCopy.en.riskRegion,exact:true});
 await expect(panel.getByRole('table')).toContainText(editorCopy.en.reasons.conflict);await review.getByText('Не работал с SQL',{exact:true}).click();await expect(review).toContainText(editorCopy.en.reasons.negation);await expect(review).toContainText('negative-1');await expect(panel.getByRole('checkbox')).toHaveCount(0);expect(payload.analysis.score).toBe(0);expect(payload.edits).toEqual([]);expect(JSON.stringify(payload)).toBe(before);expect(writes).toBe(0);
});
