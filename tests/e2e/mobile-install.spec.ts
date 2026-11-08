import {test,expect} from '@playwright/test';

test('Android install request needs an explicit tap; dismissal and appinstalled are honest',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 const action=page.getByRole('button',{name:'Создать ярлык приложения',exact:true});await expect(action).toBeVisible();
 await page.evaluate(()=>{
   const event=new Event('beforeinstallprompt',{cancelable:true});
   Object.assign(event,{prompt:async()=>{document.body.dataset.installRequests=String(Number(document.body.dataset.installRequests||0)+1);},userChoice:Promise.resolve({outcome:'dismissed'})});
   window.dispatchEvent(event);
 });
 expect(await page.locator('body').getAttribute('data-install-requests')).toBeNull();
 await action.click();await expect(page.locator('body')).toHaveAttribute('data-install-requests','1');await expect(page.locator('#install-instructions')).toContainText('Если системное окно не появилось');
 await action.click();await expect(page.locator('body')).toHaveAttribute('data-install-requests','1');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));await expect(page.getByLabel('Установка JobMatch',{exact:true})).toHaveCount(0);
});

test('iPhone gets Share instructions, while standalone does not show installation again',async({browser})=>{
 const context=await browser.newContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',viewport:{width:375,height:812}});
 const page=await context.newPage();await page.goto('/');await page.getByRole('button',{name:'Создать ярлык приложения',exact:true}).click();await expect(page.locator('#install-instructions')).toContainText('Поделиться → На экран Домой → Добавить');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true,configurable:true}));await page.reload();await expect(page.getByLabel('Установка JobMatch',{exact:true})).toHaveCount(0);await context.close();
});

test('public manifest, touch icon and standalone launch are configured',async({page,request})=>{
 const response=await request.get('/manifest.webmanifest');expect(response.ok()).toBe(true);const manifest=await response.json();expect(manifest).toMatchObject({id:'/',scope:'/',start_url:'/',display:'standalone',short_name:'JobMatch'});
 for(const icon of manifest.icons.filter((entry:{type:string})=>entry.type==='image/png')){const image=await request.get(icon.src);expect(image.ok()).toBe(true);const bytes=await image.body();expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);}
 await page.goto('/');await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href','/icon-192.png');await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content','yes');await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#176553');
});
