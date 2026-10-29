import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import mammoth from 'mammoth';
import {resumeDocx} from '../../lib/resume-docx';
import {matchMetadata} from '../../lib/match-config';
import {versionsCopy} from '../../lib/i18n/versions';
import {formatVersionCreated} from '../../lib/i18n/version-dates';
import {ru,en} from '../../lib/i18n';
import {build,stop} from 'esbuild';
import {createServer,type Server} from 'node:http';
import {readFile} from 'node:fs/promises';
import type {AddressInfo} from 'node:net';
let server:Server,origin:string;
test.beforeAll(async()=>{
 const entryPoints=['tests/fixtures/workspace-page.tsx','tests/fixtures/version-download.tsx'];
 const bundles=await Promise.all(entryPoints.map(entry=>build({entryPoints:[entry],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'}})));
 const css=await readFile('app/globals.css','utf8'),scripts=bundles.map(bundle=>bundle.outputFiles[0].text);
 server=createServer((request,response)=>{
  const path=request.url||'';
  if(path==='/workspace.js'||path==='/download.js'){response.writeHead(200,{'Content-Type':'application/javascript'});response.end(scripts[path==='/workspace.js'?0:1]);return;}
  if(!['/ru','/en','/download-ru','/download-en'].includes(path)){response.writeHead(404);response.end();return;}
  const locale=path.endsWith('en')?'en':'ru',script=path.startsWith('/download-')?'download':'workspace';
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end('<!doctype html><html lang="'+locale+'"><head><meta charset="utf-8"><title>Synthetic version component fixture</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'main{max-width:800px;margin:auto;padding:16px}</style></head><body><div id="root"></div><script src="/'+script+'.js"></script></body></html>');
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+(server.address() as AddressInfo).port;
});
test.afterAll(async()=>{if(server)await new Promise<void>((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();});stop();});
const ownerId='11111111-1111-4111-8111-111111111111',MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const facts=[{id:'source-1',text:'SQL 😀 42%',source:'SYNTHETIC источник',verified:true}];
const metadata=matchMetadata([{status:'matched'}]);
const one={id:'one',created:'2026-10-25',text:'SYNTHETIC PROFILE\nSQL 😀 42%',vacancy:'SQL',score:40,evidence_ids:['source-1'],evidence_snapshot:facts,profile_revision:7,engine_version:'rules-v1',match_metadata:metadata,extra:'verbatim 😀'};
const two={...one,id:'two',created:'2026-10-26T00:30:00+03:00',text:'SYNTHETIC PROFILE\nSQL 😀 42%\nPython',score:60,restored_from:'historical-source'};
const state={ownerId,revision:1,original:'SYNTHETIC CURRENT PROFILE',vacancy:'SQL',goal:'',facts:[],applications:[],versions:[one,two]};
async function nav(page:Page,tab:keyof typeof ru.navigation,locale:'ru'|'en'){await page.getByRole('navigation').getByRole('button',{name:(locale==='en'?en:ru).navigation[tab],exact:true}).click();}
function items(page:Page,locale:'ru'|'en'){return page.getByRole('region',{name:versionsCopy[locale].historyRegion,exact:true}).locator('section.card').last().locator(':scope > details');}
for(const locale of ['ru','en'] as const)test(locale+' saved history preserves selection, provenance and exact TXT/JSON across locale changes',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);let reads=0,writes=0,copied='';const before=JSON.stringify(state);
 await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text:string)=>{(window as unknown as {copied:string}).copied=text;}}});});
 await page.route('**/api/service',route=>{if(route.request().method()==='GET')reads++;else writes++;return route.fulfill({json:state});});
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/'+locale);await nav(page,'versions',locale);
 const t=versionsCopy[locale],other=locale==='en'?'ru':'en';let panel=page.getByRole('region',{name:t.historyRegion,exact:true}),compare=panel.getByRole('region',{name:t.compareTitle,exact:true});
 await expect(compare).toContainText(t.delta+': +20');await expect(compare).toContainText(t.deltaCaveat);
 await compare.getByRole('combobox',{name:t.before,exact:true}).selectOption('two');await expect(compare).toContainText(t.sameChoice);
 await compare.getByRole('combobox',{name:t.after,exact:true}).selectOption('one');await expect(compare.getByRole('region',{name:t.diffRegion,exact:true})).toContainText('Python');
 await page.getByRole('button',{name:'Switch test locale'}).click();compare=page.getByRole('region',{name:versionsCopy[other].compareTitle,exact:true});await expect(compare.getByRole('combobox',{name:versionsCopy[other].before,exact:true})).toHaveValue('two');await expect(compare.getByRole('combobox',{name:versionsCopy[other].after,exact:true})).toHaveValue('one');
 await page.getByRole('button',{name:'Switch test locale'}).click();panel=page.getByRole('region',{name:t.historyRegion,exact:true});const newest=items(page,locale).first();
 await expect(newest.locator(':scope > summary')).toContainText(formatVersionCreated(two.created,locale).text);await expect(newest).toContainText('historical-source');
 await newest.getByText(t.metadata.title,{exact:true}).click();await expect(newest).toContainText(t.metadata.revision+': '+metadata.rules_revision);await newest.getByText(t.confirmedSnapshot,{exact:true}).click();await expect(newest).toContainText('SYNTHETIC источник');await expect(newest).toContainText(t.confirmed);
 const txt=page.waitForEvent('download');await newest.getByRole('button',{name:t.txt,exact:true}).click();expect(await readFile((await (await txt).path())!,'utf8')).toBe(two.text);
 const json=page.waitForEvent('download');await newest.getByRole('button',{name:t.json,exact:true}).click();expect(JSON.parse(await readFile((await (await json).path())!,'utf8'))).toEqual(two);
 await newest.getByRole('button',{name:t.copy,exact:true}).click();copied=await page.evaluate(()=>(window as unknown as {copied:string}).copied);expect(copied).toBe(two.text);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(locale==='en'){
  expect((await new AxeBuilder({page}).include('[aria-label="Saved resume versions"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await expect(newest.locator('pre').first()).toContainText('SYNTHETIC PROFILE');const png=await panel.screenshot({path:'test-results/versions-en-mobile.png'});console.log('JOBMATCH_SYNTHETIC_VERSIONS_PNG '+png.toString('base64'));
 }
 expect(JSON.stringify(state)).toBe(before);expect(reads).toBe(1);expect(writes).toBe(0);
});
test('legacy timestamps and absent metadata stay explicit without inventing an instant or current rules',async({page})=>{
 const legacy={...one,created:'2026-10-25T12:34:56',match_metadata:undefined,engine_version:undefined,profile_revision:undefined,evidence_snapshot:undefined};
 await page.route('**/api/service',route=>route.fulfill({json:{...state,versions:[legacy,two]}}));await page.goto(origin+'/en');await nav(page,'versions','en');const t=versionsCopy.en,compare=page.getByRole('region',{name:t.compareTitle,exact:true});await expect(compare).toContainText(t.incomparable);
 const oldest=items(page,'en').last();await oldest.locator(':scope > summary').click();await expect(oldest).toContainText(legacy.created+' ('+t.dates.unspecified+')');await expect(oldest).toContainText(t.metadata.legacy);await expect(oldest).toContainText(t.legacyRevision);await expect(oldest).toContainText(t.legacyEngine);
 await expect(compare.getByRole('combobox',{name:t.before,exact:true})).toContainText(legacy.created);await expect(compare.getByRole('combobox',{name:t.after,exact:true})).toContainText('21:30:00 UTC');
});
test('late restore keeps comparison choice, later navigation and source draft with one canonical write',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let writes=0;
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET')return route.fulfill({json:state});writes++;expect(route.request().postDataJSON()).toEqual({action:'restore',revision:1,id:'two',expectedOwnerId:ownerId});await held;return route.fulfill({json:{...state,revision:2,versions:[one,two,{...two,id:'restored',restored_from:'two'}]}});});
 await page.goto(origin+'/ru');await nav(page,'versions','ru');const selected=page.getByRole('combobox',{name:versionsCopy.ru.before,exact:true});await selected.selectOption('two');await items(page,'ru').first().getByRole('button',{name:versionsCopy.ru.restore,exact:true}).click();await expect.poll(()=>writes).toBe(1);
 await page.getByRole('button',{name:'Switch test locale'}).click();await expect(page.getByRole('combobox',{name:versionsCopy.en.before,exact:true})).toHaveValue('two');await expect(items(page,'en').first().getByRole('button',{name:versionsCopy.en.restoring,exact:true})).toBeDisabled();
 await nav(page,'profile','en');await page.getByRole('textbox',{name:'Review the imported text',exact:true}).fill('NEWER SYNTHETIC DRAFT 😀');release();await expect(page.getByRole('status')).toHaveText('Saved');await expect(page.getByRole('textbox',{name:'Review the imported text',exact:true})).toHaveValue('NEWER SYNTHETIC DRAFT 😀');await nav(page,'versions','en');await expect(items(page,'en')).toHaveCount(3);await expect(items(page,'en').first()).toContainText('Restored from version: two');expect(writes).toBe(1);
});
test('late DOCX status follows locale without request replay; explicit retry downloads the saved text',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let requests=0,downloads=0;page.on('download',()=>downloads++);
 await page.route('**/api/service',route=>route.fulfill({json:state}));await page.route('**/api/resume-export?*',async route=>{requests++;const url=new URL(route.request().url());expect(url.searchParams.get('id')).toBe('two');expect(url.searchParams.get('expectedOwnerId')).toBe(ownerId);if(requests===1){await held;return route.fulfill({status:429,json:{error:'PRIVATE_RAW'}});}return route.fulfill({body:Buffer.from(await resumeDocx(two.text)),contentType:MIME});});
 await page.goto(origin+'/ru');await nav(page,'versions','ru');await items(page,'ru').first().getByRole('button',{name:versionsCopy.ru.docx.download,exact:true}).click();await expect.poll(()=>requests).toBe(1);await page.getByRole('button',{name:'Switch test locale'}).click();release();await expect(page.getByRole('alert')).toHaveText(versionsCopy.en.docx.errors.rate);expect(downloads).toBe(0);expect(requests).toBe(1);await expect(page.locator('body')).not.toContainText('PRIVATE_RAW');
 const downloaded=page.waitForEvent('download');await items(page,'en').first().getByRole('button',{name:versionsCopy.en.docx.download,exact:true}).click();const file=await downloaded;expect((await mammoth.extractRawText({buffer:await readFile((await file.path())!)})).value).toBe(two.text.split('\n').join('\n\n')+'\n\n');expect(requests).toBe(2);expect(downloads).toBe(1);
});
test('DOCX request state is reset on owner/version change and old responses cannot download',async({page})=>{
 let releaseOne!:()=>void,releaseTwo!:()=>void;const first=new Promise<void>(resolve=>{releaseOne=resolve;}),second=new Promise<void>(resolve=>{releaseTwo=resolve;});let requests=0,downloads=0;page.on('download',()=>downloads++);
 await page.route('**/api/resume-export?*',async route=>{requests++;const n=requests,url=new URL(route.request().url());expect(url.searchParams.get('id')).toBe(n<3?'one':'two');expect(url.searchParams.get('expectedOwnerId')).toBe(n===1?ownerId:'22222222-2222-4222-8222-222222222222');if(n===1)await first;if(n===2)await second;await route.fulfill({body:Buffer.from(await resumeDocx('SYNTHETIC DOCX')),contentType:MIME}).catch(()=>{});});
 await page.goto(origin+'/download-en');await page.getByRole('button',{name:versionsCopy.en.docx.download,exact:true}).click();await expect.poll(()=>requests).toBe(1);await page.getByRole('button',{name:'Change test owner'}).click();await expect(page.getByRole('button',{name:versionsCopy.en.docx.download,exact:true})).toBeEnabled();releaseOne();await page.getByRole('button',{name:versionsCopy.en.docx.download,exact:true}).click();await expect.poll(()=>requests).toBe(2);await page.getByRole('button',{name:'Change test version'}).click();await expect(page.getByRole('button',{name:versionsCopy.en.docx.download,exact:true})).toBeEnabled();releaseTwo();expect(downloads).toBe(0);const done=page.waitForEvent('download');await page.getByRole('button',{name:versionsCopy.en.docx.download,exact:true}).click();await done;expect(requests).toBe(3);expect(downloads).toBe(1);
});
test('DOCX timeout feedback and missing owner stay semantic and never auto-retry',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let requests=0,downloads=0;page.on('download',()=>downloads++);
 await page.route('**/api/resume-export?*',async route=>{requests++;await held;await route.fulfill({body:Buffer.from(await resumeDocx('SYNTHETIC')),contentType:MIME}).catch(()=>{});});await page.goto(origin+'/download-en');await page.clock.install();await page.getByRole('button',{name:'Clear test owner'}).click();await page.getByRole('button',{name:versionsCopy.en.docx.download,exact:true}).click();await expect(page.getByRole('alert')).toHaveText(versionsCopy.en.docx.errors.owner);expect(requests).toBe(0);await page.getByRole('button',{name:'Set original owner'}).click();await page.getByRole('button',{name:versionsCopy.en.docx.download,exact:true}).click();await expect.poll(()=>requests).toBe(1);await page.clock.runFor(30001);await expect(page.getByRole('alert')).toHaveText(versionsCopy.en.docx.errors.timeout);await page.getByRole('button',{name:'Switch test locale'}).click();await expect(page.getByRole('alert')).toHaveText(versionsCopy.ru.docx.errors.timeout);release();expect(requests).toBe(1);expect(downloads).toBe(0);
});
for(const status of [404,413,200])test('English DOCX '+status+' failure is safe and leaves retry explicit',async({page})=>{
 let requests=0,downloads=0;page.on('download',()=>downloads++);await page.route('**/api/resume-export?*',route=>{requests++;return status===200?route.fulfill({status,contentType:MIME,body:Buffer.from('PRIVATE_RAW non-ZIP')}):route.fulfill({status,json:{error:'PRIVATE_RAW'}});});await page.goto(origin+'/download-en');await page.getByRole('button',{name:versionsCopy.en.docx.download,exact:true}).click();await expect(page.getByRole('alert')).toHaveText(status===404?versionsCopy.en.docx.errors.missing:status===413?versionsCopy.en.docx.errors.large:versionsCopy.en.docx.errors.invalid);await page.getByRole('button',{name:'Switch test locale'}).click();expect(requests).toBe(1);expect(downloads).toBe(0);await expect(page.locator('body')).not.toContainText('PRIVATE_RAW');
});
test('unexpected DOCX client exception is redacted instead of exposing its message',async({page})=>{
 await page.route('**/api/resume-export?*',async route=>route.fulfill({body:Buffer.from(await resumeDocx('SYNTHETIC')),contentType:MIME}));await page.goto(origin+'/download-en');await page.evaluate(()=>{URL.createObjectURL=()=>{throw new Error('PRIVATE_RAW runtime text');};});await page.getByRole('button',{name:versionsCopy.en.docx.download,exact:true}).click();await expect(page.getByRole('alert')).toHaveText(versionsCopy.en.docx.errors.failed);await expect(page.locator('body')).not.toContainText('PRIVATE_RAW');
});
