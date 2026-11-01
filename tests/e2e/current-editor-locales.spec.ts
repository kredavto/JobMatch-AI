import {test,expect,type Page,type Route} from '@playwright/test';
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


import {match,parseVacancy,propose,renderVersion,type Fact} from '../../lib/engine';
const ownerId='11111111-1111-4111-8111-111111111111';
const facts:Fact[]=[{id:'f1',text:'SQL',source:'Synthetic 🚀',verified:true},{id:'f2',text:'Excel',source:'Synthetic',verified:true},{id:'f3',text:'Не использую Python',source:'Synthetic',verified:true}];
const initial=()=>({ownerId,revision:7,original:'Literal 🚀\r\nSQL\r\nExcel\r\nНе использую Python',vacancy:'Обязательные требования:\nSQL\nPython\nЖелательно:\nExcel\nОпыт от 5 лет',goal:'Analyst',facts:facts.map(f=>({...f})),versions:[] as {id:string;created:string;text:string;vacancy:string;evidence_ids:string[];score:number}[],applications:[]});
type Saved=ReturnType<typeof initial>;
function result(s:Saved){const requirements=parseVacancy(s.vacancy);return {analysis:match(s.facts,requirements),edits:propose(s.facts,requirements)};}
async function setup(page:Page,handler?:(route:Route,body:Record<string,unknown>,state:Saved)=>Promise<void>){
 let state=initial(),reads=0;const actions:Record<string,unknown>[]=[];
 await page.route('**/api/service',async route=>{if(route.request().method()==='GET'){reads++;return route.fulfill({json:state});}const body=route.request().postDataJSON();actions.push(body);if(handler)return handler(route,body,state);if(body.action==='analyze')return route.fulfill({json:result(state)});if(body.action==='goal')state={...state,revision:state.revision+1,goal:body.text};if(body.action==='version'){const r=result(state);state={...state,revision:state.revision+1,versions:[...state.versions,{id:'v'+state.revision,created:'2026-11-01T12:00:00Z',text:renderVersion(state.original,r.edits.filter(e=>(body.ids as string[]).includes(e.id)),state.facts),vacancy:state.vacancy,evidence_ids:r.edits.filter(e=>(body.ids as string[]).includes(e.id)).flatMap(e=>e.evidence_ids),score:r.analysis.score}]};}await route.fulfill({json:state});});
 await page.goto(origin+'/tests/fixtures/workspace-locale.html');await expect(page.getByRole('navigation')).toBeVisible();return{actions,getState:()=>state,getReads:()=>reads};
}
async function nav(page:Page,tab:'profile'|'vacancy'|'editor'|'analytics',locale:'ru'|'en'='ru'){const names={profile:['Мой профиль','My profile'],vacancy:['Анализ вакансии','Vacancy analysis'],editor:['Редактор резюме','Resume editor'],analytics:['Аналитика','Analytics']};await page.getByRole('navigation').getByRole('button',{name:names[tab][locale==='ru'?0:1],exact:true}).click();}
async function analyze(page:Page){await nav(page,'vacancy');await page.getByRole('button',{name:'Проанализировать →',exact:true}).click();await expect(page.getByRole('table')).toBeVisible();}
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}

test('dirty master blocks current-editor version even after a forced click',async({page})=>{const s=await setup(page);await analyze(page);await page.getByRole('button',{name:'Принять все подтвержденные',exact:true}).click();await nav(page,'profile');await page.locator('#profile-resume').fill('Unsaved original 🚀');await nav(page,'editor');const save=page.getByRole('button',{name:'Подтверждаю · сохранить версию',exact:true});await expect(save).toBeDisabled();await save.evaluate((button:HTMLButtonElement)=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));expect(s.actions.filter(a=>a.action==='version')).toEqual([]);});
test('held analysis does not replace a newer tab choice after its reply',async({page})=>{let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});const s=await setup(page,async(route,body,state)=>{if(body.action==='analyze'){await held;return route.fulfill({json:result(state)});}return route.fulfill({json:state});});await nav(page,'vacancy');await page.getByRole('button',{name:'Проанализировать →',exact:true}).click();await expect.poll(()=>s.actions.length).toBe(1);await nav(page,'analytics');release();await expect(page.getByRole('button',{name:'Выйти',exact:true})).toBeEnabled();await expect(page.getByRole('heading',{level:1})).toHaveText('Аналитика');expect(s.actions.map(x=>x.action)).toEqual(['analyze']);});
