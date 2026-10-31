import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {build,stop} from 'esbuild';
import {createServer,type Server} from 'node:http';
import {readFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
import {specialtyCopy} from '../../lib/i18n/application-specialty';
import type {Workspace} from '../../lib/db';

let server:Server,origin:string;
test.beforeAll(async()=>{
 const bundle=await build({entryPoints:['tests/fixtures/workspace-page.tsx'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
 const css=await readFile('app/globals.css','utf8'),script=bundle.outputFiles[0].text;
 server=createServer((request,response)=>{
  if(request.url==='/bundle.js'){response.writeHead(200,{'Content-Type':'application/javascript'});response.end(script);return;}
  if(request.url!=='/ru'&&request.url!=='/en'){response.writeHead(404);response.end();return;}
  const locale=request.url.slice(1);response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  response.end(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>Synthetic specialty fixture</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}main{max-width:800px;margin:auto;padding:16px}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
test.afterAll(async()=>{if(server)await new Promise<void>((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();});stop();});
const ownerId='11111111-1111-4111-8111-111111111111';
const initial:Workspace={ownerId,revision:1,original:'SYNTHETIC source',vacancy:'SYNTHETIC vacancy',goal:'SYNTHETIC current goal must not classify old applications',facts:[],versions:[],applications:[{id:'a',title:'SYNTHETIC SQL application',status:'Планируется',note:'saved note',created:'2026-10-31',events:[{status:'Планируется',date:'2026-10-31'}]}]};
async function tracker(page:Page,locale:'ru'|'en'='ru'){
 await page.goto(origin+'/'+locale);await page.getByRole('navigation').getByRole('button',{name:locale==='ru'?'Отклики':'Applications',exact:true}).click();
}
test('typing, invalid labels, cancellation and locale switches never write or lose the note draft',async({page})=>{
 let writes=0;await page.route('**/api/service',route=>{if(route.request().method()!=='GET')writes++;return route.fulfill({json:initial});});
 await tracker(page);await page.getByLabel('Заметки',{exact:true}).fill('SYNTHETIC unsaved note');
 await page.getByLabel(specialtyCopy.ru.label,{exact:true}).fill(' leading');await expect(page.getByRole('button',{name:specialtyCopy.ru.save,exact:true})).toBeDisabled();
 await page.getByLabel(specialtyCopy.ru.label,{exact:true}).fill('SYNTHETIC QA');await page.getByRole('button',{name:'Switch test locale'}).click();
 await expect(page.getByLabel(specialtyCopy.en.label,{exact:true})).toHaveValue('SYNTHETIC QA');await expect(page.getByLabel('Notes',{exact:true})).toHaveValue('SYNTHETIC unsaved note');
 await page.getByRole('button',{name:specialtyCopy.en.cancel,exact:true}).click();await expect(page.getByLabel(specialtyCopy.en.label,{exact:true})).toHaveValue('');
 expect(writes).toBe(0);
});
test('one explicit save preserves newer typing, an unsaved note and unchanged lifecycle',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let writes=0;
 let state=structuredClone(initial);
 await page.route('**/api/service',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  writes++;const body=route.request().postDataJSON();expect(body).toEqual({action:'application',revision:writes,id:'a',status:'Планируется',note:'saved note',specialty:writes===1?'SYNTHETIC submitted':'SYNTHETIC newer',expectedOwnerId:ownerId});
  if(writes===1)await held;
  state={...state,revision:state.revision+1,applications:[{...state.applications[0],specialty:body.specialty}]};return route.fulfill({json:state});
 });
 await tracker(page);await page.getByLabel('Заметки',{exact:true}).fill('SYNTHETIC note draft');const label=page.getByLabel(specialtyCopy.ru.label,{exact:true});await label.fill('SYNTHETIC submitted');
 await page.getByRole('button',{name:specialtyCopy.ru.save,exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect.poll(()=>writes).toBe(1);
 await label.fill('SYNTHETIC newer');release();await expect(page.getByRole('status').filter({hasText:'Сохранено'})).toBeVisible();
 await expect(label).toHaveValue('SYNTHETIC newer');await expect(page.getByLabel('Заметки',{exact:true})).toHaveValue('SYNTHETIC note draft');await expect(page.getByText(specialtyCopy.ru.conflict,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:specialtyCopy.ru.save,exact:true}).click();await expect(page.getByText(specialtyCopy.ru.unsaved,{exact:true})).toHaveCount(0);
 expect(writes).toBe(2);expect(state.applications[0].events).toEqual(initial.applications[0].events);expect(state.applications[0].note).toBe('saved note');
});
for(const failure of ['wrong-label','wrong-owner','wrong-revision','unrelated-note'] as const)test('ambiguous '+failure+' acknowledgement leaves state and draft unaccepted without retry',async({page})=>{
 let writes=0;await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:initial});writes++;
  const saved={...initial,revision:2,applications:[{...initial.applications[0],specialty:'SYNTHETIC requested'}]};
  if(failure==='wrong-label')saved.applications[0].specialty='SYNTHETIC unexpected';
  if(failure==='wrong-owner')saved.ownerId='22222222-2222-4222-8222-222222222222';
  if(failure==='wrong-revision')saved.revision=3;
  if(failure==='unrelated-note')saved.applications[0].note='SYNTHETIC unexpected note';
  return route.fulfill({json:saved});
 });
 await tracker(page);await page.getByLabel(specialtyCopy.ru.label,{exact:true}).fill('SYNTHETIC requested');await page.getByRole('button',{name:specialtyCopy.ru.save,exact:true}).click();
 await expect(page.getByRole('alert').first()).toBeVisible();await expect(page.getByLabel(specialtyCopy.ru.label,{exact:true})).toHaveValue('SYNTHETIC requested');
 await expect(page.getByRole('button',{name:specialtyCopy.ru.save,exact:true})).toBeDisabled();await expect(page.getByLabel('Заметки',{exact:true})).toHaveValue('saved note');expect(writes).toBe(1);
});
test('a rate-limit refusal retains a manually retryable draft',async({page})=>{
 let writes=0;await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});writes++;return route.fulfill({status:429,json:{code:'RATE_LIMITED',error:'ignored'}});});
 await tracker(page);await page.getByLabel(specialtyCopy.ru.label,{exact:true}).fill('SYNTHETIC QA');await page.getByRole('button',{name:specialtyCopy.ru.save,exact:true}).click();
 await expect(page.getByRole('alert').first()).toBeVisible();await expect(page.getByLabel(specialtyCopy.ru.label,{exact:true})).toHaveValue('SYNTHETIC QA');await expect(page.getByRole('button',{name:specialtyCopy.ru.save,exact:true})).toBeEnabled();expect(writes).toBe(1);
});
test('an unknown legacy owner cannot start a specialty write',async({page})=>{
 let writes=0;const state={...initial,ownerId:undefined};
 await page.route('**/api/service',route=>{if(route.request().method()!=='GET')writes++;return route.fulfill({json:state});});
 await tracker(page);await expect(page.getByLabel(specialtyCopy.ru.label,{exact:true})).toHaveCount(0);expect(writes).toBe(0);
});
test('unknown legacy metadata survives until explicit replacement and clearing remains a separate confirmed write',async({page})=>{
 let writes=0,state:Workspace={...initial,applications:[{...initial.applications[0],specialty:{legacy:['SYNTHETIC opaque']}}]};
 await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:state});writes++;const body=route.request().postDataJSON();expect(body.specialty).toBe(writes===1?'SYNTHETIC analyst':'');state={...state,revision:state.revision+1,applications:[{...state.applications[0],specialty:body.specialty}]};return route.fulfill({json:state});});
 await tracker(page);await expect(page.getByText(specialtyCopy.ru.legacy,{exact:true})).toBeVisible();expect(writes).toBe(0);
 await page.getByLabel(specialtyCopy.ru.label,{exact:true}).fill('SYNTHETIC analyst');await page.getByRole('button',{name:specialtyCopy.ru.save,exact:true}).click();await expect(page.getByText(specialtyCopy.ru.legacy,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:specialtyCopy.ru.clear,exact:true}).click();expect(writes).toBe(1);await page.getByRole('button',{name:specialtyCopy.ru.save,exact:true}).click();await expect(page.getByText(specialtyCopy.ru.unsaved,{exact:true})).toHaveCount(0);expect(writes).toBe(2);
});
test('literal specialty groups, filters and formula-safe CSV persist across language changes on mobile',async({page})=>{
 const state:Workspace={...initial,applications:[
  {...initial.applications[0],specialty:'SYNTHETIC QA',status:'Приглашение',events:[{status:'Приглашение',date:'2026-10-31'}]},
  {...initial.applications[0],id:'b',specialty:'SYNTHETIC QA',title:'SYNTHETIC planned'},
  {...initial.applications[0],id:'c',specialty:'=SYNTHETIC("Я")',title:'SYNTHETIC formula'},
  {...initial.applications[0],id:'d',title:'SYNTHETIC unclassified'},
 ]};let writes=0,reads=0;
 await page.route('**/api/service',route=>{if(route.request().method()==='GET')reads++;else writes++;return route.fulfill({json:state});});await page.setViewportSize({width:390,height:844});
 await page.goto(origin+'/ru');await page.getByRole('navigation').getByRole('button',{name:'Аналитика',exact:true}).click();
 let table=page.getByRole('region',{name:specialtyCopy.ru.title,exact:true});await expect(table.locator('tbody tr')).toHaveCount(3);
 await expect(table).toContainText(specialtyCopy.ru.unset);await expect(table).not.toContainText(initial.goal);
 await page.getByLabel(specialtyCopy.ru.filter,{exact:true}).selectOption('label:SYNTHETIC QA');await expect(table.locator('tbody tr')).toHaveCount(1);await expect(table.locator('tbody tr')).toContainText('100% (1/1)');
 await page.getByRole('button',{name:'Switch test locale'}).click();await expect(page.getByLabel(specialtyCopy.en.filter,{exact:true})).toHaveValue('label:SYNTHETIC QA');
 await page.getByLabel(specialtyCopy.en.filter,{exact:true}).selectOption('');table=page.getByRole('region',{name:specialtyCopy.en.title,exact:true});await expect(table.locator('tbody tr')).toHaveCount(3);
 const waiting=page.waitForEvent('download');await page.getByRole('button',{name:specialtyCopy.en.export,exact:true}).click();const file=await waiting,csv=await readFile((await file.path())!,'utf8');
 expect(file.suggestedFilename()).toBe('jobmatch-specialties.csv');expect(csv).toContain('"\'=SYNTHETIC(""Я"")"');expect(csv).toContain('"SYNTHETIC QA","2","1","1","0","0","1","100","0"');expect(csv).toContain(specialtyCopy.en.unset);
 expect((await new AxeBuilder({page}).include('[aria-label="Application analytics"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await table.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
 const screenshot=await page.getByRole('region',{name:'Application analytics',exact:true}).screenshot({type:'jpeg',quality:70,path:'test-results/specialty-analytics-en-mobile.jpg'});console.log('JOBMATCH_SYNTHETIC_SPECIALTY_JPEG '+screenshot.toString('base64'));
 expect(reads).toBe(1);expect(writes).toBe(0);
});
