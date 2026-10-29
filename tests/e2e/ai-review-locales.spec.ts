import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {match,parseVacancy,propose} from '../../lib/engine';
import {aiReviewCopy} from '../../lib/i18n/ai-review';
import {ru,en} from '../../lib/i18n';
import {build,stop} from 'esbuild';
import {createServer,type Server} from 'node:http';
import {readFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
let server:Server,origin:string;
test.beforeAll(async()=>{
 const entryPoints=['tests/fixtures/workspace-page.tsx','tests/fixtures/ai-review.tsx'];
 const bundles=await Promise.all(entryPoints.map(entry=>build({entryPoints:[entry],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}})));
 const css=await readFile('app/globals.css','utf8'),scripts=bundles.map(bundle=>bundle.outputFiles[0].text);
 server=createServer((request,response)=>{
  const path=request.url||'';
  if(path==='/workspace.js'||path==='/panel.js'){response.writeHead(200,{'Content-Type':'application/javascript'});response.end(scripts[path==='/workspace.js'?0:1]);return;}
  if(!['/ru','/en','/panel-ru','/panel-en'].includes(path)){response.writeHead(404);response.end();return;}
  const locale=path.endsWith('en')?'en':'ru',script=path.startsWith('/panel-')?'panel':'workspace';
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end('<!doctype html><html lang="'+locale+'"><head><meta charset="utf-8"><title>Synthetic AI component fixture</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'main{max-width:800px;margin:auto;padding:16px}</style></head><body><div id="root"></div><script src="/'+script+'.js"></script></body></html>');
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
test.afterAll(async()=>{if(server)await new Promise<void>((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();});stop();});
const ownerId='11111111-1111-4111-8111-111111111111';
const facts=[{id:'f1',text:'SYNTHETIC PROFILE SQL 😀 42%',source:'SYNTHETIC fixture',verified:true}];
const state={ownerId,revision:1,original:facts[0].text,vacancy:'Must-have:\nSQL',goal:'',facts,applications:[],versions:[]};
function envelope(owner=ownerId,revision=1){return {ownerId:owner,revision,review:{requirements:[{quote:'SQL',evidence_ids:['f1']}]}};}
async function nav(page:Page,tab:keyof typeof ru.navigation,locale:'ru'|'en'){await page.getByRole('navigation').getByRole('button',{name:(locale==='en'?en:ru).navigation[tab],exact:true}).click();}
async function editor(page:Page,locale:'ru'|'en'){
 await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:state});expect(route.request().postDataJSON().action).toBe('analyze');const requirements=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(facts,requirements),edits:propose(facts,requirements)}});});
 await page.goto(origin+'/'+locale);await nav(page,'vacancy',locale);await page.getByRole('button',{name:locale==='en'?'Analyze →':'Проанализировать →',exact:true}).click();
 return page.getByRole('region',{name:aiReviewCopy[locale].title,exact:true});
}
for(const locale of ['ru','en'] as const)test(locale+' consent and exact AI result persist across a pending locale change without replay',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let requests=0,writes=0;const before=JSON.stringify(state);
 page.on('request',request=>{if(request.url().endsWith('/api/service')&&request.method()==='POST'&&request.postDataJSON().action!=='analyze')writes++;});
 await page.route('**/api/ai-review',async route=>{requests++;expect(route.request().postDataJSON()).toEqual({consent:true,revision:1,expectedOwnerId:ownerId});await held;return route.fulfill({json:envelope()});});
 await page.setViewportSize({width:390,height:844});let panel=await editor(page,locale);await expect(panel.getByRole('button')).toBeDisabled();expect(requests).toBe(0);await panel.getByRole('checkbox').check();await panel.getByRole('button').evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect.poll(()=>requests).toBe(1);
 const other=locale==='en'?'ru':'en';await page.getByRole('button',{name:'Switch test locale'}).click();panel=page.getByRole('region',{name:aiReviewCopy[other].title,exact:true});await expect(panel.getByRole('checkbox')).toBeChecked();await expect(panel.getByRole('checkbox')).toBeDisabled();await expect(panel.getByRole('button')).toHaveText(aiReviewCopy[other].busy);release();await expect(panel.getByRole('blockquote')).toHaveText('SQL');await expect(panel.getByRole('listitem').last()).toHaveText(facts[0].text);
 await page.getByRole('button',{name:'Switch test locale'}).click();panel=page.getByRole('region',{name:aiReviewCopy[locale].title,exact:true});await expect(panel.getByRole('checkbox')).toBeChecked();await expect(panel.getByRole('blockquote')).toHaveText('SQL');expect(requests).toBe(1);expect(writes).toBe(0);expect(JSON.stringify(state)).toBe(before);
 if(locale==='en'){expect((await new AxeBuilder({page}).include('[aria-labelledby="ai-review-title"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(panel).toContainText('SYNTHETIC PROFILE');const png=await panel.screenshot({path:'test-results/ai-review-en-mobile.png'});console.log('JOBMATCH_SYNTHETIC_AI_REVIEW_PNG '+png.toString('base64'));}
});
test('late HTTP failure takes precedence over HTML body and translates without repeating the request',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let requests=0;
 await page.route('**/api/ai-review',async route=>{requests++;if(requests===1){await held;return route.fulfill({status:503,contentType:'text/html',body:'PRIVATE_RAW HTML'});}return route.fulfill({json:envelope()});});await page.goto(origin+'/panel-ru');await page.getByRole('checkbox').check();await page.getByRole('button',{name:aiReviewCopy.ru.run,exact:true}).click();await expect.poll(()=>requests).toBe(1);await page.getByRole('button',{name:'Switch test locale'}).click();release();await expect(page.getByRole('alert')).toHaveText(aiReviewCopy.en.errors.unavailable);await expect(page.locator('body')).not.toContainText('PRIVATE_RAW');expect(requests).toBe(1);await page.getByRole('button',{name:aiReviewCopy.en.run,exact:true}).click();await expect(page.getByRole('blockquote')).toHaveText('SQL');expect(requests).toBe(2);
});
test('malformed success JSON and invented evidence are rejected before an explicit valid retry',async({page})=>{
 let requests=0;await page.route('**/api/ai-review',route=>{requests++;if(requests===1)return route.fulfill({status:200,contentType:'text/html',body:'PRIVATE_RAW JSON'});return route.fulfill({json:requests===2?{...envelope(),review:{requirements:[{quote:'SQL',evidence_ids:['invented']}]}}:envelope()});});await page.goto(origin+'/panel-en');await page.getByRole('checkbox').check();
 for(let attempt=1;attempt<=2;attempt++){await page.getByRole('button',{name:aiReviewCopy.en.run,exact:true}).click();await expect(page.getByRole('alert')).toHaveText(aiReviewCopy.en.errors.invalid);await expect(page.getByRole('blockquote')).toHaveCount(0);expect(requests).toBe(attempt);}
 await page.getByRole('button',{name:'Switch test locale'}).click();await expect(page.getByRole('alert')).toHaveText(aiReviewCopy.ru.errors.invalid);await expect(page.getByRole('checkbox')).toBeChecked();await expect(page.locator('body')).not.toContainText('PRIVATE_RAW');await page.getByRole('button',{name:aiReviewCopy.ru.run,exact:true}).click();await expect(page.getByRole('blockquote')).toHaveText('SQL');expect(requests).toBe(3);
});
for(const change of ['owner','revision'] as const)test('changing '+change+' clears consent and rejects a late result until a new explicit request',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let requests=0;
 const nextOwner=change==='owner'?'22222222-2222-4222-8222-222222222222':ownerId,nextRevision=change==='revision'?2:1;
 await page.route('**/api/ai-review',async route=>{requests++;if(requests===1){await held;await route.fulfill({json:envelope()}).catch(()=>{});return;}expect(route.request().postDataJSON()).toEqual({consent:true,revision:nextRevision,expectedOwnerId:nextOwner});return route.fulfill({json:envelope(nextOwner,nextRevision)});});await page.goto(origin+'/panel-en');await page.getByRole('checkbox').check();await page.getByRole('button',{name:aiReviewCopy.en.run,exact:true}).click();await expect.poll(()=>requests).toBe(1);await page.getByRole('button',{name:change==='owner'?'Change test owner':'Change test revision',exact:true}).click();await expect(page.getByRole('checkbox')).not.toBeChecked();await expect(page.getByRole('button',{name:aiReviewCopy.en.run,exact:true})).toBeDisabled();release();await expect(page.getByRole('blockquote')).toHaveCount(0);expect(requests).toBe(1);await page.getByRole('checkbox').check();await page.getByRole('button',{name:aiReviewCopy.en.run,exact:true}).click();await expect(page.getByRole('blockquote')).toHaveText('SQL');expect(requests).toBe(2);
});
test('timeout, network and unexpected runtime errors stay semantic without automatic retries',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let requests=0;
 await page.route('**/api/ai-review',async route=>{requests++;if(requests===1){await held;await route.fulfill({json:envelope()}).catch(()=>{});return;}await route.abort('failed');});await page.goto(origin+'/panel-en');await page.clock.install();await page.getByRole('checkbox').check();await page.getByRole('button',{name:aiReviewCopy.en.run,exact:true}).click();await expect.poll(()=>requests).toBe(1);await page.clock.runFor(25001);await expect(page.getByRole('alert')).toHaveText(aiReviewCopy.en.errors.interrupted);release();await page.getByRole('button',{name:'Switch test locale'}).click();await expect(page.getByRole('alert')).toHaveText(aiReviewCopy.ru.errors.interrupted);expect(requests).toBe(1);
 await page.getByRole('button',{name:aiReviewCopy.ru.run,exact:true}).click();await expect(page.getByRole('alert')).toHaveText(aiReviewCopy.ru.errors.network);expect(requests).toBe(2);await page.evaluate(()=>{window.fetch=async()=>{throw new Error('PRIVATE_RAW runtime error');};});await page.getByRole('button',{name:aiReviewCopy.ru.run,exact:true}).click();await expect(page.getByRole('alert')).toHaveText(aiReviewCopy.ru.errors.failed);await expect(page.locator('body')).not.toContainText('PRIVATE_RAW');expect(requests).toBe(2);
});
test('leaving the editor aborts pending review and keeps a newer profile draft; dirty sources block a new request',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let requests=0;
 await page.route('**/api/ai-review',async route=>{requests++;await held;await route.fulfill({json:envelope()}).catch(()=>{});});let panel=await editor(page,'en');await panel.getByRole('checkbox').check();await panel.getByRole('button').click();await expect.poll(()=>requests).toBe(1);await nav(page,'profile','en');await page.getByRole('textbox',{name:'Review the imported text',exact:true}).fill('NEWER SYNTHETIC DRAFT 😀');release();await expect(page.getByRole('textbox',{name:'Review the imported text',exact:true})).toHaveValue('NEWER SYNTHETIC DRAFT 😀');await nav(page,'editor','en');panel=page.getByRole('region',{name:aiReviewCopy.en.title,exact:true});await expect(panel.getByRole('checkbox')).not.toBeChecked();await panel.getByRole('checkbox').check();await expect(panel.getByRole('button')).toBeDisabled();await expect(panel).toContainText(aiReviewCopy.en.dirty);await expect(panel.getByRole('blockquote')).toHaveCount(0);expect(requests).toBe(1);
});
