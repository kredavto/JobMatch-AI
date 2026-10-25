import {assertDisposableAccounts} from '../live-accounts';
import {test,expect,type APIRequestContext} from '@playwright/test';
const email=process.env.TEST_EMAIL,password=process.env.TEST_PASSWORD,other=process.env.TEST_EMAIL_B;
test('live accounts isolate data, revoke sessions and delete their own profile',async({playwright})=>{
 test.setTimeout(900000);
 test.skip(!email||!password||!other,'Requires two disposable confirmed accounts; second account is deleted');
 assertDisposableAccounts([email!,other!]);
 const baseURL=process.env.BASE_URL||'http://127.0.0.1:3000';
 const contexts:APIRequestContext[]=[];
 async function login(address:string){const c=await playwright.request.newContext({baseURL,timeout:60000,extraHTTPHeaders:{Origin:baseURL}});contexts.push(c);const r=await c.post('/api/service',{data:{action:'login',email:address,password}});expect(r.status()).toBe(200);return c;}
 async function state(c:APIRequestContext){const r=await c.get('/api/service');expect(r.status()).toBe(200);return r.json();}
 try{
  const a=await login(email!),b=await login(other!);const sa=await state(a),sb=await state(b);expect(sa.ownerId).not.toBe(sb.ownerId);
  const markerA='SYNTHETIC OWNER A SQL',markerB='SYNTHETIC OWNER B Python';
  expect((await a.post('/api/service',{data:{action:'import',revision:sa.revision,expectedOwnerId:sa.ownerId,text:markerA}})).status()).toBe(200);
  expect((await b.post('/api/service',{data:{action:'import',revision:sb.revision,expectedOwnerId:sb.ownerId,text:markerB}})).status()).toBe(200);
  const currentB=await state(b);expect(currentB.original).toBe(markerB);
  expect((await b.post('/api/service',{data:{action:'import',revision:currentB.revision,expectedOwnerId:sa.ownerId,text:'FORGED'}})).status()).toBe(409);
  expect((await b.get('/api/fact-history',{headers:{'x-jobmatch-owner':sa.ownerId}})).status()).toBe(409);
  const history=await b.get('/api/fact-history',{headers:{'x-jobmatch-owner':sb.ownerId}});expect(history.status()).toBe(200);const content=await history.text();expect(content).toContain(markerB);expect(content).not.toContain(markerA);
  const exportB=await b.post('/api/service',{data:{action:'export',expectedOwnerId:sb.ownerId}});expect(exportB.status()).toBe(200);expect(await exportB.text()).not.toContain(markerA);
  const secondA=await login(email!);expect((await a.post('/api/service',{data:{action:'logout',expectedOwnerId:sa.ownerId}})).status()).toBe(200);
  expect((await secondA.get('/api/service')).status()).toBe(401);expect((await state(b)).original).toBe(markerB);
  expect((await b.post('/api/service',{data:{action:'delete',confirm:'УДАЛИТЬ',expectedOwnerId:sb.ownerId}})).status()).toBe(200);
  expect((await b.get('/api/service')).status()).toBe(401);
 }finally{await Promise.all(contexts.map(c=>c.dispose()));}
});
