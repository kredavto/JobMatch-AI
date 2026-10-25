import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
test('monthly cohorts use filters and export displayed aggregates on mobile',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);await page.setViewportSize({width:390,height:844});
 const app=(id:string,status:string,date:string)=>({id,title:id,status,note:'',created:date,events:[{status,date}]});
 const state={revision:1,original:'',vacancy:'',goal:'',facts:[],versions:[],applications:[app('sep','Оффер','2026-09-02'),app('oct','Просмотрено','2026-10-03'),app('plan','Планируется','2026-10-05')]};
 await page.route('**/api/service',r=>r.fulfill({json:state}));await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Аналитика',exact:true}).click();
 const panel=page.getByRole('region',{name:'Результаты по месяцам отправки',exact:true});await expect(panel.getByRole('row')).toHaveCount(3);
 await expect(panel.getByRole('row').nth(1)).toContainText('100% (1/1)');await expect(panel.getByRole('row').nth(2)).toContainText('0% (0/1)');
 await page.getByLabel('Начало периода (UTC)').fill('2026-10-01');await expect(panel.getByRole('row')).toHaveCount(2);await expect(panel).not.toContainText('2026-09');
 const pending=page.waitForEvent('download');await panel.getByRole('button',{name:'Скачать помесячную сводку CSV'}).click();const file=await pending;const csv=await readFile((await file.path())!,'utf8');expect(csv).toContain('"2026-10","1","1","0","0","0","0","0","0"');expect(csv).not.toContain('2026-09');
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.getByLabel('Начало периода (UTC)').fill('2026-11-01');await expect(panel.getByRole('status')).toHaveText('Нет отправленных откликов для помесячной сводки.');await expect(panel.getByRole('button')).toBeDisabled();
});
