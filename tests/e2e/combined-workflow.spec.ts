import {test,expect} from '@playwright/test';
import {match,parseVacancy,propose} from '../../lib/engine';
import type {Workspace} from '../../lib/db';

test('bulk-confirmed skills and explicitly saved HH draft feed only consented AI literal preview',async({page})=>{
 const ownerId='11111111-1111-4111-8111-111111111111';
 let state:Workspace={ownerId,revision:1,original:'Name\nSQL\nPython',vacancy:'',goal:'',facts:[{id:'sql',text:'SQL',source:'synthetic',verified:false},{id:'python',text:'Python',source:'synthetic',verified:false}],versions:[],applications:[]};
 const actions:string[]=[];let aiCalls=0,hhCalls=0;
 await page.route('**/api/service',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:state});
  const body=route.request().postDataJSON();actions.push(body.action);expect(body.expectedOwnerId).toBe(ownerId);expect(body.revision).toBe(state.revision);
  if(body.action==='verify'){expect(body.ids).toEqual(['sql']);expect(body.verified).toBe(true);state={...state,revision:2,facts:state.facts.map(f=>f.id==='sql'?{...f,verified:true}:f)};return route.fulfill({json:state});}
  if(body.action==='vacancy'){expect(body.text).toBe('Требования:\nSQL');state={...state,revision:3,vacancy:body.text};return route.fulfill({json:state});}
  if(body.action==='analyze'){const req=parseVacancy(state.vacancy);return route.fulfill({json:{analysis:match(state.facts,req),edits:propose(state.facts,req)}});}
  throw Error('Unexpected mutation: '+body.action);
 });
 await page.route('**/api/hh-vacancy',route=>{hhCalls++;expect(route.request().postDataJSON().expectedOwnerId).toBe(ownerId);return route.fulfill({json:{ownerId,id:'123',url:'https://hh.ru/vacancy/123',text:'Требования:\nSQL',archived:false}});});
 await page.route('**/api/ai-resume-adaptation',route=>{aiCalls++;expect(route.request().postDataJSON()).toEqual({consent:true,revision:3,expectedOwnerId:ownerId});expect(state.facts[0].verified).toBe(true);expect(state.facts[1].verified).toBe(false);return route.fulfill({json:{ownerId,revision:3,preview:{format:'jobmatch-ai-resume-adaptation-v1',generator:'ai-selected-literal',modelAcceptance:'not-accepted',review:{requirements:[{quote:'SQL',evidence_ids:['sql']}]}}}});});
 await page.goto('/');const nav=page.getByRole('navigation');await nav.getByRole('button',{name:'Мой профиль',exact:true}).click();await page.getByRole('checkbox',{name:'Выделить все',exact:true}).check();await page.getByRole('checkbox',{name:/Python/}).uncheck();expect(actions).toEqual([]);await page.getByRole('button',{name:'Подтвердить и сохранить выбранные навыки',exact:true}).click();await expect.poll(()=>actions.length).toBe(1);
 await nav.getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('textbox',{name:'Ссылка или ID hh.ru',exact:true}).fill('https://hh.ru/vacancy/123');await page.getByRole('button',{name:'Загрузить по ссылке',exact:true}).click();await expect(page.getByRole('region',{name:'Предпросмотр вакансии',exact:true})).toBeVisible();expect(actions).toEqual(['verify']);expect(aiCalls).toBe(0);
 await page.getByRole('button',{name:'Заменить текст этим импортом',exact:true}).click();expect(actions).toEqual(['verify']);await page.getByRole('button',{name:'Сохранить вакансию',exact:true}).click();await expect.poll(()=>actions.length).toBe(2);await page.getByRole('button',{name:'Проанализировать →',exact:true}).click();
 const panel=page.getByRole('region',{name:'AI-адаптация резюме · эксперимент',exact:true});await expect(panel.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();expect(aiCalls).toBe(0);await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Адаптировать резюме',exact:true}).click();await panel.getByRole('checkbox',{name:'SQL',exact:true}).check();await panel.getByRole('checkbox',{name:'Я проверил(а) выбранные строки и их уместность для вакансии',exact:true}).check();await panel.getByRole('button',{name:'Показать проверенный мной черновик',exact:true}).click();await expect(panel.getByRole('textbox')).toHaveValue('РЕЛЕВАНТНЫЙ ОПЫТ\nSQL\n\nПРОФИЛЬ\nName\nPython');expect(actions).toEqual(['verify','vacancy','analyze']);expect(hhCalls).toBe(1);expect(aiCalls).toBe(1);expect(state.versions).toEqual([]);
 await nav.getByRole('button',{name:'Анализ вакансии',exact:true}).click();await page.getByRole('textbox',{name:'Текст вакансии',exact:true}).fill('New unsaved vacancy');await nav.getByRole('button',{name:'Редактор резюме',exact:true}).click();await expect(panel.getByRole('textbox')).toHaveCount(0);await expect(panel.getByRole('button',{name:'Адаптировать резюме',exact:true})).toBeDisabled();expect(aiCalls).toBe(1);
});
