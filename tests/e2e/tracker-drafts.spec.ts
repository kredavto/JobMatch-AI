import {test,expect} from '@playwright/test';
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
const initial={ownerId,revision:1,original:'SQL',vacancy:'SQL',goal:'',facts:[],versions:[],applications:[{id:'a',title:'SYNTHETIC application',status:'Планируется',note:'old',created:'2026-10-30T00:00:00Z',events:[]}]};
async function tracker(page:import('@playwright/test').Page){await page.goto(origin+'/ru');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();}
test('late add preserves a newer title and duplicate clicks send only one canonical command',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let writes=0;
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});writes++;expect(route.request().postDataJSON()).toEqual({action:'application',revision:1,title:'submitted',status:'Планируется',resumeVersionId:null,expectedOwnerId:ownerId});await held;return route.fulfill({json:{...initial,revision:2}});});
 await tracker(page);const title=page.getByLabel('Вакансия / компания',{exact:true});await title.fill('submitted');await page.getByRole('button',{name:'Добавить в трекер',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect.poll(()=>writes).toBe(1);await title.fill('NEWER SYNTHETIC title');release();await expect(page.getByRole('status').filter({hasText:'Сохранено'})).toBeVisible();await expect(title).toHaveValue('NEWER SYNTHETIC title');expect(writes).toBe(1);
});
test('note acknowledgement preserves newer typing and the next edit uses the new saved base',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let writes=0;
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});writes++;const body=route.request().postDataJSON();expect(body).toEqual({action:'application',revision:writes,id:'a',status:'Планируется',note:writes===1?'submitted':'newer',expectedOwnerId:ownerId});if(writes===1)await held;return route.fulfill({json:{...initial,revision:writes+1,applications:[{...initial.applications[0],note:body.note}]}});});
 await tracker(page);const note=page.getByLabel('Заметки',{exact:true});await note.fill('submitted');await page.getByRole('button',{name:'Сохранить заметку',exact:true}).click();await expect.poll(()=>writes).toBe(1);await note.fill('newer');release();await expect(page.getByRole('status').filter({hasText:'Сохранено'})).toBeVisible();await expect(note).toHaveValue('newer');await expect(page.getByText('Сохраненная заметка изменилась. Сравните тексты перед записью.',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Сохранить заметку',exact:true}).click();await expect(page.getByRole('button',{name:'Сохранить заметку',exact:true})).toHaveCount(0);await note.fill('third edit');await expect(page.getByText('Сохраненная заметка изменилась. Сравните тексты перед записью.',{exact:true})).toHaveCount(0);expect(writes).toBe(2);
});
test('failed or unexpected note acknowledgements never discard the local draft',async({page})=>{
 let writes=0;await page.route('**/api/service',route=>{if(route.request().method()==='GET')return route.fulfill({json:initial});writes++;if(writes===1)return route.fulfill({status:429,json:{code:'RATE_LIMITED',error:'ignored'}});return route.fulfill({json:{...initial,revision:2,applications:[{...initial.applications[0],note:'external saved note'}]}});});
 await tracker(page);await page.getByLabel('Заметки',{exact:true}).fill('local draft');await page.getByRole('button',{name:'Сохранить заметку',exact:true}).click();await expect(page.getByLabel('Заметки',{exact:true})).toHaveValue('local draft');await expect(page.getByRole('alert').first()).toBeVisible();await page.getByRole('button',{name:'Сохранить заметку',exact:true}).click();await expect(page.getByText('Сохраненная заметка изменилась. Сравните тексты перед записью.',{exact:true})).toBeVisible();await expect(page.getByLabel('Заметки',{exact:true})).toHaveValue('local draft');expect(writes).toBe(2);
});
