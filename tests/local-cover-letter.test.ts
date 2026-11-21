import {describe,expect,it,vi} from 'vitest';
import {adaptResume} from '../mvp/adapt';
const vacancy={title:'Аналитик данных',company:'Вымышленная компания',url:'https://example.com/job',text:'Нужен специалист со знанием SQL, Excel и Kubernetes.',skills:['SQL','Excel','Kubernetes']};
describe('local fact-grounded cover letter',()=>{
 it('leads with relevant exact concrete evidence and does not invent company motivation',()=>{
  const lead='Команда подготовила 17 отчётов в SQL и Excel за 3 недели.';
  const resume=['Делал выгрузки в SQL.',lead,'Не настраивал Kubernetes в production.'].join('\n');
  const result=adaptResume(resume,vacancy);
  expect(result.coverLetter.split('\n')[2]).toBe(`«${lead}»`);
  expect(result.coverLetter).toContain('Откликаюсь на вакансию «Аналитик данных»');
  expect(result.coverLetter).toContain('«Делал выгрузки в SQL.»');
  expect(result.coverLetter.split(lead)).toHaveLength(2);
  expect(result.coverLetter).not.toMatch(/Kubernetes|подготовил 17|Вымышленная компания/);
  expect(result.text).toContain('Не настраивал Kubernetes в production.');
  expect(result.missingSkills).toContain('Kubernetes');
 });
 it('does not crop a source line or silently drop a qualifier to force a short hook',()=>{
  const lead='Команда в учебном проекте подготовила 17 отчётов SQL за 3 недели. '+('Подробности проекта приведены в резюме. '.repeat(5).trim());
  expect(lead.length).toBeGreaterThan(240);
  const result=adaptResume(lead,vacancy);
  expect(result.coverLetter).toContain(`«${lead}»`);
 });
 it('writes an honest question when no evidence supports a vacancy skill',()=>{
  const resume='Изучаю SQL.\nС Excel не работал.\nЕсть опыт составления смет.';
  const result=adaptResume(resume,vacancy);
  expect(result.matchedSkills).toEqual([]);
  expect(result.coverLetter).toContain('Какой результат'.toLowerCase());
  expect(result.coverLetter).not.toMatch(/SQL|Excel|Kubernetes|Вымышленная компания|уверен|мечтаю|идеально/);
 });
 it('does not leak unrelated resume passages when vacancy has no skill context or make requests',()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  try{
   const result=adaptResume('Выпускал отчёты в SQL.\nТелефон: +7 900 000 00 00',{...vacancy,company:'',text:'Описание вакансии отсутствует.',skills:[]});
   expect(result.coverLetter).toContain('на вакансию «Аналитик данных»');
   expect(result.coverLetter).not.toMatch(/SQL|Телефон|900/);
   expect(fetch).not.toHaveBeenCalled();
  }finally{vi.unstubAllGlobals();}
 });
});
