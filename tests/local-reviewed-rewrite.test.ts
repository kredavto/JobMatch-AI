import {describe,expect,it} from 'vitest';
import {adaptResume} from '../mvp/adapt';
import {applyLocalReviewedRewrite,localReviewCandidateIds} from '../mvp/local-reviewed-rewrite';
import {resumeFacts} from '../mvp/full-resume-consent';

const first='• Команда подготовила 17 отчётов на SQL.';
const second='• Писал внутреннюю документацию.';
const third='• Рабочую среду не настраивал.';
const rewrite='17 отчётов на SQL подготовила команда.';
const vacancy={title:'Аналитик',company:'Фиктивная фирма',url:'https://hh.ru/vacancy/123',text:'Ожидаются SQL и Docker',skills:['SQL','Docker','ELK']};
const mk=(source:string,line:number,text=rewrite)=>({sourceId:'line-'+line,sourceQuote:resumeFacts(source)[line-1].text,text});
const source=['Опыт',second,first,third,'','Образование','Университет'].join('\r\n');

describe('Local-only reviewed wording',()=>{
 it('changes only the selected body occurrence after deterministic ranking and keeps CRLF, title, evidence, skills and letter',()=>{
  const baseline=adaptResume(source,vacancy);
  const draft={suggestions:[mk(source,3)]};
  expect([...localReviewCandidateIds(source,vacancy,baseline,draft)]).toEqual(['line-3']);
  const next={...baseline,...applyLocalReviewedRewrite(source,vacancy,baseline,draft,['line-3'])};
  expect(next.text).toBe(baseline.text.replace(first,'• '+rewrite));
  expect(next.coverLetter).toBe(baseline.coverLetter);
  expect(next.matchedSkills).toEqual(['SQL']);
  expect(next.missingSkills).toEqual(['Docker','ELK']);
  expect(next.title).toBe(vacancy.title);
  expect(next.text).not.toContain(first);
  expect(source).toContain(first);
 });
 it('uses exact vacancy-specific baseline title and ranking without considering model text',()=>{
  const documentation={...vacancy,title:'Технический писатель',text:'Опыт Git',skills:['Git']};
  const baseline=adaptResume(source,documentation);
  const next=applyLocalReviewedRewrite(source,documentation,baseline,{suggestions:[mk(source,3)]},['line-3']);
  expect(next.text).toBe(baseline.text.replace(first,'• '+rewrite));
  expect(next.text).toMatch(/^Технический писатель/);
 });
 it.each([
  ['Опыт\n'+first+'\n'+first,2,'повторяющиеся строки'],
  ['Опыт\n'+first+'\n  '+second,2,'вложенный список'],
  ['Опыт\n'+first+'\nПродолжение',2,'продолжение строки'],
  ['Требования вакансии\n'+first,2,'недопустимый раздел'],
  ['Опыт\nКоманда подготовила 17 отчётов на SQL.',2,'не список'],
 ])('rejects ambiguous %s', (text,line)=>{
  const baseline=adaptResume(text,vacancy), draft={suggestions:[mk(text,line)]};
  expect(localReviewCandidateIds(text,vacancy,baseline,draft).size).toBe(0);
  expect(()=>applyLocalReviewedRewrite(text,vacancy,baseline,draft,['line-'+line])).toThrow();
 });
 it.each([
  'Команда подготовила 18 отчётов на SQL.',
  'Команда подготовила 17 отчётов на SQL и Docker.',
  'Команда подготовила 17 отчётов на SQL и ELK.',
  'Команда подготовила 17 отчётов на SQL в Git.',
  'Команда подготовила 17 отчётов.',
  'Команда подготовила 17 отчётов на SQL.\nЗавершил проект.',
 ])('does not make changed numbers, known skills or invalid structure selectable: %s',text=>{
  const baseline=adaptResume(source,vacancy);
  expect(localReviewCandidateIds(source,vacancy,baseline,{suggestions:[mk(source,3,text)]}).size).toBe(0);
 });
 it('rejects stale source, wrong vacancy, already modified result, empty and duplicate IDs',()=>{
  const out={suggestions:[mk(source,3)]}, base=adaptResume(source,vacancy);
  const apply=(ids:string[])=>applyLocalReviewedRewrite(source,vacancy,base,out,ids);
  expect(()=>apply([])).toThrow();
  expect(()=>apply(['line-3','line-3'])).toThrow();
  expect(()=>apply(['line-2'])).toThrow();
  expect(()=>applyLocalReviewedRewrite(source.replace('17','29'),vacancy,base,out,['line-3'])).toThrow();
  expect(()=>applyLocalReviewedRewrite(source,{...vacancy,title:'Другая роль'},base,out,['line-3'])).toThrow();
  expect(()=>applyLocalReviewedRewrite(source,vacancy,{...base,...apply(['line-3'])},out,['line-3'])).toThrow();
 });
});
