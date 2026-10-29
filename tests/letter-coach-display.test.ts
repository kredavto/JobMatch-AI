import {it,expect} from 'vitest';
import {careerAdvice,letterFailure,letterCoachCopy} from '../lib/i18n/letter-coach';
import {careerPlan,careerPlanText} from '../lib/career-coach';
import {composeLetter,letterStyles,type LetterStyle} from '../lib/cover-letter';
const facts=[{id:'f1',text:'SQL',source:'SYNTHETIC fixture',verified:true}];
it('maps errors thrown by actual letter gates and redacts unknown exception text',()=>{
 const cases:[()=>unknown,string][]=[
  [()=>composeLetter(facts,'SQL',['edit-f1'],'invalid' as LetterStyle),'style'],
  [()=>composeLetter(facts,'',['edit-f1'],'brief'),'vacancy'],
  [()=>composeLetter(facts,'SQL',[],'brief'),'selection'],
  [()=>composeLetter(facts,'SQL',['invented'],'brief'),'evidence']
 ];
 for(const [run,key] of cases){let caught:unknown;try{run();}catch(error){caught=error;}expect(caught).toBeInstanceOf(Error);expect(letterFailure(caught)).toBe(key);}
 expect(letterFailure(new Error('PRIVATE_RAW'))).toBe('failed');expect(letterFailure('PRIVATE_RAW')).toBe('failed');
});
it('keeps style IDs, literal letter text and evidence unchanged by UI locale',()=>{
 const draft=composeLetter(facts,'SQL',['edit-f1'],'brief'),before=JSON.stringify(draft);
 for(const locale of ['ru','en'] as const){expect(Object.keys(letterCoachCopy[locale].letter.styles)).toEqual(Object.keys(letterStyles));expect(letterCoachCopy[locale].letter.template.length).toBeGreaterThan(20);}
 expect(draft.text).toContain('\n\nSQL\n\n');expect(draft.text).toContain('Здравствуйте!');expect(draft.evidence_ids).toEqual(['f1']);expect(JSON.stringify(draft)).toBe(before);
});
it('covers current rule advice from actual supported and unconfirmed plans without changing their exports',()=>{
 const cases=[careerPlan(facts,'SQL'),careerPlan([],'SQL\nPython\nExcel\nБитрикс24\nCRM\nB2B\nуправление командой\nEnglish\nTypeScript')];
 const seen=new Set<string>();
 for(const items of cases){
  const before=JSON.stringify(items),exported=careerPlanText(items);
  for(const item of items)for(const text of [...item.steps,...item.questions]){const copy=careerAdvice(text,'en');expect(copy.catalogued).toBe(true);expect(copy.text).not.toBe(text);seen.add(text);}
  expect(JSON.stringify(items)).toBe(before);expect(careerPlanText(items)).toBe(exported);expect(exported).toContain('ПЛАН ПОДГОТОВКИ К ИНТЕРВЬЮ');
 }
 expect(seen.size).toBe(15);
});
it('preserves unknown future advice verbatim instead of guessing its meaning',()=>{
 expect(careerAdvice('Будущее правило 😀','en')).toEqual({text:'Будущее правило 😀',catalogued:false});
});
