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

import type {Route} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {match,parseVacancy,propose} from '../../lib/engine';
import {issueLetterReceipt} from '../../lib/saved-letter-signing';
import {decodeLetterReceipt,letterPayloadSha256,type LetterReceipt,type SavedLetterVersion} from '../../lib/saved-letter';
const owner='11111111-1111-4111-8111-111111111111';
async function language(page:Page,locale:'ru'|'en'){await page.getByLabel('Fixture language',{exact:true}).selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);}
const other='22222222-2222-4222-8222-222222222222';
const base={ownerId:owner,revision:3,original:'SQL saved 42%.\nPRIVATE ORIGINAL ADDRESS',vacancy:'SQL',goal:'PRIVATE GOAL',facts:[{id:'f1',text:'SQL saved 42%.',source:'Synthetic',verified:true},{id:'private',text:'PRIVATE ADDRESS',source:'PRIVATE SOURCE',verified:false}],versions:[],applications:[]};
const key=Buffer.from('ab'.repeat(32),'hex'),config={key,keyId:createHash('sha256').update(key).digest('hex')};
const consent='Разрешаю передать приложению выбранные источники и вакансию и хранить их с письмом после моего отдельного принятия',final='Я принимаю именно показанную серверную версию письма';
async function row(receipt:LetterReceipt):Promise<SavedLetterVersion>{const p=decodeLetterReceipt(receipt);return{format:'jobmatch-saved-letter-version-v1',ownerId:owner,id:p.id,version:p.source.letterRevision+1,created:new Date().toISOString(),receipt,payloadSha256:await letterPayloadSha256(receipt.payload),issuer:'server-key-holder',sourceVerification:'current-at-acceptance',receiptSignature:'verified-at-acceptance',contentReview:'reported-user-review',semanticAssessment:'not-performed',modelVersion:null};}
function history(records:SavedLetterVersion[]){return{format:'jobmatch-saved-letters-state-v1',ownerId:owner,revision:records.length,items:[...records].reverse().map(r=>{const p=decodeLetterReceipt(r.receipt);return{id:r.id,version:r.version,created:r.created,workspaceRevision:p.source.workspaceRevision,templateVersion:p.snapshot.templateVersion,style:p.snapshot.style,edited:p.snapshot.review.edited,payloadSha256:r.payloadSha256};})};}
async function setupActions(page:Page,options:{previewStatus?:number;previewMutation?:(value:Record<string,unknown>)=>void;holdPreview?:boolean;holdAccept?:boolean;lostAccept?:boolean;invalidAck?:boolean;invalidHistory?:boolean;wrongRow?:boolean;lostNoCommit?:boolean;cap?:boolean}={}){
 let workspace=structuredClone(base);const records:SavedLetterVersion[]=[],posts:Record<string,unknown>[]=[],gets:string[]=[];let heldPreview:Route|undefined,heldAccept:Route|undefined,previewValue:Record<string,unknown>|undefined;
 await page.route('**/api/service',async r=>{if(r.request().method()==='GET')return r.fulfill({json:workspace});const b=r.request().postDataJSON();if(b.action==='analyze'){const req=parseVacancy(workspace.vacancy);return r.fulfill({json:{analysis:match(workspace.facts,req),edits:propose(workspace.facts,req)}});}if(b.action==='logout')return r.fulfill({json:{ok:true}});throw Error('Unexpected workspace write');});
 await page.route('**/api/letter-versions*',async r=>{
  expect(r.request().headers()['x-jobmatch-owner']).toBe(owner);const url=new URL(r.request().url());
  if(r.request().method()==='GET'){gets.push(url.search);if(options.cap)return r.fulfill({json:{format:'jobmatch-saved-letters-state-v1',ownerId:owner,revision:50,items:Array.from({length:50},(_,i)=>({id:'aaaaaaaa-aaaa-4aaa-8aaa-'+String(i).padStart(12,'0'),version:50-i,created:new Date().toISOString(),workspaceRevision:3,templateVersion:'main-ru-letter-81cb1a6-v1',style:'professional',edited:false,payloadSha256:'0'.repeat(64)}))}});if(options.invalidHistory)return r.fulfill({json:{...history(records),ownerId:other}});if(url.searchParams.has('id')){const found=records.find(x=>x.id===url.searchParams.get('id'));return r.fulfill({json:options.wrongRow?{...found,payloadSha256:'0'.repeat(64)}:found});}return r.fulfill({json:history(records)});}
  const body=r.request().postDataJSON();posts.push(body);expect(body.expectedOwnerId).toBe(owner);expect(body.consentToStore).toBe(true);
  if(body.action==='preview'){
   expect(JSON.stringify(body)).not.toContain('PRIVATE');if(options.previewStatus)return r.fulfill({status:options.previewStatus,json:{error:'PRIVATE UPSTREAM DIAGNOSTIC'}});
   const receipt=issueLetterReceipt(owner,workspace,body.letterRevision,body.snapshotJson,config);previewValue={format:'jobmatch-letter-preview-v1',ownerId:owner,workspaceRevision:workspace.revision,letterRevision:records.length,receipt,semanticAssessment:'not-performed',modelVersion:null};options.previewMutation?.(previewValue);if(options.holdPreview){heldPreview=r;return;}return r.fulfill({json:previewValue});
  }
  expect(body.action).toBe('accept');expect(body.accept).toBe('SAVE_REVIEWED_LETTER_VERSION');expect(body.letterRevision).toBe(records.length);if(options.lostNoCommit)return r.abort('failed');records.push(await row(body.receipt));if(options.holdAccept){heldAccept=r;return;}if(options.lostAccept)return r.abort('failed');return r.fulfill({json:{state:history(records),record:options.invalidAck?{...records.at(-1),ownerId:other}:records.at(-1)}});
 });
 await page.goto(origin+'/tests/fixtures/workspace-locale.html');return{records,posts,gets,setWorkspace:(next:typeof base)=>{workspace=next;},releasePreview:async()=>{expect(heldPreview).toBeTruthy();await heldPreview!.fulfill({json:previewValue}).catch(()=>{});},releaseAccept:async()=>{expect(heldAccept).toBeTruthy();await heldAccept!.fulfill({json:{state:history(records),record:records.at(-1)}}).catch(()=>{});}};
}
async function draft(page:Page){const nav=page.getByRole('navigation');await nav.getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('button',{name:'Проанализировать →',exact:true}).click();const local=page.getByRole('region',{name:'Сопроводительное письмо',exact:true});await local.getByRole('checkbox',{name:/SQL saved/}).check();await local.getByRole('button',{name:'Подготовить черновик письма',exact:true}).click();await local.getByRole('checkbox',{name:'Я проверил письмо, факты и формулировки о своих намерениях',exact:true}).check();return {local,panel:local.locator('#saved-letters'),text:local.getByLabel('Текст сопроводительного письма')};}
async function preview(page:Page){const d=await draft(page);await d.panel.getByRole('button',{name:'Прочитать историю писем',exact:true}).click();await d.panel.getByRole('checkbox',{name:consent,exact:true}).check();await d.panel.getByRole('button',{name:'Получить серверный предпросмотр письма',exact:true}).click();return d;}
async function confirm(panel:ReturnType<Page['getByRole']>){await panel.getByRole('checkbox',{name:final,exact:true}).check();return panel.getByRole('button',{name:'Подтверждаю · сохранить серверное письмо',exact:true});}

test('current composer follows optional English UI without regenerating the Russian document',async({page})=>{
 const s=await setupActions(page),d=await draft(page),before=await d.text.inputValue();await language(page,'en');await expect(page.getByRole('heading',{name:'Cover letter',exact:true})).toBeVisible();await expect(page.getByLabel('Cover letter text',{exact:true})).toHaveValue(before);await expect(page.getByText('Document template: Russian v1. Interface language does not translate the letter.',{exact:true})).toBeVisible();expect(s.posts).toHaveLength(0);
});
test('bounded lexical review headings follow current UI while exact Unicode quotes stay literal',async({page})=>{
 const s=await setupActions(page),d=await draft(page),before=await d.text.inputValue();await d.text.fill(before+'\nNo 🧑‍💻 SQL 43%.');await language(page,'en');await expect(page.getByRole('heading',{name:'Review letter edits',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Numeric expression added',exact:true})).toBeVisible();await expect(page.locator('q').filter({hasText:'43%'})).toHaveText('43%');expect(s.posts).toHaveLength(0);
});
