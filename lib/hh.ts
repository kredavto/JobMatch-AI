import {vacancyId} from './engine';
export class HHProvider {
 readonly mode='manual' as const;
 async getVacancy(input:string){vacancyId(input);throw new Error('API не активирован: вставьте текст вакансии.');}
 async getMyResumes(){throw new Error('Нет подтвержденной поддержки и доступа');}
 async getResume(){throw new Error('Нет подтвержденных полномочий');}
 prepareResumeUpdate(text:string){return {mode:this.mode,text,url:'https://hh.ru/applicant/resumes',instructions:['Откройте свое резюме на hh.ru.','Сравните подготовленный текст с полями резюме.','Перенесите выбранные фрагменты вручную.','Проверьте даты, работодателей и образование перед сохранением.']};}
 validateResumeUpdate(){return {valid:false,reason:'Программная запись отключена'};}
 async publishResumeUpdate(){throw new Error('Публикация через API недоступна в этой сборке');}
}
export interface AIProvider {kind:'deterministic'|'self-hosted';}
export const aiPolicy={externalTransfer:false,hhDataTransfer:false,localInferenceConfigured:false};
