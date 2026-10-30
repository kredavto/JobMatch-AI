import {z} from 'zod';
import {normalizeLocale,type UiLocale} from './i18n/locale';
import {FactSchema,gate,propose,parseVacancy,type Fact} from './engine';
export const letterStyles={professional:'Профессиональный',brief:'Краткий',confident:'Уверенный',executive:'Для руководителей'} as const;
export type LetterStyle=keyof typeof letterStyles;
const ruFraming:Record<LetterStyle,{opening:string;closing:string}>={
 professional:{opening:'Здравствуйте! Рассматриваю вашу вакансию и направляю резюме для обсуждения возможного сотрудничества. Ниже выделены подтвержденные сведения из моего профиля, связанные с требованиями вакансии. Они помогут вам оценить, насколько мой опыт подходит для задач позиции.',closing:'Буду рад обсудить задачи позиции, ожидания от кандидата и критерии успешной работы. На встрече предлагаю подробнее разобрать приведенные примеры, мою личную роль и контекст выполнения задач. Если для оценки соответствия нужны дополнительные сведения, готов уточнить их отдельно. Спасибо за внимание к резюме. Буду благодарен за обратную связь и возможность обсудить дальнейшие шаги.'},
 brief:{opening:'Здравствуйте! Откликаюсь на вашу вакансию. Выделю подтвержденные сведения из резюме, связанные с ее требованиями:',closing:'Буду рад обсудить задачи позиции и подробнее рассказать о приведенных примерах. Спасибо за рассмотрение резюме.'},
 confident:{opening:'Здравствуйте! Предлагаю рассмотреть мое резюме на вашу вакансию. Для предметного обсуждения выделяю конкретные сведения из профиля, которые связаны с вашими требованиями. Предпочитаю опираться на проверяемые примеры и ясно обозначать свою роль в работе:',closing:'Предлагаю обсудить, как этот опыт соотносится с приоритетными задачами позиции. На встрече можем разобрать контекст приведенных примеров, ограничения и подход к оценке результата. Также хочу уточнить ваши ожидания на первых этапах работы и критерии успешного сотрудничества. Спасибо за рассмотрение моей кандидатуры. Буду рад продолжить разговор.'},
 executive:{opening:'Здравствуйте! Прошу рассмотреть мое резюме на вашу вакансию. Для обсуждения задач позиции выделяю подтвержденные сведения из профиля. Предлагаю оценивать их с учетом масштаба задач, личной роли и условий, в которых выполнялась работа:',closing:'На встрече хотел бы обсудить приоритеты компании, границы ответственности, ресурсы и критерии результата для этой позиции. Также предлагаю отдельно разобрать приведенные примеры, принятые решения и ограничения. Такой разговор поможет предметно оценить взаимные ожидания и соответствие опыта вашим задачам. Спасибо за внимание к моей кандидатуре. Буду рад возможности обсудить дальнейшие шаги.'}
};
const enFraming:Record<LetterStyle,{opening:string;closing:string}>={
 professional:{opening:'Hello! I would like to discuss your vacancy and have attached my resume for consideration. The following statements are copied from facts I confirmed in my profile and are relevant under the matching rules. Please consider their original context when assessing my experience.',closing:'I would welcome a discussion of the responsibilities, expectations and success criteria for this position. We can review the examples, my personal contribution and the circumstances in which the work was done. If you need further information, I can clarify it separately. Thank you for considering my application.'},
 brief:{opening:'Hello! I am applying for your vacancy. These confirmed statements from my profile are relevant under the matching rules:',closing:'I would welcome a discussion of the role and the examples above. Thank you for considering my resume.'},
 confident:{opening:'Hello! Please consider my resume for your vacancy. For a concrete discussion, I have selected statements from my confirmed profile facts that are relevant under the matching rules. I would like to discuss their context and my personal contribution:',closing:'I would welcome a discussion of how these examples relate to the priorities of the position, including their context and limitations. I would also like to clarify your expectations and criteria for successful cooperation. Thank you for considering my application.'},
 executive:{opening:'Hello! Please consider my resume for your vacancy. I have selected confirmed profile statements for discussion. Their relevance should be assessed in the context of the work, its scope, my personal role and the available resources:',closing:'I would like to discuss the company priorities, responsibilities, resources and success criteria for this position. We can examine the examples, decisions and constraints in more detail to assess our mutual expectations. Thank you for considering my application.'}
};
export const LETTER_TEMPLATE_VERSIONS={ru:'cover-letter-literal-v1-ru',en:'cover-letter-literal-v1-en'} as const;
export function letterEvidence(facts:Fact[],vacancy:string){return propose(facts,parseVacancy(vacancy)).filter(e=>gate(e,facts));}
export function composeLetter(facts:Fact[],vacancy:string,ids:string[],style:LetterStyle,requestedLanguage:UiLocale='ru'){
 if(!Object.hasOwn(letterStyles,style))throw new Error('Неизвестный стиль');
 if(!vacancy.trim())throw new Error('Сначала сохраните вакансию');
 if(!ids.length||ids.length>5||new Set(ids).size!==ids.length)throw new Error('Выберите от 1 до 5 разных подтвержденных фактов');
 const available=letterEvidence(facts,vacancy);
 const selected=ids.map(id=>{const edit=available.find(e=>e.id===id);if(!edit||!gate(edit,facts))throw new Error('Факт больше не подтвержден или не связан с вакансией');return edit;});
 const framing=normalizeLocale(requestedLanguage)==='en'?enFraming:ruFraming;
 const text=[framing[style].opening,selected.map(e=>e.text).join('\n'),framing[style].closing].join('\n\n');
 return {text,evidence_ids:selected.flatMap(e=>e.evidence_ids)};
}
export function wordCount(text:string){return text.trim()?text.trim().split(/\s+/u).length:0;}

const packetSchema=z.object({
 format:z.literal('jobmatch-cover-letter-v1'),generator:z.literal('literal-template'),model_version:z.null(),
 source_status:z.literal('unsigned-local-snapshot'),review:z.literal('reported-user-review'),semantic_verification:z.literal('not-performed'),
 template_version:z.enum(['cover-letter-literal-v1-ru','cover-letter-literal-v1-en']),template_language:z.enum(['ru','en']),
 style:z.enum(['professional','brief','confident','executive']),vacancy:z.string().min(1),
 facts:z.array(FactSchema).min(1).max(5),evidence_ids:z.array(z.string().min(1)).min(1).max(5),
 generated_text:z.string().min(1).max(15000),approved_text:z.string().min(1).max(15000),edited:z.boolean()
}).strict();
/** Reconstructible local provenance, not a signature, source authentication or semantic verification. */
export function validateLetterExport(value:unknown){
 const packet=packetSchema.parse(value),ids=packet.evidence_ids;
 if(new Set(ids).size!==ids.length||new Set(packet.facts.map(f=>f.id)).size!==packet.facts.length||packet.facts.length!==ids.length||packet.facts.some(f=>!ids.includes(f.id))||packet.template_version!==LETTER_TEMPLATE_VERSIONS[packet.template_language]||!packet.approved_text.trim())throw Error('INVALID_LETTER_EXPORT');
 const draft=composeLetter(packet.facts,packet.vacancy,ids.map(id=>'edit-'+id),packet.style,packet.template_language);
 if(draft.text!==packet.generated_text||JSON.stringify(draft.evidence_ids)!==JSON.stringify(ids)||packet.edited!==(packet.approved_text!==packet.generated_text))throw Error('INVALID_LETTER_EXPORT');
 return packet;
}
export function letterExport(facts:Fact[],vacancy:string,ids:string[],style:LetterStyle,language:UiLocale,approvedText:string){
 const draft=composeLetter(facts,vacancy,ids,style,language);
 return validateLetterExport({format:'jobmatch-cover-letter-v1',generator:'literal-template',model_version:null,source_status:'unsigned-local-snapshot',review:'reported-user-review',semantic_verification:'not-performed',template_version:LETTER_TEMPLATE_VERSIONS[language],template_language:language,style,vacancy,facts:facts.filter(f=>draft.evidence_ids.includes(f.id)).map(f=>FactSchema.parse(f)),evidence_ids:draft.evidence_ids,generated_text:draft.text,approved_text:approvedText,edited:approvedText!==draft.text});
}
