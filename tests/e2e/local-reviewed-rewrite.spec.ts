import {expect,test,type Page} from '@playwright/test';
const create='Создать ИИ-черновик';
const use='Использовать выбранные формулировки';
const draft='Непроверенный черновик. Ничего не применено.';
const original='Команда создала 12 отчётов в 2024 году.';
const alternative='В 2024 году команда создала 12 отчётов.';

async function openDraft(page:Page){
 await page.goto('/');
 await page.getByLabel('Email JobMatch').fill('a@example.test');
 await page.getByLabel('Пароль JobMatch').fill('synthetic-only-password');
 await page.getByRole('button',{name:'Войти только для ИИ'}).click();
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Сохранить согласие для аккаунта'}).click();
 await page.getByRole('button',{name:create,exact:true}).click();
 await expect(page.getByText(draft,{exact:true})).toBeVisible();
}

test('review is opt-in; apply makes one status check and updates only the result',async({page})=>{
 await openDraft(page);
 const choice=page.getByRole('checkbox',{name:/Проверил/}),apply=page.getByRole('button',{name:use});
 const out=page.getByLabel('Тестовый результат'),letter=page.getByLabel('Тестовое письмо');
 const before=await letter.textContent();
 await expect(choice).not.toBeChecked();
 await expect(apply).toBeDisabled();
 await expect(out).toContainText(original);
 await choice.check();
 await apply.click();
 await expect(out).toContainText(alternative);
 await expect(page.getByText(draft,{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Тестовый исходник')).toHaveValue(new RegExp(original));
 expect(await letter.textContent()).toBe(before);
 const requests=await page.evaluate(()=>window.__pilotRequests);
 expect(requests).toHaveLength(1);
 expect(JSON.stringify(requests)).not.toContain('VACANCY_MARKER');
 await page.reload();await expect(out).toContainText(original);
});

test('rechecking a different account prevents apply',async({page})=>{
 await openDraft(page);
 await page.getByRole('checkbox',{name:/Проверил/}).check();
 await page.evaluate(()=>window.__pilotSwitch());
 await page.getByRole('button',{name:use}).click();
 await expect(page.getByText('Аккаунт или согласие изменились. Формулировки не применены.')).toBeVisible();
 await expect(page.getByLabel('Тестовый результат')).toContainText(original);
});

for(const stop of ['dismiss','vacancy'] as const){
 test('pending apply is ignored after '+stop,async({page})=>{
  await openDraft(page);
  await page.getByRole('checkbox',{name:/Проверил/}).check();
  await page.evaluate(()=>{window.__pilotHoldStatus=true;});
  await page.getByRole('button',{name:use}).click();
  await expect.poll(()=>page.evaluate(()=>window.__pilotStatusReleases.length)).toBe(1);
  if(stop==='dismiss')await page.getByRole('button',{name:'Отклонить все предложения'}).click();
  else await page.getByRole('button',{name:'Сменить тестовую вакансию'}).click();
  await page.evaluate(()=>{window.__pilotHoldStatus=false;window.__pilotStatusReleases.splice(0).forEach(release=>release());});
  await expect(page.getByText(draft,{exact:true})).toHaveCount(0);
  const out=page.getByLabel('Тестовый результат');
  await expect(out).toContainText(original);
  await expect(out).not.toContainText(alternative);
  if(stop==='vacancy')await expect(out).toContainText('Другая должность');
 });
}
