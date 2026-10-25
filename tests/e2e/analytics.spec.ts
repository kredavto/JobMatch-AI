import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
const event=(status:string,date:string)=>({status,date});
const workspace={revision:1,original:'SQL',vacancy:'SQL',goal:'',facts:[],versions:[{id:'v1',created:'2026-09-01',text:'SQL',vacancy:'SQL',evidence_ids:[],score:0}],applications:[
 {id:'a',title:'Текущий отклик',status:'Интервью',note:'',created:'2026-09-01',resumeVersionId:'v1',events:[event('Отклик отправлен','2026-10-10'),event('Интервью','2026-10-24')]},
 {id:'b',title:'Предыдущий отклик',status:'Просмотрено',note:'',created:'2026-09-01',events:[event('Просмотрено','2026-10-08')]},
 {id:'c',title:'План',status:'Планируется',note:'',created:'2026-10-10',events:[]}
]};
test('cohort comparison, version filtering and exported selection work on mobile',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/service',r=>r.fulfill({json:workspace}));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Аналитика',exact:true}).click();
 await page.getByLabel('Начало периода (UTC)').fill('2026-10-10');await page.getByLabel('Конец периода (UTC)').fill('2026-10-11');
 const comparison=page.getByRole('region',{name:'Сравнение с предыдущим периодом',exact:true});
 await expect(comparison.getByRole('row').nth(1)).toContainText('100% (1/1)');
 await expect(comparison.getByRole('row').nth(2)).toContainText('0% (0/1)');
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations).toEqual([]);
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт выборки CSV'}).click();
 const file=await downloading;const path=await file.path();expect(path).not.toBeNull();
 const csv=await readFile(path!,'utf8');expect(csv).toContain('Текущий отклик');expect(csv).not.toContain('Предыдущий отклик');expect(csv).toContain('v1');
 await page.screenshot({path:'/tmp/jobmatch-analytics-mobile.png',fullPage:true});
 await page.getByLabel('Версия резюме',{exact:true}).selectOption('unlinked');
 await expect(page.getByRole('status').filter({hasText:'По этим фильтрам'})).toHaveText('По этим фильтрам нет вакансий.');
 await page.getByLabel('Начало периода (UTC)').fill('2026-10-12');
 await expect(page.getByRole('alert').filter({hasText:'Начало периода'})).toHaveText('Начало периода не может быть позже окончания.');
 await expect(page.getByRole('button',{name:'Экспорт выборки CSV'})).toHaveCount(0);
 await page.getByRole('button',{name:'Сбросить фильтры'}).click();
 await expect(page.getByRole('region',{name:'Результаты по версиям',exact:true})).toContainText('Версия 1');
});
