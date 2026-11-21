import {expect,test,type Page} from '@playwright/test';
const launch='Создать ИИ-черновик',grant='Сохранить согласие для аккаунта',review='Непроверенный черновик. Ничего не применено.';
async function login(page:Page,email='a@example.test'){await page.getByLabel('Email JobMatch').fill(email);await page.getByLabel('Пароль JobMatch').fill('synthetic-only-password');await page.getByRole('button',{name:'Войти только для ИИ'}).click();await expect(page.getByRole('button',{name:launch,exact:true})).toBeVisible();}
async function optin(page:Page){await page.getByRole('checkbox').check();await page.getByRole('button',{name:grant}).click();await expect(page.getByRole('button',{name:launch,exact:true})).toBeEnabled();}
test('account consent survives reload; two explicit calls; revoke; no automatic persistence or vacancy',async({page})=>{
 const diagnostics:string[]=[];page.on('console',m=>diagnostics.push(m.text()));page.on('pageerror',e=>diagnostics.push(e.message));
 await page.goto('/');await login(page);await expect(page.getByRole('checkbox')).not.toBeChecked();await expect(page.getByRole('button',{name:launch,exact:true})).toBeDisabled();await optin(page);expect(await page.evaluate(()=>window.__pilotRequests)).toEqual([]);
 await page.reload();await expect(page.getByRole('button',{name:launch,exact:true})).toBeEnabled();expect(await page.evaluate(()=>window.__pilotRequests)).toEqual([]);
 for(let i=0;i<2;i++){await page.getByRole('button',{name:launch,exact:true}).click();await expect(page.getByText(review,{exact:true})).toBeVisible();}
 const requests=await page.evaluate(()=>window.__pilotRequests);expect(requests).toHaveLength(2);expect(requests[0].requestId).not.toBe(requests[1].requestId);expect(requests[0].consentId).toBe(requests[1].consentId);expect(JSON.stringify(requests)).not.toContain('VACANCY_MARKER');
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain('отчётов');
 await page.reload();await expect(page.getByText(review,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Отозвать согласие аккаунта'}).click();await expect(page.getByRole('button',{name:launch,exact:true})).toBeDisabled();await page.reload();await expect(page.getByRole('checkbox')).not.toBeChecked();expect(await page.evaluate(()=>window.__pilotRequests)).toEqual([]);
 expect(diagnostics.join('\n')).not.toContain('Команда создала');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('logout and another account do not inherit consent; fallback preserves local result',async({page})=>{
 await page.goto('/');await login(page);await optin(page);await page.getByRole('button',{name:'Выйти из ИИ-аккаунта'}).click();await login(page,'b@example.test');await expect(page.getByRole('checkbox')).not.toBeChecked();await expect(page.getByRole('button',{name:launch,exact:true})).toBeDisabled();expect(await page.evaluate(()=>window.__pilotRequests)).toEqual([]);
 await optin(page);await page.evaluate(()=>{window.__pilotFail=true;});await page.getByRole('button',{name:launch,exact:true}).click();await expect(page.getByText('Черновик недоступен. Локальная адаптация и исходник не изменены.',{exact:true})).toBeVisible();await expect(page.getByText('Локальный результат сохранён.',{exact:true})).toBeVisible();await expect(page.getByText(review,{exact:true})).toHaveCount(0);
});
test('late results rejected after account switch, revoke, logout and source edit',async({page})=>{
 for(const action of ['switch','revoke','logout','edit']){
  await page.goto('/');await page.evaluate(()=>sessionStorage.clear());await page.reload();await login(page);await optin(page);await page.evaluate(()=>{window.__pilotDelay=true;});await page.getByRole('button',{name:launch,exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.__pilotRequests.length)).toBe(1);
  if(action==='switch')await page.evaluate(()=>window.__pilotSwitch());
  if(action==='revoke')await page.getByRole('button',{name:'Отозвать согласие аккаунта'}).click();
  if(action==='logout')await page.getByRole('button',{name:'Выйти из ИИ-аккаунта'}).click();
  if(action==='edit')await page.getByLabel('Тестовый исходник').fill('Другой синтетический профессиональный текст.');
  await page.evaluate(()=>window.__pilotRelease?.());await expect(page.getByText(review,{exact:true})).toHaveCount(0);
  if(action==='switch')await expect(page.getByText('Аккаунт или согласие изменились. Черновик не показан.',{exact:true})).toBeVisible();
 }
});

async function returnFocus(page:Page){
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
}
test('focus hides an unverified draft and restores it after verifying the same account and consent',async({page})=>{
 await page.goto('/');await login(page);await optin(page);
 await page.getByRole('button',{name:launch,exact:true}).click();
 await expect(page.getByText(review,{exact:true})).toBeVisible();
 await page.evaluate(()=>{window.__pilotHoldStatus=true;});await returnFocus(page);
 await expect.poll(()=>page.evaluate(()=>window.__pilotStatusReleases.length)).toBe(1);
 await expect(page.getByText(review,{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:launch,exact:true})).toBeDisabled();
 await page.evaluate(()=>{window.__pilotHoldStatus=false;window.__pilotStatusReleases[0]();});
 await expect(page.getByText(review,{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__pilotRequests.length)).toBe(1);
});

test('unchanged focus preserves in-flight rewrite; failed status closes the draft without retry',async({page})=>{
 await page.goto('/');await login(page);await optin(page);
 await page.evaluate(()=>{window.__pilotDelay=true;});
 await page.getByRole('button',{name:launch,exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!window.__pilotRelease)).toBe(true);
 await page.evaluate(()=>{window.__pilotHoldStatus=true;});await returnFocus(page);
 await expect.poll(()=>page.evaluate(()=>window.__pilotStatusReleases.length)).toBe(1);
 await page.evaluate(()=>{window.__pilotHoldStatus=false;window.__pilotStatusReleases[0]();window.__pilotRelease?.();});
 await expect(page.getByText(review,{exact:true})).toBeVisible();
 await page.evaluate(()=>{window.__pilotFailStatus=true;});await returnFocus(page);
 await expect(page.getByText(review,{exact:true})).toHaveCount(0);
 await expect(page.getByText('Не удалось подтвердить доступ к ИИ. Локальная адаптация остаётся доступна.')).toBeVisible();
 expect(await page.evaluate(()=>window.__pilotRequests.length)).toBe(1);
});

test('revocation on return drops the draft and an out-of-order older check cannot restore it',async({page})=>{
 await page.goto('/');await login(page);await optin(page);
 await page.getByRole('button',{name:launch,exact:true}).click();
 await expect(page.getByText(review,{exact:true})).toBeVisible();
 await page.evaluate(()=>{window.__pilotHoldStatus=true;});await returnFocus(page);
 await expect.poll(()=>page.evaluate(()=>window.__pilotStatusReleases.length)).toBe(1);
 await page.evaluate(()=>window.__pilotRevoke());await returnFocus(page);
 await expect.poll(()=>page.evaluate(()=>window.__pilotStatusReleases.length)).toBe(2);
 await page.evaluate(()=>{window.__pilotHoldStatus=false;window.__pilotStatusReleases[1]();});
 await expect(page.getByText('Аккаунт или согласие изменились. Черновик не показан.')).toBeVisible();
 await page.evaluate(()=>window.__pilotStatusReleases[0]());
 await expect(page.getByText(review,{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:launch,exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>window.__pilotRequests.length)).toBe(1);
});
