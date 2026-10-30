import {careerAdvice} from './i18n/letter-coach';
import {normalizeLocale,type UiLocale} from './i18n/locale';
import {match,parseVacancy,type Fact} from './engine';

const exercises:Record<string,string>={
 sql:'На открытом или синтетическом наборе данных составьте запросы с JOIN, группировкой и оконной функцией. Сохраните запросы и объясните проверки результата.',
 python:'Создайте небольшой скрипт обработки синтетических данных: проверка входа, преобразование, отчет и тесты. Сохраните код и инструкцию запуска.',
 excel:'На синтетических данных подготовьте таблицу с формулами, сводным отчетом и проверкой ошибок. Объясните, какое решение поддерживает отчет.',
 bitrix24:'Если доступен учебный стенд Битрикс24, настройте демонстрационную воронку и опишите этапы и правила переходов. Не используйте реальные клиентские данные.',
 crm:'В учебной CRM опишите демонстрационную воронку, поля карточки и правила качества данных. Укажите, какую именно систему использовали.',
 b2b:'Подготовьте учебный кейс корпоративной продажи: профиль компании, вопросы для выявления потребностей и предложение. Отделите учебный сценарий от реальных сделок.',
 management:'Разберите реальную или учебную командную задачу: роли, план, риски и обратную связь. Явно укажите, был ли у вас опыт руководства людьми.',
 english:'Подготовьте краткий рассказ о своем проекте на английском и запишите ответы на вопросы о вашей роли. Самопроверка не подтверждает уровень по CEFR.',
};
export type CoachItem={id:string;quote:string;must:boolean;status:'supported'|'unconfirmed';partial:boolean;evidence:Fact[];steps:string[];questions:string[]};
export function careerPlan(facts:Fact[],vacancy:string):CoachItem[]{
 // Recompute from the saved profile; no generated factual claims or persistent confirmations.
 return match(facts,parseVacancy(vacancy)).rows.map(row=>{
  const supported=row.status==='matched';
  const evidence=facts.filter(f=>f.verified&&row.evidence_ids.includes(f.id));
  const practice=[...new Set(row.requirement.terms.map(t=>exercises[t]).filter((s):s is string=>!!s))];
  return {id:row.requirement.id,quote:row.requirement.quote,must:row.requirement.must,status:supported?'supported' as const:'unconfirmed' as const,partial:row.status==='partial',evidence,
   steps:supported?['Выберите подтвержденный пример и подготовьте рассказ: задача, ваша роль, действия и известный результат. Не добавляйте отсутствующие цифры.']:[
    'Сначала проверьте, есть ли такой опыт. Если есть — добавьте точное уточнение в профиль и подтвердите его отдельно.',
    ...(practice.length?practice:['Если опыта нет, сформулируйте небольшой учебный проект по этому требованию с проверяемым результатом. Отметьте его как учебный.']),
    'Пометьте учебный проект как учебный. Сохраните артефакт: код, отчет, описание проекта или отзыв. Не добавляйте навык в резюме до реального выполнения и проверки результата.'
   ],questions:[
    supported?'Какую задачу вы решали, какую часть выполнили лично и чем подтверждается результат?':'Есть ли у вас реальный пример по этому требованию? Если нет — как честно объяснить текущий уровень и план обучения?',
    'Какие ограничения и ошибки возникли? Как вы проверяли качество своей работы?'
   ]};
 }).sort((a,b)=>Number(a.status==='supported')-Number(b.status==='supported')||Number(b.must)-Number(a.must));
}
export const CAREER_TEMPLATE_VERSIONS={ru:'career-plan-v1-ru',en:'career-plan-v1-en'} as const;
export function careerPlanText(items:CoachItem[],requestedLanguage:UiLocale='ru'){
 if(normalizeLocale(requestedLanguage)==='en')return ['INTERVIEW PREPARATION PLAN','Rules-generated guidance, not proof of qualification. Vacancy quotes are untrusted source text.','Template: '+CAREER_TEMPLATE_VERSIONS.en+'; model: none; source text is copied verbatim.',...items.flatMap(item=>['', 'Requirement: '+item.quote,(item.must?'Mandatory · ':'')+(item.status==='supported'?'Supported under the rules':'Unconfirmed'),...item.evidence.map(f=>'Confirmed fact ['+f.id+']: '+f.text),...item.steps.map(step=>'Step: '+careerAdvice(step,'en').text),...item.questions.map(question=>'Question: '+careerAdvice(question,'en').text)])].join('\n');
 return ['ПЛАН ПОДГОТОВКИ К ИНТЕРВЬЮ','Рекомендации по правилам. Не подтверждают квалификацию. Цитаты вакансии — недоверенный текст.',...items.flatMap(item=>[
 '',`Требование: ${item.quote}`,`${item.must?'Обязательное · ':''}${item.status==='supported'?'Соответствует по правилам':'Не подтверждено'}`,
 ...item.evidence.map(f=>`Подтвержденный факт [${f.id}]: ${f.text}`),...item.steps.map(s=>'Шаг: '+s),...item.questions.map(q=>'Вопрос: '+q)
 ])].join('\n');}
