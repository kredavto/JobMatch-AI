import {expect,it} from 'vitest';
import {prepareRewritePreview} from '../mvp/rewrite-preview';
// Synthetic adversarial candidates, not additional live generation. These tests
// document what lexical validation CANNOT certify rather than inflate accuracy.
const semanticChanges=[
 ['Команда подготовила отчёты.','Я подготовил отчёты.','team ownership'],
 ['Помогал руководителю проекта.','Руководил проектом.','seniority'],
 ['Работал над прототипом.','Запустил продукт в производство.','scope'],
 ['Подготовил 12 отчётов.','Управлял 12 сотрудниками.','units'],
 ['Снизил время обработки с 20 до 10 минут.','Снизил время обработки с 10 до 20 минут.','numeric roles'],
 ['Возможно, улучшил качество отчёта.','Улучшил качество отчёта.','uncertainty'],
 ['Проект выполнил отдел аналитики.','Проект выполнил отдел разработки.','organization'],
 ['Использовал SQL.','Использовал SQL и Kubernetes.','invented skill'],
 ['Делал отчёты для анализа продаж.','Увеличил продажи благодаря отчётам.','causal achievement'],
 ['Сейчас изучаю Docker.','Разрабатываю production-системы с Docker.','learning to experience'],
 ['В 2023 работал в Альфа, в 2024 в Бета.','В 2024 работал в Альфа, в 2023 в Бета.','date association'],
 ['Разработал модуль для учебного проекта.','Разработал модуль для коммерческого проекта.','project context'],
];
it.each(semanticChanges)('does not falsely certify semantic transformation: %s → %s (%s)',(before,after)=>{
 const preview=prepareRewritePreview([{id:'a',text:before}],{suggestions:[{sourceId:'a',sourceQuote:before,text:after}]});
 expect(preview.state).toBe('review');if(preview.state==='review'){expect(preview.draft.canAutoApply).toBe(false);expect(preview.draft.suggestions[0].semanticAssessment).toBe('not-performed');expect(preview.draft.suggestions[0].state).toBe('needs-human-review');}
});
it.each([
 ['Подготовил 12 отчётов.','Подготовил 120 отчётов.'],
 ['Не управлял командой.','Управлял командой.'],
 ['Снизил ошибки на 20%.','Снизил ошибки на 20.'],
 ['Работал с 2023 года.','Работал с 2022 года.'],
])('rejects detectable literal change: %s → %s',(before,after)=>{expect(prepareRewritePreview([{id:'a',text:before}],{suggestions:[{sourceId:'a',sourceQuote:before,text:after}]}).state).toBe('rejected');});
it('refuses exhausted lexical coverage rather than silently passing it',()=>{
 const text=Array.from({length:65},(_,i)=>i+' отчётов').join(', ');
 expect(prepareRewritePreview([{id:'a',text}],{suggestions:[{sourceId:'a',sourceQuote:text,text}]}).state).toBe('rejected');
});
