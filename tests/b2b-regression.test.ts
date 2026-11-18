import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {adaptResume} from '../mvp/adapt';
const resume='Опыт работы:\nСинтетическая компания. Менеджер по работе с клиентами.\n- Вёл корпоративные продажи B2B и переговоры с заказчиками.\n- Работал с CRM и сопровождал договоры.';
const vacancy={title:'Менеджер корпоративных продаж B2B',company:'Вымышленная компания',url:'https://example.com/synthetic-b2b-job',text:'Полностью вымышленная вакансия: корпоративные продажи B2B, переговоры с заказчиками, работа с CRM. Python желателен.',skills:['B2B','Корпоративные продажи','Переговоры','CRM','Python']};
it('recognizes explicit B2B, corporate sales, negotiation and CRM evidence without inventing Python',()=>{
 const result=adaptResume(resume,vacancy);
 expect(result.matchedSkills).toEqual(['B2B','Корпоративные продажи','Переговоры','CRM']);
 expect(result.missingSkills).toEqual(['Python']);expect(result.coverLetter).toContain('Вёл корпоративные продажи B2B и переговоры с заказчиками.');expect(result.coverLetter).not.toContain('Python');expect(result.text).toContain(resume);expect(result).not.toHaveProperty('score');
});
it('still recognizes literal B2B in vacancy prose when structured skills are absent',()=>{
 const result=adaptResume(resume,{...vacancy,skills:[]});expect(result.matchedSkills).toEqual(['CRM','B2B']);expect(result.coverLetter).toContain('переговоры с заказчиками');expect(result.missingSkills).toEqual(['Python']);
});
it('supports explicit Russian skill phrases without requiring the B2B abbreviation',()=>{
 const result=adaptResume('Опыт:\nВёл корпоративные продажи и переговоры с заказчиками.',{...vacancy,text:'Корпоративные продажи и переговоры с заказчиками.',skills:['Корпоративные продажи','Переговоры']});expect(result.matchedSkills).toEqual(['Корпоративные продажи','Переговоры']);
});
it('does not promote negated B2B experience or copied requirements',()=>{
 const source='Не работал в B2B и не вёл корпоративные продажи.\nТребования вакансии:\nПереговоры и CRM\nОпыт работы:\nОрганизовывал учебные мероприятия.';
 const result=adaptResume(source,vacancy);expect(result.matchedSkills).toEqual([]);expect(result.text).toContain(source);expect(result.coverLetter).not.toContain('Релевантные сведения');
});
it('does not count B2B embedded inside a different identifier as evidence',()=>{
 expect(adaptResume('Работал в проекте XB2BY по внутреннему учёту.',{...vacancy,text:'Нужен опыт работы B2B.',skills:['B2B']}).matchedSkills).toEqual([]);
});
it('does not turn lexical non-matches into a misleading zero-of-one-hundred score',()=>{
 const result=adaptResume('Занимался корпоративными продажами и проводил переговоры.',{...vacancy,text:'Нужны корпоративные продажи.',skills:['Корпоративные продажи']});expect(result.matchedSkills).toEqual([]);expect(result).not.toHaveProperty('score');
 const panel=readFileSync('app/skill-match-review.tsx','utf8');expect(panel).toContain('не оценка квалификации');expect(panel).toContain('Это не означает, что у вас нет таких навыков');
});
