import type {Vacancy} from './contracts';
const normalize=(text:string)=>text.normalize('NFKC').toLowerCase().replaceAll('ё','е').replace(/\s+/g,' ').trim();
const negative=/(?:\b(?:no|not|without|learning|studying)\b|(?:^|\s)(?:не|нет|без|изучаю|планирую|хочу освоить)(?:\s|$))/i;
const catalog=['Excel','SQL','Python','JavaScript','TypeScript','React','Node.js','Java','C++','C#','Figma','Photoshop','Power BI','Tableau','SAP','1С','Битрикс24','amoCRM','CRM','B2B','B2C','SEO','SMM','Google Analytics','Яндекс Метрика','Git','Docker','Kubernetes','PostgreSQL','Agile','Scrum','Kanban','Jira'];
function contains(text:string,phrase:string){
 const source=normalize(text),needle=normalize(phrase);let offset=source.indexOf(needle);
 while(offset>=0){const before=source[offset-1],after=source[offset+needle.length];if((!before||!/[\p{L}\p{N}]/u.test(before))&&(!after||!/[\p{L}\p{N}]/u.test(after)))return true;offset=source.indexOf(needle,offset+1);}return false;
}
export function adaptResume(resume:string,vacancy:Vacancy){
 const lines=resume.replace(/\r\n?/g,'\n').split('\n');
 const candidates=[...new Set([...vacancy.skills,...catalog.filter(skill=>contains(vacancy.text,skill))])];
 const matchedSkills=candidates.filter(skill=>lines.some(line=>!negative.test(line)&&contains(line,skill))).slice(0,30);
 const missingSkills=candidates.filter(skill=>!matchedSkills.includes(skill));
 const relevant=lines.map(line=>line.trim()).filter(line=>line.length>=12&&line.length<=500&&!negative.test(line)&&matchedSkills.some(skill=>contains(line,skill)));
 const unique=[...new Set(relevant)].slice(0,5);
 // The only new qualification statements are exact positive quotations from the source.
 // The job title is an application target, never a claim about past employment.
 // Preserve source verbatim; the new first heading is the requested target title.
 const source=[...lines];
 const sections=[vacancy.title,unique.length?'Релевантный опыт и навыки\n'+unique.join('\n'):'',source.join('\n').trim()].filter(Boolean);
 const company=vacancy.company?` в компании «${vacancy.company}»`:'';
 const coverLetter=[`Здравствуйте!\n\nОткликаюсь на вакансию «${vacancy.title}»${company}.`,unique.length?'Релевантные сведения из моего резюме:\n'+unique.slice(0,3).map(line=>'• '+line).join('\n'):'Направляю резюме для рассмотрения моей кандидатуры.','Буду рад обсудить задачи позиции и мой опыт. Спасибо за внимание к моей кандидатуре!'].join('\n\n');
 return {title:vacancy.title,text:sections.join('\n\n'),coverLetter,mode:'automatic' as const,matchedSkills,missingSkills};
}
