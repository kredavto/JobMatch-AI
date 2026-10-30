import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {trackerCopy,applicationStatusLabel} from '../../lib/i18n/tracker';
import {applicationFilterCopy} from '../../lib/i18n/application-filter';
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
const initial={ownerId,revision:1,original:'SQL',vacancy:'SQL',goal:'',facts:[],versions:[
 {id:'v1',created:'2026-10-01',text:'SYNTHETIC RESUME',vacancy:'SQL',score:0,evidence_ids:[]},
 {id:'v2',created:'2026-10-01T00:30+0300',text:'SYNTHETIC RESUME 2',vacancy:'SQL',score:0,evidence_ids:[]},
 {id:'v3',created:'2026-10-01T10:30',text:'SYNTHETIC legacy',vacancy:'SQL',score:0,evidence_ids:[]}
],applications:[
 {id:'a',title:'SYNTHETIC SQL vacancy',note:'SYNTHETIC saved note',status:'Интервью',created:'2026-10-01',resumeVersionId:'v1',events:[{status:'Отклик отправлен',date:'2026-10-01'},{status:'Интервью',date:'2026-10-01T00:30+0300'},{status:'Просмотрено',date:'2026-10-01T10:30'}]},
 {id:'b',title:'SYNTHETIC other',note:'Другой исходный текст',status:'Планируется',created:'2026-10-01',resumeVersionId:null,events:[]}
]};
async function navigate(page:Page,locale:'ru'|'en'){
 await page.goto(origin+'/'+locale);await page.getByRole('navigation').getByRole('button',{name:(locale==='en'?en:ru).navigation.applications,exact:true}).click();
}
for(const locale of ['ru','en'] as const)test(locale+' tracker keeps canonical filters, drafts, caret and selected version across language changes',async({page})=>{
 test.setTimeout(60000);let reads=0,writes=0;const before=JSON.stringify(initial);await page.setViewportSize({width:390,height:844});
 await page.route('**/api/service',route=>{if(route.request().method()==='GET')reads++;else writes++;return route.fulfill({json:initial});});
 await navigate(page,locale);const t=trackerCopy[locale],f=applicationFilterCopy[locale];let card=page.getByRole('region',{name:t.title,exact:true}),list=card.getByRole('region',{name:f.title,exact:true});
 await list.getByLabel(f.search,{exact:true}).fill('SYNTHETIC SQL');await list.getByLabel(f.status,{exact:true}).selectOption('Интервью');await list.getByLabel(f.version,{exact:true}).selectOption('v1');await expect(list.getByRole('status')).toHaveText(f.shown+' 1 '+f.of+' 2');
 await card.getByLabel(t.vacancy,{exact:true}).fill('SYNTHETIC new title');await card.getByLabel(t.version,{exact:true}).selectOption('v2');
 const note=list.getByLabel(t.notes,{exact:true}).first();await note.fill('SYNTHETIC new draft');await note.evaluate((element:HTMLTextAreaElement)=>element.setSelectionRange(3,9));await list.getByText(t.savedNote,{exact:true}).click();
 await page.getByRole('button',{name:'Switch test locale'}).click();const other=locale==='en'?'ru':'en',next=trackerCopy[other],nf=applicationFilterCopy[other];card=page.getByRole('region',{name:next.title,exact:true});list=card.getByRole('region',{name:nf.title,exact:true});
 await expect(list.getByLabel(nf.search,{exact:true})).toHaveValue('SYNTHETIC SQL');await expect(list.getByLabel(nf.status,{exact:true})).toHaveValue('Интервью');await expect(list.getByLabel(nf.version,{exact:true})).toHaveValue('v1');
 const translatedNote=list.getByLabel(next.notes,{exact:true}).first();await expect(translatedNote).toHaveValue('SYNTHETIC new draft');expect(await translatedNote.evaluate((element:HTMLTextAreaElement)=>[element.selectionStart,element.selectionEnd])).toEqual([3,9]);
 await expect(list.locator('details[open] pre')).toHaveText('SYNTHETIC saved note');await expect(list.getByLabel(next.status,{exact:true}).first()).toBeDisabled();await expect(list.getByLabel(next.linkedVersion,{exact:true}).first()).toBeDisabled();
 await expect(card.getByLabel(next.vacancy,{exact:true})).toHaveValue('SYNTHETIC new title');await expect(card.getByLabel(next.version,{exact:true})).toHaveValue('v2');
 await list.getByLabel(nf.search,{exact:true}).fill('no matches');await expect(list.getByText(nf.noMatches,{exact:true})).toBeVisible();await list.getByRole('button',{name:nf.reset,exact:true}).click();await expect(translatedNote).toHaveValue('SYNTHETIC new draft');
 if(other==='en'){expect((await new AxeBuilder({page}).include('[aria-label="Progress towards your next job"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const jpeg=await card.screenshot({type:'jpeg',quality:75,path:'test-results/tracker-en-mobile.jpg'});console.log('JOBMATCH_SYNTHETIC_TRACKER_JPEG '+jpeg.toString('base64'));}
 const nav=page.getByRole('navigation'),ui=other==='en'?en:ru;await nav.getByRole('button',{name:ui.navigation.overview,exact:true}).click();await nav.getByRole('button',{name:ui.navigation.applications,exact:true}).click();await expect(page.getByLabel(next.notes,{exact:true}).first()).toHaveValue('SYNTHETIC new draft');await expect(page.getByLabel(next.vacancy,{exact:true})).toHaveValue('SYNTHETIC new title');expect(reads).toBe(1);expect(writes).toBe(0);expect(JSON.stringify(initial)).toBe(before);
});
test('history and version dates retain precision and match across browser device zones',async({browser})=>{
 const snapshots:string[][]=[];
 for(const timezoneId of ['Pacific/Honolulu','Asia/Kathmandu']){
  const context=await browser.newContext({timezoneId});try{const page=await context.newPage();let writes=0;await page.route('**/api/service',route=>{if(route.request().method()!=='GET')writes++;return route.fulfill({json:initial});});await navigate(page,'en');
   const card=page.getByRole('region',{name:trackerCopy.en.title,exact:true}),history=card.locator('small[aria-label="Status history"]').first();await expect(history).toContainText('date only; time and time zone were not saved');await expect(history).toContainText('21:30 UTC (minute precision): Interview');await expect(history).toContainText('2026-10-01T10:30 (time zone or supported date format is not established; value shown without conversion): Viewed');await expect(history).not.toContainText('00:00:00');
   const version=card.getByLabel(trackerCopy.en.version,{exact:true});await expect(version.locator('option[value="v2"]')).toContainText('21:30 UTC (minute precision)');await expect(version.locator('option[value="v3"]')).toContainText('2026-10-01T10:30');snapshots.push([await history.innerText(),...(await version.locator('option').allTextContents())]);expect(writes).toBe(0);
  }finally{await context.close();}
 }
 expect(snapshots[0]).toEqual(snapshots[1]);
});
test('English tracker writes only canonical Russian statuses, exact notes and version IDs',async({page})=>{
 let current=structuredClone(initial);const bodies:unknown[]=[];await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:current});const body=route.request().postDataJSON();bodies.push(body);
  if(bodies.length===1){expect(body).toEqual({action:'application',revision:1,id:'a',status:'Оффер',note:'SYNTHETIC saved note',expectedOwnerId:ownerId});current.applications[0].status=body.status;}
  else if(bodies.length===2){expect(body).toEqual({action:'application',revision:2,id:'a',status:'Оффер',note:'SYNTHETIC saved note',resumeVersionId:'v2',expectedOwnerId:ownerId});current.applications[0].resumeVersionId=body.resumeVersionId;}
  else {expect(body).toEqual({action:'application',revision:3,title:'SYNTHETIC new application',status:'Планируется',resumeVersionId:'v2',expectedOwnerId:ownerId});current.applications.push({...initial.applications[1],id:'c',title:body.title,resumeVersionId:body.resumeVersionId});}
  current={...current,revision:current.revision+1};return route.fulfill({json:current});
 });
 await navigate(page,'en');const t=trackerCopy.en,card=page.getByRole('region',{name:t.title,exact:true});const first=card.locator('article.application').first();
 await first.getByLabel(t.status,{exact:true}).selectOption({label:applicationStatusLabel('Оффер','en')});await expect(first.getByLabel(t.status,{exact:true})).toBeEnabled();await expect(first.getByLabel(t.status,{exact:true})).toHaveValue('Оффер');
 await first.getByLabel(t.linkedVersion,{exact:true}).selectOption('v2');await expect(first.getByLabel(t.linkedVersion,{exact:true})).toBeEnabled();
 await card.getByLabel(t.vacancy,{exact:true}).fill('SYNTHETIC new application');await card.getByLabel(t.version,{exact:true}).selectOption('v2');await card.getByRole('button',{name:t.add,exact:true}).click();await expect(card.getByLabel(t.vacancy,{exact:true})).toHaveValue('');expect(bodies).toHaveLength(3);
});
test('locale changes during delayed note save keep newer typing and use the acknowledged base',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let writes=0;
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});writes++;const body=route.request().postDataJSON();expect(body).toEqual({action:'application',revision:writes,id:'a',status:'Интервью',note:writes===1?'submitted':'NEWER SYNTHETIC',expectedOwnerId:ownerId});if(writes===1)await held;return route.fulfill({json:{...initial,revision:writes+1,applications:[{...initial.applications[0],note:body.note},initial.applications[1]]}});});
 await navigate(page,'en');await page.getByLabel(trackerCopy.en.notes,{exact:true}).first().fill('submitted');await page.getByRole('button',{name:trackerCopy.en.save,exact:true}).click();await expect.poll(()=>writes).toBe(1);await page.getByLabel(trackerCopy.en.notes,{exact:true}).first().fill('NEWER SYNTHETIC');await page.getByRole('button',{name:'Switch test locale'}).click();await expect(page.getByRole('button',{name:trackerCopy.ru.save,exact:true})).toBeDisabled();release();await expect(page.getByRole('button',{name:trackerCopy.ru.save,exact:true})).toBeEnabled();await expect(page.getByLabel(trackerCopy.ru.notes,{exact:true}).first()).toHaveValue('NEWER SYNTHETIC');await expect(page.getByText(trackerCopy.ru.conflict,{exact:true})).toHaveCount(0);expect(writes).toBe(1);await page.getByRole('button',{name:trackerCopy.ru.save,exact:true}).click();await expect(page.getByRole('button',{name:trackerCopy.ru.save,exact:true})).toHaveCount(0);expect(writes).toBe(2);
});
test('failed writes preserve notes and conflict blocks further writes across locale changes',async({page})=>{
 let writes=0;await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});writes++;return route.fulfill({status:writes===1?429:409,json:{code:writes===1?'RATE_LIMITED':'WORKSPACE_CONFLICT',error:'PRIVATE provider detail'}});});
 await navigate(page,'en');await page.getByLabel(trackerCopy.en.notes,{exact:true}).first().fill('SYNTHETIC local note');await page.getByRole('button',{name:trackerCopy.en.save,exact:true}).click();await expect(page.getByRole('alert').first()).toBeVisible();await page.getByRole('button',{name:'Switch test locale'}).click();await expect(page.getByLabel(trackerCopy.ru.notes,{exact:true}).first()).toHaveValue('SYNTHETIC local note');expect(writes).toBe(1);
 await page.getByRole('button',{name:trackerCopy.ru.save,exact:true}).click();await expect(page.getByRole('button',{name:trackerCopy.ru.save,exact:true})).toBeDisabled();await page.getByRole('button',{name:'Switch test locale'}).click();await expect(page.getByRole('button',{name:trackerCopy.en.save,exact:true})).toBeDisabled();await expect(page.getByLabel(trackerCopy.en.notes,{exact:true}).first()).toHaveValue('SYNTHETIC local note');await expect(page.getByText('PRIVATE provider detail',{exact:true})).toHaveCount(0);expect(writes).toBe(2);
});
