import {test,expect} from '@playwright/test';
import {match,parseVacancy,propose} from '../../lib/engine';
const workspace={revision:1,original:'SQL',vacancy:'Обязательные требования:\nSQL\nPython',goal:'Аналитик',facts:[{id:'ev1',text:'SQL',source:'Вымышленный пример',verified:true}],versions:[],applications:[]};
for(const corruption of ['invented','score','schema'] as const)test('rejects '+corruption+' analysis and removes previous editable result',async({page})=>{
 let corrupt=false,requests=0,writes=0;
 await page.route('**/api/service',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:workspace});
  const action=r.request().postDataJSON().action;
  if(action!=='analyze'){writes++;return r.fulfill({json:workspace});}
  requests++;
  const req=parseVacancy(workspace.vacancy),result={analysis:match(workspace.facts,req),edits:propose(workspace.facts,req)};
  if(corrupt){
   if(corruption==='schema')return r.fulfill({json:{analysis:null,edits:[]}});
   if(corruption==='score')result.analysis.score=100;
   else result.edits[0].text='Выдуманное достижение 200%';
  }
  return r.fulfill({json:result});
 });
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();
 await page.getByRole('button',{name:'Проанализировать →'}).click();
 await expect(page.getByRole('table')).toBeVisible();await page.getByRole('button',{name:'Принять все подтвержденные'}).click();
 corrupt=true;await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();
 await page.getByRole('button',{name:'Проанализировать →'}).click();
 await expect(page.locator('.error')).toContainText('Результат анализа не соответствует');
 await page.getByRole('navigation').getByRole('button',{name:'Редактор резюме',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Начнем с анализа'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Подтверждаю · сохранить версию'})).toHaveCount(0);
 await expect(page.getByText('Выдуманное достижение 200%',{exact:true})).toHaveCount(0);
 expect(requests).toBe(2);expect(writes).toBe(0);
 corrupt=false;await page.getByRole('button',{name:'Загрузить актуальные данные'}).click();
 await page.getByRole('navigation').getByRole('button',{name:'Анализ вакансии',exact:true}).click();
 await page.getByRole('button',{name:'Проанализировать →'}).click();
 await expect(page.getByRole('table')).toBeVisible();expect(requests).toBe(3);expect(writes).toBe(0);
});
