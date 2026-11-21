import {eligibleEvidence} from './eligible-evidence';
import {prioritizeEvidence,evidenceNote} from './evidence';
import type {Vacancy} from './contracts';
const normalize=(text:string)=>text.normalize('NFKC').toLowerCase().replaceAll('ё','е').replace(/\s+/g,' ').trim();
const catalog=['Excel','SQL','Python','JavaScript','TypeScript','React','Node.js','Java','C++','C#','Figma','Photoshop','Power BI','Tableau','SAP','1С','Битрикс24','amoCRM','CRM','B2B','B2C','SEO','SMM','Google Analytics','Яндекс Метрика','Git','Docker','Kubernetes','PostgreSQL','Agile','Scrum','Kanban','Jira'];
function contains(text:string,phrase:string){
 const source=normalize(text),needle=normalize(phrase);let offset=source.indexOf(needle);
 while(offset>=0){const before=source[offset-1],after=source[offset+needle.length];if((!before||!/[\p{L}\p{N}]/u.test(before))&&(!after||!/[\p{L}\p{N}]/u.test(after)))return true;offset=source.indexOf(needle,offset+1);}return false;
}
/** A rewrite may not change membership of any known or vacancy-listed skill. */
export function preservesKnownSkills(original:string,replacement:string,vacancy:Vacancy):boolean{
 return [...catalog,...vacancy.skills].filter(skill=>normalize(skill)).every(skill=>contains(original,skill)===contains(replacement,skill));
}
/** Choose a hook without changing a single character of the evidence itself. */
function buildLocalCoverLetter(title:string,relevant:readonly string[],matchedSkills:readonly string[]){
 const role=title.replace(/\s+/g,' ').trim();
 const target=role?`на вакансию «${role}»`:'на вашу вакансию';
 if(!relevant.length){
  return `Здравствуйте!\n\nПрилагаю резюме к отклику ${target}. Если мой профиль вам подходит, предлагаю на встрече начать с вопроса: какой результат на этой позиции важнее всего в первые недели?`;
 }
 const anchors=relevant.map((line,index)=>({line,index,hits:matchedSkills.filter(skill=>contains(line,skill)).length}));
 // Prefer a concise, explicitly relevant quotation over a generic introduction.
 // Overlong passages remain intact; do not crop away team attribution or qualifiers.
 const concise=anchors.filter(({line})=>line.length<=240);
 const [lead]=(concise.length?concise:anchors).sort((a,b)=>b.hits-a.hits||a.index-b.index);
 const quoted=(line:string)=>`«${line}»`;
 const rest=relevant.filter(line=>line!==lead.line).slice(0,2);
 return [
  'Здравствуйте!',
  `${quoted(lead.line)}${/[.!?…]$/u.test(lead.line)?'':'.'}\nОткликаюсь ${target} и выделяю этот пример из резюме как отправную точку для разговора.`,
  rest.length?'Ещё по теме:\n'+rest.map(line=>'• '+quoted(line)).join('\n'):'',
  'Если этот опыт близок вашим задачам, давайте обсудим первый результат, которого вы ждёте на этой позиции.'
 ].filter(Boolean).join('\n\n');
}
export function adaptResume(resume:string,vacancy:Vacancy){
 const lines=[...eligibleEvidence(resume)];
 const candidates=[...new Map([...vacancy.skills,...catalog.filter(skill=>contains(vacancy.text,skill))].map(skill=>[normalize(skill),skill.trim()])).values()];
 const matchedSkills=candidates.filter(skill=>lines.some(line=>contains(line,skill)));
 const missingSkills=candidates.filter(skill=>!matchedSkills.includes(skill));
 const relevant=lines.map(line=>line.trim()).filter(line=>line.length>=12&&line.length<=500&&matchedSkills.some(skill=>contains(line,skill)));
 const unique=[...new Set(relevant)].slice(0,5);
 // The only new qualification statements are exact positive quotations from the source.
 // The job title is an application target, never a claim about past employment.
 // Keep source context and ordering intact, without quoting its lines twice.
 // Selected evidence belongs in the cover letter, not a duplicate resume block.
 const body=prioritizeEvidence(resume.trim(),unique);
 const sections=[vacancy.title,body.text].filter(Boolean);
 const coverLetter=buildLocalCoverLetter(vacancy.title,unique,matchedSkills);
 return {adaptationNote:evidenceNote(body.reorderedGroups),title:vacancy.title,text:sections.join('\n\n'),coverLetter,mode:'automatic' as const,matchedSkills,missingSkills};
}
