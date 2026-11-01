import {test,expect,type Page} from '@playwright/test';
import {sourceOwner,sourceVersionProfile,sourcePreviewFor,sourceVersionFor,sourceVersionListFor} from '../source-version-fixture';
import {sourceCollectionHash} from '../../lib/source-version';
async function setup(page:Page,available=true){
 const profile=sourceVersionProfile(),preview=await sourcePreviewFor(profile),record=await sourceVersionFor(),populated=await sourceVersionListFor(record),data={...populated,versions:[]},empty={...data,collection_hash:await sourceCollectionHash(data)};
 let history:typeof populated=empty;const writes:Record<string,unknown>[]=[],workspaceWrites:unknown[]=[];
 const workspace={ownerId:sourceOwner,revision:4,original:profile.source_original,goal:'Analyst',vacancy:'SQL role',facts:[{id:'f1',text:'SQL',source:'original',verified:false}],versions:[],applications:[]};
 await page.route('**/api/service',r=>{if(r.request().method()==='POST')workspaceWrites.push(r.request().postDataJSON());return r.fulfill({json:workspace});});
 await page.route('**/api/source-profile',r=>r.fulfill({json:{profile,storageAvailable:true}}));
 await page.route('**/api/source-versions*',async r=>{
  expect(r.request().headers()['x-jobmatch-owner']).toBe(sourceOwner);
  if(r.request().method()==='GET')return r.fulfill({json:r.request().url().includes('?id=')?record:{history,storageAvailable:available}});
  const intent=r.request().postDataJSON();writes.push(intent);
  if(intent.action==='preview')return r.fulfill({json:preview});
  if(intent.action==='save'){history=populated;return r.fulfill({json:record});}
  if(intent.action==='clear'){history=empty;return r.fulfill({json:empty});}
  throw Error('Unexpected intent');
 });
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Мой профиль',exact:true}).click();
 return {panel:page.getByRole('region',{name:'Дословные структурированные версии',exact:true}),writes,workspaceWrites,profile,record};
}
test('explicit history/read/select/preview/consent/save/read/clear never verifies master facts',async({page})=>{
 const s=await setup(page),p=s.panel;await p.getByRole('button',{name:'Прочитать историю структурированных версий',exact:true}).click();await p.getByRole('button',{name:'Прочитать структуру для версии',exact:true}).click();
 await p.getByRole('checkbox',{name:'Использовать запись 1: Работа',exact:true}).check();await p.getByRole('button',{name:'Получить дословный предпросмотр',exact:true}).click();
 await expect(p.getByRole('article',{name:'Предпросмотр структурированной версии'})).toContainText('Название: SQL');const save=p.getByRole('button',{name:'Сохранить показанную структурированную версию',exact:true});await expect(save).toBeDisabled();
 await p.getByRole('checkbox',{name:/Я проверил\(а\) показанные текст и диапазоны/}).check();await save.click();await expect(p.getByRole('article',{name:'Сохранённая структурированная версия',exact:true})).toContainText('Исторический снимок');
 expect(s.writes.map(x=>x.action)).toEqual(['preview','save']);expect(s.writes[1]).toMatchObject({consentToStore:true,accept:'SAVE_LITERAL_SOURCE_VERSION',workspaceRevision:4,profileRevision:2,entryIds:[s.profile.entries[0].id]});expect(s.workspaceWrites).toEqual([]);await expect(page.locator('label.fact').getByRole('checkbox')).not.toBeChecked();
 const file=page.waitForEvent('download');await p.getByRole('button',{name:'Скачать структурированную версию TXT',exact:true}).click();expect((await file).suggestedFilename()).toBe('jobmatch-source-version-'+s.record.id+'.txt');
 await p.getByRole('button',{name:'Прочитать историю структурированных версий',exact:true}).click();await p.getByRole('button',{name:'Открыть структурированную версию 1',exact:true}).click();await expect(p.getByRole('article',{name:'Сохранённая структурированная версия',exact:true})).toHaveCount(1);await p.getByText('Удаление истории структурированных версий',{exact:true}).click();await p.getByRole('checkbox',{name:'Разрешаю удалить всю прочитанную историю структурированных версий',exact:true}).check();await p.getByRole('button',{name:'Удалить сохранённые структурированные версии',exact:true}).click();
 await expect(p).toContainText('В прочитанной истории: 0/20');await expect(p.getByRole('article',{name:'Сохранённая структурированная версия',exact:true})).toHaveCount(0);expect(s.writes.at(-1)).toMatchObject({action:'clear',accept:'DELETE_LITERAL_SOURCE_VERSIONS'});expect(s.workspaceWrites).toEqual([]);
});
test('preview/consent does not revive after selection or dirty-master boundary',async({page})=>{
 const {panel:p,writes}=await setup(page);await p.getByRole('button',{name:'Прочитать историю структурированных версий',exact:true}).click();await p.getByRole('button',{name:'Прочитать структуру для версии',exact:true}).click();const selected=p.getByRole('checkbox',{name:'Использовать запись 1: Работа',exact:true});await selected.check();await p.getByRole('button',{name:'Получить дословный предпросмотр',exact:true}).click();await p.getByRole('checkbox',{name:/Я проверил\(а\) показанные текст и диапазоны/}).check();await selected.uncheck();await expect(p.getByRole('article',{name:'Предпросмотр структурированной версии'})).toHaveCount(0);expect(writes.map(x=>x.action)).toEqual(['preview']);
 await page.getByRole('textbox',{name:'Проверьте текст после импорта',exact:true}).fill('New unsaved source SQL');await expect(p.getByRole('button',{name:'Прочитать структуру для версии',exact:true})).toBeDisabled();await expect(p.getByRole('checkbox',{name:/Использовать запись/})).toHaveCount(0);expect(writes.map(x=>x.action)).toEqual(['preview']);
});
test('failed save is never replayed; explicit history read removes old acceptance',async({page})=>{
 const s=await setup(page),p=s.panel;await page.route('**/api/source-versions',async r=>{if(r.request().method()==='POST'&&r.request().postDataJSON().action==='save'){s.writes.push(r.request().postDataJSON());return r.fulfill({status:503,json:{error:'PRIVATE_UPSTREAM'}});}return r.fallback();});
 await p.getByRole('button',{name:'Прочитать историю структурированных версий',exact:true}).click();await p.getByRole('button',{name:'Прочитать структуру для версии',exact:true}).click();await p.getByRole('checkbox',{name:'Использовать запись 1: Работа',exact:true}).check();await p.getByRole('button',{name:'Получить дословный предпросмотр',exact:true}).click();await p.getByRole('checkbox',{name:/Я проверил\(а\) показанные текст и диапазоны/}).check();await p.getByRole('button',{name:'Сохранить показанную структурированную версию',exact:true}).click();
 await expect(p.getByRole('alert')).toContainText('Сначала перечитайте историю');await expect(page.locator('body')).not.toContainText('PRIVATE_UPSTREAM');await p.getByRole('button',{name:'Прочитать историю структурированных версий',exact:true}).click();await expect(p.getByRole('article',{name:'Предпросмотр структурированной версии'})).toHaveCount(0);expect(s.writes.map(x=>x.action)).toEqual(['preview','save']);
});
