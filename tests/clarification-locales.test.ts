import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import StructuredFactPanel from '../app/structured-fact-panel';
import {clarificationCopy} from '../lib/i18n/clarification';
import {renderStructuredFact} from '../app/structured-fact';
const props={ownerId:'11111111-1111-4111-8111-111111111111',revision:7,disabled:false,facts:[],onAdd:async()=>true};
describe('clarification UI locale boundary',()=>{
 it('keeps all fixed copy and error keys bilingual with manual/Russian-wording qualifications',()=>{expect(Object.keys(clarificationCopy.ru).sort()).toEqual(Object.keys(clarificationCopy.en).sort());expect(Object.keys(clarificationCopy.ru.errors).sort()).toEqual(Object.keys(clarificationCopy.en.errors).sort());expect(clarificationCopy.en.description).toContain('not AI rewriting');expect(clarificationCopy.en.literalHint).toContain('in Russian');expect(clarificationCopy.ru.literalHint).toContain('на русском языке');});
 it('renders default Russian and prepared English labels without changing scenario values',()=>{const ru=renderToStaticMarkup(createElement(StructuredFactPanel,props)),en=renderToStaticMarkup(createElement(StructuredFactPanel,{...props,locale:'en'}));expect(ru).toContain('Конструктор уточнения факта');expect(en).toContain('Fact clarification builder');expect(en).toContain('Details for one clarification');for(const html of [ru,en]){expect(html).toContain('value="episode"');expect(html).toContain('value="quantity"');expect(html).toContain('id="clarification-kind"');}});
 it('preserves blocked owner/limit/dirty guards in the localized initial view',()=>{for(const change of [{ownerId:undefined},{disabled:true},{facts:Array.from({length:500},()=>({text:'SQL'}))}]){const html=renderToStaticMarkup(createElement(StructuredFactPanel,{...props,...change,locale:'en'}));expect(html).toContain('<fieldset disabled');}expect(renderToStaticMarkup(createElement(StructuredFactPanel,{...props,facts:Array.from({length:500},()=>({text:'SQL'})),locale:'en'}))).toContain('500 facts');});
 it('retains the Russian v1 literal renderer for English user fields and nonpersonal scope',()=>{const result=renderStructuredFact({kind:'quantity',scope:'team',activity:'SQL reports 🚀',count:'12',unit:'reports',year:'2024'},'2026-11');expect(result.format).toBe('jobmatch-structured-clarification-v1');expect(result.text).toBe('Количественный результат команды. Действие или показатель: SQL reports 🚀. Количество: 12. Единица измерения: reports. Период учёта: 2024. Не использовать как личное достижение.');});
 it('retains v1 rejection of an invisible joiner rather than silently normalizing it',()=>{expect(()=>renderStructuredFact({kind:'quantity',scope:'team',activity:'SQL reports 🧑‍💻',count:'12',unit:'reports',year:'2024'},'2026-11')).toThrow();});

});
