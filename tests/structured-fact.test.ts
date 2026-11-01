import {describe,it,expect} from 'vitest';
import {renderStructuredFact,addedClarification} from '../app/structured-fact';
import {evidenceIssue} from '../lib/evidence-review';
import {match,parseVacancy,propose} from '../lib/engine';
const now='2026-11';
const episode={kind:'episode',organization:'Демо',role:'SQL аналитик',from:'2020-03',to:'2022-06',continuous:false};
const quantity={kind:'quantity',scope:'personal',activity:'Подготовка отчётов SQL',count:'7',unit:'отчёты',year:'2024'};
describe('explicit structured clarification renderer',()=>{
 it('renders one closed episode without inventing years or continuity',()=>{expect(renderStructuredFact(episode,now).text).toBe('Эпизод моего опыта. Организация: Демо. Роль: SQL аналитик. Период: 2020-03 — 2022-06.');});
 it('continuity only follows explicit user assertion; no duration arithmetic',()=>{const text=renderStructuredFact({...episode,continuous:true},now).text;expect(text).toContain('Непрерывность этого эпизода заявлена мной.');expect(text).not.toMatch(/\d+ лет/);});
 it('personal quantity is exact user input, not summed or rounded',()=>{expect(renderStructuredFact(quantity,now).text).toBe('Личный количественный результат. Действие или показатель: Подготовка отчётов SQL. Количество: 7. Единица измерения: отчёты. Период учёта: 2024.');expect(renderStructuredFact({...quantity,count:'0'},now).text).toContain('Количество: 0.');});
 for(const scope of ['team','organization'])it(scope+' remains nonpersonal even after ordinary verification',()=>{const text=renderStructuredFact({...quantity,scope},now).text;expect(text).toContain('Не использовать как личное достижение.');expect(evidenceIssue(text)).not.toBeNull();const facts=[{id:'f',text,source:'Уточнение пользователя',verified:true}];expect(match(facts,parseVacancy('SQL')).rows[0].status).toBe('unknown');expect(propose(facts,parseVacancy('SQL'))).toEqual([]);});
 for(const count of ['-1','1.5','01','1e3','+2',' 7','7 ','1000000000','NaN'])it('rejects malformed count '+count,()=>{expect(()=>renderStructuredFact({...quantity,count},now)).toThrow();});
 for(const unit of ['%','проценты','Percent'])it('does not pretend percentage is a count '+unit,()=>{expect(()=>renderStructuredFact({...quantity,unit},now)).toThrow();});
 for(const input of [{...episode,to:'2020-13'},{...episode,to:'2020-01'},{...episode,to:'2026-12'},{...episode,from:'1899-01'},{...quantity,year:'2027'},{...quantity,scope:''},{...quantity,scope:'company'},{...quantity,extra:true},{...episode,continuous:undefined},{...episode,role:''}])it('rejects incomplete, unknown or future values',()=>{expect(()=>renderStructuredFact(input,now)).toThrow();});
 for(const role of ['a\nb','a\rb','a\u202eb','a\u200bb','a\ud800b','a'.repeat(121)])it('rejects hidden/overlong field',()=>{expect(()=>renderStructuredFact({...episode,role},now)).toThrow();});
 it('does not interpret markup or alter given text',()=>{expect(renderStructuredFact({...episode,role:'<b>SQL</b>'},now).text).toContain('<b>SQL</b>');});
 it('maximum fields stay a single ordinary bounded fact',()=>{const text=renderStructuredFact({...quantity,activity:'x'.repeat(240),unit:'y'.repeat(60),count:'999999999'},now).text;expect(text.length).toBeLessThanOrEqual(2000);expect(text).not.toContain('\n');});
});
describe('unverified add acknowledgement',()=>{
 const before={ownerId:'owner',revision:2,original:'SQL',facts:[{id:'old',text:'SQL',source:'import',verified:true}]};
 const after={ownerId:'owner',revision:3,original:'SQL\nnew',facts:[...before.facts,{id:'new',text:'new',source:'Уточнение пользователя',verified:false}]};
 it('requires exact new unverified row and append',()=>expect(addedClarification(before,after,'new')).toBe(true));
 for(const bad of [{...after,ownerId:'other'},{...after,revision:4},{...after,original:'new'},{...after,facts:[{...after.facts[1],verified:true}]},{...after,facts:[{...after.facts[0],verified:false},after.facts[1]]},{...after,facts:[...after.facts,{...after.facts[1],id:'extra'}]}])it('rejects uncertain or changed acknowledgement',()=>expect(addedClarification(before,bad,'new')).toBe(false));
});
