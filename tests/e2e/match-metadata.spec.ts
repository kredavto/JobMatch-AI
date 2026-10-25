import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {matchMetadata,RULES_REVISION} from '../../lib/match-config';
test('history distinguishes saved rules from legacy scores and exports metadata',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);await page.setViewportSize({width:390,height:844});
 const base={created:'2026-10-25T00:00:00Z',text:'SQL',vacancy:'SQL',score:100,evidence_ids:[],engine_version:'rules-v1'};
 const meta=matchMetadata([{status:'matched'}]);
 const state={revision:1,original:'Python',vacancy:'Python',goal:'',facts:[],applications:[],versions:[{...base,id:'old'},{...base,id:'new',match_metadata:meta}]};
 await page.route('**/api/service',r=>r.fulfill({json:state}));await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мои версии',exact:true}).click();
 await page.getByText('Сохраненные правила и сводка оценки',{exact:true}).click();await expect(page.getByText('Редакция правил: '+RULES_REVISION,{exact:true})).toBeVisible();await expect(page.getByText(/Требований: 1. Соответствует: 1/)).toBeVisible();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать JSON + evidence'}).first().click();const file=await pending;const data=JSON.parse(await readFile((await file.path())!,'utf8'));expect(data.match_metadata).toEqual(meta);expect(data.score).toBe(100);expect(data.vacancy).toBe('SQL');
 await page.locator('summary').filter({hasText:'Версия 1 ·'}).click();await expect(page.getByText(/Редакция правил и сводка расчета не сохранены/)).toBeVisible();
});
