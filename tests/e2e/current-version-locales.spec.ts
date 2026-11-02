import {test,expect,type Page} from '@playwright/test';
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
const initial=()=>({ownerId,revision:7,original:'CURRENT SQL',vacancy:'SQL',goal:'',facts:[],applications:[],versions:[
{id:'offset',created:'2026-10-26T00:30:00+03:00',text:'LITERAL OFFSET 🚀\r\nSQL',vacancy:'SQL',score:40,evidence_ids:[],opaque:'raw 🚀'},
{id:'date',created:'2026-10-25',text:'LITERAL DATE',vacancy:'SQL',score:50,evidence_ids:[]},
{id:'naive',created:'2026-10-25T10:30:00',text:'LITERAL NAIVE',vacancy:'Excel',score:70,evidence_ids:[]}
]});
type Saved=ReturnType<typeof initial>;
async function setup(page:Page,state:Saved=initial()){const actions:unknown[]=[];let reads=0;await page.route('**/api/service',async route=>{if(route.request().method()==='GET')reads++;else actions.push(route.request().postDataJSON());await route.fulfill({json:state});});await page.goto(origin+'/tests/fixtures/workspace-locale.html');await page.getByRole('navigation').getByRole('button',{name:'Мои версии',exact:true}).click();return{actions,getReads:()=>reads};}
function history(page:Page){return page.locator('section.card').filter({has:page.getByRole('heading',{name:'История резюме',exact:true})});}

test('saved history dates do not drift between device time zones',async({browser})=>{const labels:string[][]=[];for(const timezoneId of ['America/Los_Angeles','Pacific/Kiritimati']){const context=await browser.newContext({timezoneId});try{const page=await context.newPage();const s=await setup(page);labels.push(await history(page).locator(':scope > details > summary').allTextContents());expect(s.actions).toEqual([]);}finally{await context.close();}}expect(labels[0]).toEqual(labels[1]);expect(labels[0].join(' ')).toContain('UTC');});
test('legacy naive timestamp keeps its raw value and explicit missing-zone qualifier',async({page})=>{const s=await setup(page);const row=history(page).locator(':scope > details').filter({hasText:'LITERAL NAIVE'});await expect(row.locator(':scope > summary')).toContainText('2026-10-25T10:30:00');await expect(row.locator(':scope > summary')).toContainText('часовой пояс не сохранён');expect(s.actions).toEqual([]);});
