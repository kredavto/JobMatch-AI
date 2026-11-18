import {expect,it} from 'vitest';
import {reviewRewriteDraft} from '../mvp/rewrite-draft';
const facts=[{id:'a',text:'Команда подготовила 12 SQL отчётов за 2024 год.'},{id:'b',text:'Не руководил отделом.'}];
const suggestion=(text:string)=>({suggestions:[{sourceId:'a',sourceQuote:facts[0].text,text}]});
it('retains source and omitted facts; a plausible rewrite still needs human review',()=>{
 const draft=reviewRewriteDraft(facts,suggestion('За 2024 год команда подготовила 12 SQL отчётов.'));
 expect(draft.source).toEqual(facts);expect(draft.unmodifiedIds).toEqual(['b']);expect(draft.canAutoApply).toBe(false);expect(draft.suggestions[0].state).toBe('needs-human-review');
});
it.each(['Команда подготовила 120 SQL отчётов за 2024 год.','Команда подготовила SQL отчёты за 2024 год.','Команда не подготовила 12 SQL отчётов за 2024 год.'])('rejects detectable number or negation changes: %s',text=>{expect(()=>reviewRewriteDraft(facts,suggestion(text))).toThrow('FACT_MARKER_CHANGED');});
it('rejects dropping source negation',()=>{expect(()=>reviewRewriteDraft(facts,{suggestions:[{sourceId:'b',sourceQuote:facts[1].text,text:'Руководил отделом.'}]})).toThrow('FACT_MARKER_CHANGED');});
it.each([{sourceId:'unknown',sourceQuote:facts[0].text,text:'Текст'},{sourceId:'a',sourceQuote:'Выдуманная цитата',text:'Текст'}])('rejects unknown or altered provenance',row=>{expect(()=>reviewRewriteDraft(facts,{suggestions:[row]})).toThrow('INVALID_SOURCE_REFERENCE');});
it('rejects duplicate references and unbounded/extra model fields',()=>{const row=suggestion(facts[0].text).suggestions[0];expect(()=>reviewRewriteDraft(facts,{suggestions:[row,row]})).toThrow();expect(()=>reviewRewriteDraft(facts,{suggestions:[{...row,verified:true}]})).toThrow();expect(()=>reviewRewriteDraft(facts,suggestion('x'.repeat(2001)))).toThrow();});
it('does NOT claim to detect team-to-personal or other semantic changes',()=>{
 const draft=reviewRewriteDraft(facts,suggestion('Лично подготовил 12 SQL отчётов за 2024 год и управлял отделом.'));
 expect(draft.state).toBe('unverified-draft');expect(draft.canAutoApply).toBe(false);expect(draft.suggestions[0].semanticAssessment).toBe('not-performed');
});
it('does not confuse same numeric tokens with unchanged units',()=>{
 const draft=reviewRewriteDraft([{id:'a',text:'Подготовил 12 отчётов.'}],{suggestions:[{sourceId:'a',sourceQuote:'Подготовил 12 отчётов.',text:'Управлял 12 сотрудниками.'}]});
 expect(draft.canAutoApply).toBe(false);expect(draft.suggestions[0].state).toBe('needs-human-review');
});

it('reviews the single live Groq synthetic response without auto-applying it',async()=>{
 const fixture=await import('./fixtures/rewrite-live-synthetic-20261118.json');
 const source=fixture.output.suggestions.map(row=>({id:row.sourceId,text:row.sourceQuote}));
 const result=reviewRewriteDraft(source,fixture.output);
 expect(result.suggestions).toHaveLength(3);expect(result.canAutoApply).toBe(false);
 expect(result.suggestions[0].text).toContain('команда подготовила 12 отчётов в 2024 году');
 expect(result.suggestions[1].text).toContain('Не руководил отделом');
 expect(result.suggestions[2].text).toBe(source[2].text);
});
