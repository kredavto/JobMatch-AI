import {test,expect,type Page,type Route} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {ordinaryState,ordinaryResult,ordinaryIds} from '../fixtures/ordinary-version';
import {parseVacancy,match,propose} from '../../lib/engine';
import {editorCopy} from '../../lib/i18n/editor';
import {versionsCopy} from '../../lib/i18n/versions';
import {languageCopy} from '../../lib/i18n/preference';
import {ru,en} from '../../lib/i18n';
test.describe.configure({timeout:45000});
const EN='ordinary-literal-en-v1';
const analysis=()=>{const s=ordinaryState(),requirements=parseVacancy(s.vacancy);return {analysis:match(s.facts,requirements),edits:propose(s.facts,requirements)};};
async function open(page:Page,write:(route:Route)=>Promise<unknown>|unknown,state=ordinaryState()){
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/service',route=>route.request().method()==='GET'?route.fulfill({json:state}):route.request().postDataJSON().action==='analyze'?route.fulfill({json:analysis()}):write(route));
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:ru.navigation.vacancy,exact:true}).click();
 await page.getByRole('button',{name:'Проанализировать →',exact:true}).click();
 return page.getByRole('region',{name:editorCopy.ru.region,exact:true});
}
async function choose(page:Page){const panel=page.getByRole('region',{name:editorCopy.ru.region,exact:true});await panel.getByRole('button',{name:editorCopy.ru.acceptAll,exact:true}).click();await panel.getByLabel(editorCopy.ru.templateLanguage,{exact:true}).selectOption(EN);return panel;}
test('explicit English headings keep source words and history literal across UI locale, JSON/TXT exports and mobile a11y',async({page})=>{
 let writes=0;const expected=ordinaryResult();
 let panel=await open(page,route=>{writes++;expect(route.request().postDataJSON()).toEqual({action:'version',revision:7,ids:ordinaryIds,templateVersion:EN,expectedOwnerId:ordinaryState().ownerId});return route.fulfill({json:expected});});
 await expect(panel.getByLabel(editorCopy.ru.templateLanguage,{exact:true})).toHaveValue('ordinary-literal-v1');panel=await choose(page);
 await expect(panel.locator('.compare pre').last()).toContainText('RELEVANT EXPERIENCE\nSQL\nPython\n\nPROFILE\nSYNTHETIC 😀\nRésumé — 42%');
 await page.getByLabel(languageCopy.ru.label,{exact:true}).selectOption('en');panel=page.getByRole('region',{name:editorCopy.en.region,exact:true});await expect(panel.getByLabel(editorCopy.en.templateLanguage,{exact:true})).toHaveValue(EN);await expect(panel.getByRole('checkbox').first()).toBeChecked();expect(writes).toBe(0);
 await panel.getByRole('button',{name:editorCopy.en.save,exact:true}).click();await expect(page.getByRole('heading',{name:versionsCopy.en.historyTitle,exact:true})).toBeVisible();expect(writes).toBe(1);
 await expect(page.getByText(versionsCopy.en.unrecordedTemplate,{exact:true})).toHaveCount(1);await expect(page.getByText(versionsCopy.en.recordedTemplate+': '+EN,{exact:true})).toHaveCount(1);
 const jsonPending=page.waitForEvent('download');await page.getByRole('button',{name:versionsCopy.en.json,exact:true}).first().click();expect(JSON.parse(await readFile((await (await jsonPending).path())!,'utf8'))).toEqual(expected.versions.at(-1));
 const txtPending=page.waitForEvent('download');await page.getByRole('button',{name:versionsCopy.en.txt,exact:true}).first().click();expect(await readFile((await (await txtPending).path())!,'utf8')).toBe(expected.versions.at(-1)!.text);
 expect((await new AxeBuilder({page}).include('#main-content').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const jpeg=await page.screenshot({type:'jpeg',quality:75,fullPage:true,path:'test-results/ordinary-english-mobile.jpg'});console.log('JOBMATCH_SYNTHETIC_ORDINARY_ENGLISH_JPEG '+jpeg.toString('base64'));
});
test('pending English save preserves a later source draft and navigation without replay after UI locale change',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let writes=0;
 await open(page,async route=>{writes++;expect(route.request().postDataJSON().templateVersion).toBe(EN);await held;return route.fulfill({json:ordinaryResult()});});let panel=await choose(page);
 await panel.getByRole('button',{name:editorCopy.ru.save,exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect.poll(()=>writes).toBe(1);
 await expect(panel.getByLabel(editorCopy.ru.templateLanguage,{exact:true})).toBeDisabled();await page.getByLabel(languageCopy.ru.label,{exact:true}).selectOption('en');
 panel=page.getByRole('region',{name:editorCopy.en.region,exact:true});await expect(panel.getByLabel(editorCopy.en.templateLanguage,{exact:true})).toHaveValue(EN);
 await page.getByRole('navigation').getByRole('button',{name:en.navigation.vacancy,exact:true}).click();await page.getByLabel('Vacancy text',{exact:true}).fill('SYNTHETIC NEWER DRAFT');
 release();await expect(page.getByLabel('Vacancy text',{exact:true})).toHaveValue('SYNTHETIC NEWER DRAFT');await expect(page.getByRole('status')).toHaveText('Saved');
 await page.getByRole('navigation').getByRole('button',{name:en.navigation.versions,exact:true}).click();await expect(page.getByText(versionsCopy.en.recordedTemplate+': '+EN,{exact:true})).toBeVisible();expect(writes).toBe(1);
});
for(const failure of ['forged','lost'] as const)test(failure+' English acknowledgement never installs a false saved history or retries automatically',async({page})=>{
 let writes=0;await open(page,route=>{writes++;if(failure==='lost')return route.fulfill({status:503,json:{error:'synthetic lost reply'}});const wrong=ordinaryResult();wrong.versions.at(-1)!.template_version='ordinary-literal-v1';wrong.versions.at(-1)!.text='PRIVATE FORGED TEXT';return route.fulfill({json:wrong});});
 const panel=await choose(page);await panel.getByRole('button',{name:editorCopy.ru.save,exact:true}).click();await expect(panel.getByRole('button',{name:editorCopy.ru.save,exact:true})).toBeDisabled();await expect(page.locator('body')).not.toContainText('PRIVATE FORGED TEXT');
 await page.getByLabel(languageCopy.ru.label,{exact:true}).selectOption('en');await expect(page.getByRole('button',{name:editorCopy.en.save,exact:true})).toBeDisabled();expect(writes).toBe(1);
 await page.getByRole('navigation').getByRole('button',{name:en.navigation.versions,exact:true}).click();await expect(page.getByText(versionsCopy.en.recordedTemplate+': '+EN,{exact:true})).toHaveCount(0);await expect(page.getByText(versionsCopy.en.unrecordedTemplate,{exact:true})).toHaveCount(1);
});
