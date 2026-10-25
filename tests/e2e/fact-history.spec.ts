import {test,expect} from '@playwright/test';
test('history shows immutable evidence, older pages and snapshot download',async({page})=>{
 const workspace={revision:3,original:'Python',facts:[],goal:'',vacancy:'',versions:[],applications:[]};
 await page.route('**/api/service',r=>r.fulfill({json:workspace}));
 await page.route('**/api/fact-history*',r=>r.fulfill({json:r.request().url().includes('before=2')?{rows:[{id:1,workspace_revision:1,kind:'baseline',captured_at:'2026-10-25T00:00:00Z',facts:[]}],next:null}:{rows:[{id:2,workspace_revision:2,kind:'change',captured_at:'2026-10-25T00:00:00Z',facts:[{id:'old-fact',text:'SQL — исторический факт',verified:true,source:'Импорт'}]}],next:2}}));
 await page.goto('/');await page.getByRole('button',{name:'Мой профиль',exact:false}).click();await page.getByRole('button',{name:'Обновить историю фактов'}).click();await page.getByText(/Ревизия 2 ·/).click();await expect(page.getByText('SQL — исторический факт',{exact:false})).toBeVisible();await expect(page.getByLabel('Проверьте текст после импорта')).toHaveValue('Python');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать снимок JSON'}).click();expect((await download).suggestedFilename()).toBe('jobmatch-facts-2.json');
 await page.getByRole('button',{name:'Загрузить более ранние снимки'}).click();await expect(page.getByText(/Ревизия 1 ·/)).toContainText('Исходный снимок');await expect(page.getByRole('button',{name:'Загрузить более ранние снимки'})).toHaveCount(0);
});
