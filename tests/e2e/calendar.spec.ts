import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
test.use({timezoneId:'Europe/Moscow'});
test('calendar export uses device timezone without saving or sending an event',async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(10000);await page.setViewportSize({width:390,height:844});let writes=0;
 const state={revision:1,original:'PRIVATE RESUME',vacancy:'',goal:'',facts:[],versions:[],applications:[{id:'app1',title:'Демо компания',status:'Планируется',note:'PRIVATE TRACKER NOTE',created:'2026-10-01',events:[]}]};
 await page.route('**/api/service',r=>{if(r.request().method()!=='GET')writes++;return r.fulfill({json:state});});
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Отклики',exact:true}).click();const panel=page.getByRole('region',{name:'Напоминание по отклику'});
 await expect(panel.getByRole('button')).toBeDisabled();await panel.getByLabel('Отклик для напоминания').selectOption('app1');await panel.getByLabel('Дата и время в часовом поясе устройства').fill('2026-11-02T10:30');await panel.getByLabel('Описание события').fill('Вопросы\nATTENDEE:example');await expect(panel).toContainText('2026-11-02T07:30:00.000Z');
 const pending=page.waitForEvent('download');await panel.getByRole('button').click();const download=await pending;const text=await readFile((await download.path())!,'utf8');expect(text).toContain('DTSTART:20261102T073000Z');expect(text).toContain('DTEND:20261102T080000Z');expect(text).toContain('CLASS:PRIVATE');
 expect(text).not.toContain('PRIVATE RESUME');expect(text).not.toContain('PRIVATE TRACKER NOTE');expect(text).not.toContain('\r\nATTENDEE:');await expect(panel.getByRole('status')).toContainText('Событие пока не создано');expect(writes).toBe(0);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
