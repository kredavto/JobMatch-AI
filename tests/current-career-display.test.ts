import {it,expect} from 'vitest';
import {careerAdvice} from '../lib/i18n/career';
import {careerPlan,careerPlanText} from '../lib/career-coach';
it('covers all actual supported/unconfirmed advice paths without changing IDs, evidence, ranking or TXT',()=>{
 const facts=[{id:'f1',text:'SQL 🧑‍💻',source:'RAW источник',verified:true}],cases=[careerPlan(facts,'SQL'),careerPlan([],'SQL\nPython\nExcel\nБитрикс24\nCRM\nB2B\nуправление командой\nEnglish\nTypeScript')],seen=new Set<string>();
 for(const items of cases){const before=JSON.stringify(items),exported=careerPlanText(items);for(const item of items)for(const text of [...item.steps,...item.questions]){expect(careerAdvice(text,'ru')).toEqual({text,catalogued:true});const translated=careerAdvice(text,'en');expect(translated.catalogued).toBe(true);expect(translated.text).not.toBe(text);seen.add(text);}expect(JSON.stringify(items)).toBe(before);expect(careerPlanText(items)).toBe(exported);expect(exported).toContain('ПЛАН ПОДГОТОВКИ К ИНТЕРВЬЮ');}expect(seen.size).toBe(15);
});
it('preserves unknown future advice, including Unicode and quote-like text, without guessing',()=>{
 for(const text of ['Будущее правило 🧑‍💻\r\nNo 42%.','__proto__','<img src=x onerror=alert(1)>'])for(const locale of ['ru','en'] as const)expect(careerAdvice(text,locale)).toEqual({text,catalogued:false});
});
