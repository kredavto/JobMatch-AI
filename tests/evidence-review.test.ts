import {it,expect} from 'vitest';
import {evidenceIssue} from '../lib/evidence-review';
import {parseFacts,parseVacancy,match,propose,gate} from '../lib/engine';
import {letterEvidence} from '../lib/cover-letter';
const facts=(text:string)=>parseFacts(text).map(f=>({...f,verified:true}));
it.each(['Не работал с SQL','Не знала SQL','С Python не знаком','SQL не применял','Опыта нет: SQL','Не было опыта SQL','SQL: нет навыков','I have never used SQL','I don’t know SQL','I did not use SQL','No SQL experience','Without SQL experience','Изучаю SQL','Хочу освоить SQL','Буду изучать SQL','Currently learning SQL','Planning to learn SQL'])('does not use uncertain fact: %s',text=>{
 const f=facts(text),q=parseVacancy('SQL\nPython');expect(evidenceIssue(text)).not.toBeNull();expect(match(f,q).score).toBe(0);expect(propose(f,q)).toEqual([]);expect(letterEvidence(f,'SQL\nPython')).toEqual([]);expect(gate({id:'e',text,evidence_ids:[f[0].id],reason:''},f)).toBe(false);
});
it.each(['Работал с SQL','Не менее 5 лет работал с SQL','Создал SQL-отчет без ошибок','Completed a SQL project','SQL query optimization'])('retains positive evidence: %s',text=>expect(evidenceIssue(text)).toBeNull());
it('requires clarification when verified positive and negative facts conflict',()=>{const f=facts('SQL\nНе знаю SQL');const result=match(f,parseVacancy('SQL'));expect(result.score).toBe(0);expect(result.rows[0].status).toBe('unknown');expect(result.rows[0].evidence_ids).toEqual([]);expect(f.every(x=>x.verified)).toBe(true);});
it('does not suppress unrelated positive evidence',()=>expect(match(facts('SQL\nНе знаю Python'),parseVacancy('SQL')).score).toBe(100));
it('does not claim contradictory vacancy requirements matched',()=>expect(match(facts('SQL'),parseVacancy('SQL не требуется')).rows[0].status).toBe('unknown'));
