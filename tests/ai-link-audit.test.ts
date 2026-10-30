import {it,expect,vi,afterEach} from 'vitest';
import {auditAiLinks,summarizeAiLinkAudit,AI_LINK_AUDIT_VERSION,AI_LINK_SIGNALS} from '../lib/ai-link-audit';
import type {Fact} from '../lib/engine';
const fact=(text:string,id='f1',verified=true):Fact=>({id,text,verified,source:'SENSITIVE_SOURCE'});
function audit(quote:string,texts:readonly string[],ids=texts.map((_,i)=>'f'+(i+1))){return auditAiLinks({requirements:[{quote,evidence_ids:ids}]},texts.map((text,i)=>fact(text,'f'+(i+1))),quote);}
const signals=(quote:string,texts:readonly string[])=>audit(quote,texts).links[0]?.signals??[];
afterEach(()=>vi.unstubAllGlobals());
it.each([
 ['Python',['SQL']],['Python and SQL',['Python']],['SQL',['PostgreSQL']]
] as const)('flags limited literal coverage for %s without asserting the skill is absent',(quote,texts)=>{
 const result=audit(quote,texts);expect(result.status).toBe('available');expect(result.semanticAssessment).toBe('not-performed');
 expect(result.links[0]).toMatchObject({status:'warning'});expect(result.links[0].signals).toContain('literal-gap');
});
it.each([['Python',['питон']],['Битрикс24',['Bitrix24']],['B2B',['корпоративные продажи']],['SQL',['SQL 😀 42%']]] as const)('literal alias coverage for %s never becomes qualification',(quote,texts)=>{
 const result=audit(quote,texts);expect(result.links[0]).toEqual({index:0,status:'no-rule-warning',signals:[]});expect(result.semanticAssessment).toBe('not-performed');
});
it.each([
 ['At least 5 years of Python experience',['2 years of Python experience']],
 ['Опыт Python от 5 лет',['Опыт Python 2 года']],
 ['Revenue growth of 30%',['Revenue growth of 10%']],
 ['Рост выручки на 30%',['Рост выручки на 10%']],
 ['Python at most 5 years',['Python 6 years']],
 ['Python не более 5 лет',['Python 6 лет']],
 ['Python more than 5 years',['Python 5 years']],
 ['Python less than 5 years',['Python 5 years']],
 ['Python 5 years',['Python 6 years']]
] as const)('flags the explicit supported quantity predicate for %s',(quote,texts)=>expect(signals(quote,texts)).toContain('quantity-difference'));
it.each([
 ['At least 5 years of Python experience',['6 years of Python experience']],
 ['Опыт Python от 5 лет',['Опыт Python 5 лет']],
 ['Python at most 5 years',['Python 5 years']],
 ['Python не более 5 лет',['Python 4 года']],
 ['Python не менее 5 лет',['Python 6 лет']],
 ['Python less than 5 years',['Python 4 years']],
 ['Python at least 5,5 years',['Python 5.75 years']],
 ['Revenue growth of 30%',['Revenue growth of 30%']]
] as const)('no quantity warning remains limited and does not prove meaning: %s',(quote,texts)=>{
 const result=audit(quote,texts);expect(result.links[0].signals).not.toContain('quantity-difference');expect(result.semanticAssessment).toBe('not-performed');
});
it.each([
 ['Python experience of 5–7 years',['Python 6 years']],
 ['Python about 5 years',['Python 6 years']],
 ['Python at least 5 years',['Python 2 years','Python 6 years']],
 ['Python at least 5 years',['Python 5–7 years']],
 ['Python at least 5 years',['Python 2024 года']],
 ['Python at least 5 years',['Python at least 6 years']],
 ['Python experience of 8 quarters',['Python 6 months']],
 ['Python ٥ years',['Python 6 years']],
 ['Revenue 1,000%',['Revenue 20%']],
 ['Revenue 1e3%',['Revenue 20%']],
 ['Python -5 years',['Python 6 years']],
 ['Python 5 years and revenue 30%',['Python 6 years']],
 ['At least 5 years of Python experience',['SQL 2 years']]
] as const)('marks unsupported/ambiguous quantities unknown for %s',(quote,texts)=>{
 const list=signals(quote,texts);expect(list).toContain('quantity-unknown');expect(list).not.toContain('quantity-difference');
});
it.each([['English C1',['English B1']],['Английский C1',['Английский B1']]] as const)('flags only explicit adjacent English-level labels %s',(quote,texts)=>expect(signals(quote,texts)).toContain('level-below'));
it.each([['English C1',['English C2']],['Английский B2',['Английский B2']]] as const)('higher/equal level has no level warning, not an approval: %s',(quote,texts)=>expect(signals(quote,texts)).not.toContain('level-below'));
it.each([['English C1 or B2',['English B1']],['English C1',['English B1','English C2']],['French C1',['French A2']],['English at least C1',['English B1']]] as const)('ambiguous/unrecognised level construction stays unknown: %s',(quote,texts)=>{
 const list=signals(quote,texts);expect(list).toContain('level-unknown');expect(list).not.toContain('level-below');
});
it('compound statements remain unassessed even when their known terms are present',()=>{
 const result=audit('Python and SQL',['Python','SQL']);expect(result.links[0]).toMatchObject({status:'unknown'});expect(result.links[0].signals).toContain('coverage-unavailable');
 const none=audit('Python',[],[]);expect(none.links[0]).toEqual({index:0,status:'unknown',signals:['no-linked-facts']});
});
it('validation failures are unavailable rather than successful zero warnings',()=>{
 const valid={requirements:[{quote:'Python',evidence_ids:['f1']}]};
 for(const [review,facts,vacancy] of [
  [valid,[fact('Python','f1',false)],'Python'],
  [valid,[fact('Python'),fact('Python')],'Python'],
  [valid,[fact('Never used Python')],'Python'],
  [valid,[fact('x'.repeat(2001))],'Python'],
  [valid,Array.from({length:501},(_,i)=>fact('Python','f'+i)),'Python'],
  [valid,[fact('Python')],'SQL'],
  [{requirements:[{quote:'Python',evidence_ids:['foreign']}]},[fact('Python')],'Python']
 ] as const){const result=auditAiLinks(review,facts as readonly Fact[],vacancy);expect(result.status).toBe('unavailable');expect(summarizeAiLinkAudit(result)).toMatchObject({links:null,notes:null,warningLinks:null,signalCounts:null});}
});
it('eligible duplicate lookup cannot substitute a later unverified fact with the same ID',()=>{
 const result=auditAiLinks({requirements:[{quote:'Python',evidence_ids:['f1']}]},[fact('Python'),fact('SQL','f1',false)],'Python');
 expect(result.links[0].signals).not.toContain('literal-gap');
});
it('audits are immutable, bounded to safe code summaries and do not fetch',()=>{
 const facts=Object.freeze([Object.freeze(fact('SENSITIVE_TEXT Python 2 years'))]);
 const review=Object.freeze({requirements:Object.freeze([Object.freeze({quote:'At least 5 years of Python experience',evidence_ids:Object.freeze(['f1'])})])});
 const before=JSON.stringify({facts,review}),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const result=auditAiLinks(review,facts,'At least 5 years of Python experience'),summary=summarizeAiLinkAudit(result);
 expect(JSON.stringify({facts,review})).toBe(before);expect(fetcher).not.toHaveBeenCalled();
 expect(summary.version).toBe(AI_LINK_AUDIT_VERSION);expect(summary.semanticAssessment).toBe('not-performed');
 expect(Object.keys(summary.signalCounts??{})).toEqual([...AI_LINK_SIGNALS]);expect(JSON.stringify(summary)).not.toMatch(/SENSITIVE|At least|f1|quote/);
 expect(summary.warningLinks).toBe(1);expect(summary.notes).toHaveLength(1);
});

it.each(['Python not more than 5 years','Python not less than 5 years','Python not at least 5 years','Python not at most 5 years'])('upstream negation guard stays unavailable instead of being bypassed: %s',quote=>{
 const result=audit(quote,['Python 6 years']);expect(result.status).toBe('unavailable');expect(summarizeAiLinkAudit(result).warningLinks).toBeNull();
});
