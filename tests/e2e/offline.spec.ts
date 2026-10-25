import {test,expect} from '@playwright/test';
test('offline shell has no profile data, preserves open draft and never queues writes',async({page,context})=>{
 const secret='PRIVATE_PROFILE_SENTINEL';let writes=0;
 await context.route('**/api/service',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({json:{revision:1,original:secret,facts:[],versions:[],applications:[],goal:'',vacancy:''},headers:{'Cache-Control':'no-store'}});});
 await page.goto('/');await page.getByRole('button',{name:'Мой профиль',exact:false}).click();await page.getByLabel('Проверьте текст после импорта').fill('Несохраненный текст');
 await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 const cache=await page.evaluate(async()=>{const entries=[];for(const name of await caches.keys()){const c=await caches.open(name);for(const req of await c.keys()){const r=await c.match(req);entries.push({url:new URL(req.url).pathname,body:await r!.text()});}}return entries;});
 expect(cache.map(e=>e.url).sort()).toEqual(['/icon-192.png','/icon-512.png','/icon.svg','/offline.html'].sort());expect(cache.some(e=>e.body.includes(secret))).toBe(false);
 await context.setOffline(true);await expect(page.getByRole('status')).toContainText('Нет подключения к сети');await expect(page.getByLabel('Проверьте текст после импорта')).toHaveValue('Несохраненный текст');
 const offline=await context.newPage();await offline.setViewportSize({width:390,height:844});await offline.goto('/');await expect(offline.getByRole('heading',{name:'Нет подключения к интернету'})).toBeVisible();expect(await offline.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(process.env.QA_SCREENSHOT)await offline.screenshot({path:'/tmp/jobmatch-offline.png',fullPage:true});expect(await offline.locator('body').innerText()).not.toContain(secret);
 const outcome=await offline.evaluate(async()=>{try{const r=await fetch('/api/fact-history',{cache:'no-store'});return await r.text();}catch{return 'network failure';}});expect(outcome).toBe('network failure');
 await context.setOffline(false);await expect(page.getByText('Нет подключения к сети.',{exact:false})).toHaveCount(0);await expect(page.getByLabel('Проверьте текст после импорта')).toHaveValue('Несохраненный текст');expect(writes).toBe(0);
 await offline.getByRole('link',{name:'Повторить подключение'}).click();await expect(offline.getByRole('heading',{name:'Следующий шаг в карьере'})).toBeVisible();expect(writes).toBe(0);
});
