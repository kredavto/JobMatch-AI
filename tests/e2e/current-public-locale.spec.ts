import {test,expect} from '@playwright/test';
import {en} from '../../lib/i18n';
test.describe.configure({timeout:60000});
test('the server document honors an explicit canonical English UI preference',async({request})=>{
 const response=await request.get('/',{headers:{Cookie:'jobmatch-ui-locale=en'}}),html=await response.text();
 expect(response.ok()).toBe(true);expect(html).toMatch(/<html\b[^>]*\blang="en"/);expect(html).toContain(en.metadata.title);
});
test('the generic offline file honors the same explicit English preference',async({page,context,baseURL})=>{
 await context.addCookies([{name:'jobmatch-ui-locale',value:'en',url:baseURL||'http://127.0.0.1:3000',sameSite:'Lax'}]);await page.goto('/offline.html');
 await expect(page.getByRole('heading',{name:'No internet connection',exact:true})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang','en');
});
