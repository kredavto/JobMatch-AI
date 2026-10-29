import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('confirmation request is explicit, opaque and limited on mobile',async({page})=>{
 let calls=0;await page.route('**/api/auth-email',route=>{calls++;expect(route.request().postDataJSON()).toEqual({email:'fixture@example.test'});return route.fulfill({json:{ok:true}});});
 await page.setViewportSize({width:390,height:844});await page.goto('/confirm-email');await page.getByLabel('Электронная почта').fill('fixture@example.test');expect(calls).toBe(0);
 await page.getByRole('button',{name:'Запросить письмо подтверждения'}).click();await expect(page.getByRole('status')).toContainText('Если аккаунт зарегистрирован');await expect(page.getByRole('button',{name:'Повторить можно через минуту'})).toBeDisabled();expect(calls).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
test('confirmation outage offers a safe manual retry without claiming delivery',async({page})=>{
 let calls=0;await page.route('**/api/auth-email',route=>{calls++;return calls===1?route.fulfill({status:503,json:{error:'smtp secret credential'}}):route.fulfill({json:{ok:true}});});
 await page.goto('/confirm-email');await page.getByLabel('Электронная почта').fill('fixture@example.test');await page.getByRole('button',{name:'Запросить письмо подтверждения'}).click();await expect(page.locator('main').getByRole('alert')).toContainText('администратору');await expect(page.locator('main').getByRole('alert')).not.toContainText('secret');await expect(page.getByRole('status')).toHaveCount(0);expect(calls).toBe(1);
 await page.getByRole('button',{name:'Запросить письмо подтверждения'}).click();await expect(page.getByRole('status')).toContainText('Если аккаунт');expect(calls).toBe(2);
});
test('rate limiting disables repeated requests for a minute and permits an explicit retry',async({page})=>{
 await page.clock.install();let calls=0;await page.route('**/api/auth-email',route=>{calls++;return route.fulfill({status:429,json:{error:'private'}});});await page.goto('/confirm-email');await page.getByLabel('Электронная почта').fill('fixture@example.test');await page.getByRole('button',{name:'Запросить письмо подтверждения'}).click();await expect(page.locator('main').getByRole('alert')).toContainText('Подождите минуту');await expect(page.getByRole('button',{name:'Повторить можно через минуту'})).toBeDisabled();expect(calls).toBe(1);
 await page.clock.fastForward(60000);await expect(page.getByRole('button',{name:'Запросить письмо подтверждения'})).toBeEnabled();expect(calls).toBe(1);
});
