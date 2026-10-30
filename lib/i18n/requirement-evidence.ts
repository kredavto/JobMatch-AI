import type {Copy} from './locale';
const ru={
 confirmed:'Подтверждено пользователем',unconfirmed:'Не подтверждено',
 candidates:(count:number)=>'Найдено в резюме, но не подтверждено ('+count+')',
 help:'Это возможная связь по терминам, а не доказательство всего требования. Подтверждайте только правдивую строку целиком. Исходный текст не меняется.',
 confirm:'Подтверждаю весь факт',
 confirmLabel:(factId:string,requirementId:string)=>'Подтвердить весь факт '+factId+' для требования '+requirementId,
 clarify:'Уточнить опыт в профиле',
 ownerHelp:'Для подтверждения сначала загрузите актуальные данные исходного аккаунта.'
} as const;
const en:Copy<typeof ru>={
 confirmed:'Confirmed by the user',unconfirmed:'Not confirmed',
 candidates:(count:number)=>'Found in the resume, awaiting confirmation ('+count+')',
 help:'This is a possible term match, not evidence of the whole requirement. Confirm a line only if the entire statement is true. Source wording is unchanged.',
 confirm:'I confirm the entire fact',
 confirmLabel:(factId:string,requirementId:string)=>'Confirm entire fact '+factId+' for requirement '+requirementId,
 clarify:'Clarify experience in the profile',
 ownerHelp:'Load current data from the original account before confirming.'
};
export const requirementEvidenceCopy={ru,en};
