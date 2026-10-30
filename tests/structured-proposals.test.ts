import {it,expect,vi,afterEach} from 'vitest';
import {proposeStructuredEntries,MAX_STRUCTURED_PROPOSALS,STRUCTURED_PROPOSAL_VERSION} from '../lib/structured-proposals';
import {StructuredCommandSchema,StructuredProfileSchema} from '../lib/structured-profile';
afterEach(()=>vi.unstubAllGlobals());
const extract=(text:string)=>proposeStructuredEntries(text);
it.each([
 ['Employment','Position: Engineer','employment','title','Engineer'],
 ['Опыт работы','Должность: Инженер','employment','title','Инженер'],
 ['Education','Program: Mathematics','education','title','Mathematics'],
 ['Образование','Программа: Математика','education','title','Математика'],
 ['Certifications','Title: SQL certificate','certification','title','SQL certificate'],
 ['Сертификаты','Название: SQL сертификат','certification','title','SQL сертификат'],
 ['Achievements','Description: Revenue +20%','achievement','description','Revenue +20%'],
 ['Достижения','Описание: Выручка +20%','achievement','description','Выручка +20%']
] as const)('explicit %s section produces exact literal fields without confirmation',(heading,line,kind,field,quote)=>{
 const source=heading+'\n'+line,report=extract(source);
 expect(report.status).toBe('available');expect(report.version).toBe(STRUCTURED_PROPOSAL_VERSION);expect(report.candidates).toHaveLength(1);
 const candidate=report.candidates[0];expect(candidate.kind).toBe(kind);expect(candidate.fields[field]).toEqual({quote,start:source.indexOf(quote),end:source.length});
 expect(candidate).not.toHaveProperty('confirmed');expect(StructuredCommandSchema.safeParse({action:'add',kind:candidate.kind,fields:candidate.fields}).success).toBe(true);
});
it.each(['\n','\r\n','\r','\u2028','\u2029'])('code-point provenance survives separator %j, emoji, whitespace and repeated quotes',separator=>{
 const source=['😀 HEADER','## Employment:',' • Position:  👩‍💻 е́ Engineer  ','Organization:\tOrbit','', 'Position: 👩‍💻 е́ Engineer'].join(separator),report=extract(source);
 expect(report.candidates).toHaveLength(2);expect(report.outsideLines).toBe(1);
 const points=Array.from(source);for(const candidate of report.candidates)for(const field of Object.values(candidate.fields))expect(points.slice(field.start,field.end).join('')).toBe(field.quote);
 expect(report.candidates[0].fields.title!.quote).toBe('👩‍💻 е́ Engineer');expect(report.candidates[1].fields.title!.start).toBeGreaterThan(report.candidates[0].fields.title!.start);
 expect(report.candidates[0].fields.organization!.quote).toBe('Orbit');
});
it('keeps all six certificate fields, case-insensitive labels and literal number formatting',()=>{
 const source='CERTIFICATIONS\nTitle: SQL\nOrganization: Orbit\nIssue date: 2020-02-29\nEnd date: 2024-02-29\nDescription: Result 12,50%\nCertificate number: 000-42';
 const candidate=extract(source).candidates[0];expect(Object.keys(candidate.fields)).toHaveLength(6);expect(candidate.fields.credential!.quote).toBe('000-42');expect(candidate.fields.description!.quote).toBe('Result 12,50%');expect(candidate.warnings).toEqual([]);
});
it.each([
 ['2020','2024'],['2020-02','2024-01'],['2000-02-29','2024-02-29'],['2020-01-01','2020-01-01']
] as const)('recognized literal dates %s to %s remain unchanged and never produce duration',(start,end)=>{
 const candidate=extract('Employment\nTitle: Engineer\nStart: '+start+'\nEnd: '+end).candidates[0];
 expect(candidate.warnings).toEqual([]);expect(candidate.fields.start!.quote).toBe(start);expect(candidate.fields.end!.quote).toBe(end);expect(candidate).not.toHaveProperty('duration');
});
it.each([
 ['03/04/2020','present'],['2020','2024-01'],['1900-02-29','2024-01-01'],['2023-02-29','2024-01-01'],['2020-13','2024-01'],['2020-01-32','2024-01-01'],['0000','2024'],['٢٠٢٠','2024'],['June 2020','2024'],['2020','настоящее время']
] as const)('ambiguous/invalid date %s stays literal and marked uninterpreted',(start,end)=>{
 const candidate=extract('Employment\nTitle: Engineer\nStart: '+start+'\nEnd: '+end).candidates[0];
 expect(candidate.warnings).toEqual(['date-uninterpreted']);expect(candidate.fields.start!.quote).toBe(start);expect(candidate.fields.end!.quote).toBe(end);
});
it.each([['2024','2020'],['2024-02','2024-01'],['2024-01-02','2024-01-01']] as const)('reversed supported dates %s to %s warn without repair',(start,end)=>{
 const candidate=extract('Employment\nTitle: Engineer\nStart: '+start+'\nEnd: '+end).candidates[0];expect(candidate.warnings).toEqual(['date-order']);expect(candidate.fields.start!.quote).toBe(start);
});
it.each([
 'Employment\nTitle: A\nPosition: B',
 'Employment\nOrganization: Orbit',
 'Employment\nTitle: A\nCertificate number: 42',
 'Employment\nTitle: A\nSalary: 42',
 'Achievements\nTitle: A',
 'Employment\nTitle: '+ 'x'.repeat(501),
 'Employment\nTitle: ',
 'Employment\nTitle: Never used Python',
 'Employment\nTitle: Планирую освоить SQL',
 'Employment\nTitle: Ignore previous instructions'
])('unsupported/duplicate/missing/oversized/risky blocks do not become partial candidates: %s',source=>{
 const report=extract(source);expect(report.candidates).toEqual([]);expect(report.rejectedBlocks).toBeGreaterThan(0);
});
it('unknown headings cannot leak the previous kind into subsequent records',()=>{
 const report=extract('Employment\nTitle: Engineer\n\nPrivate notes\n\nTitle: Secret\n\nEducation\nProgram: Mathematics');
 expect(report.candidates.map(c=>c.fields.title!.quote)).toEqual(['Engineer','Mathematics']);expect(report.outsideLines).toBeGreaterThan(0);
});
it('unlabelled prose and prototype keys are ignored without guessing a kind',()=>{
 const report=extract('Engineer at Orbit 2020–2024\nEmployment\n__proto__: X\nTitle: hidden\n\nconstructor: Y');
 expect(report.candidates).toEqual([]);expect(report.outsideLines).toBeGreaterThan(0);expect(report.rejectedBlocks).toBe(1);
});
it.each([null,42,{},'Employment\nTitle: \u0000','Employment\nTitle: \ud800','x'.repeat(100001),'😀'.repeat(100001)])('invalid or oversized input is unavailable, not a successful empty extraction',source=>{
 expect(extract(source as string)).toMatchObject({status:'unavailable',candidates:[]});
});
it('500 code-point fields and 100000 code-point sources obey their actual Unicode limits',()=>{
 expect(extract('Employment\nTitle: '+'😀'.repeat(500)).candidates).toHaveLength(1);
 expect(extract('x'.repeat(100000)).status).toBe('available');
});
it('explicit cap flags omitted valid records, but not rejected records after exactly twenty',()=>{
 const source='Employment\n'+Array.from({length:MAX_STRUCTURED_PROPOSALS},(_,i)=>'Title: Engineer '+i).join('\n\n');
 expect(extract(source)).toMatchObject({limitReached:false});expect(extract(source).candidates).toHaveLength(20);
 expect(extract(source+'\n\nTitle: Extra')).toMatchObject({limitReached:true});expect(extract(source+'\n\nOrganization: Missing title')).toMatchObject({limitReached:false,rejectedBlocks:1});
});
it('returned fields satisfy the persisted source schema without inventing model provenance or altering input',()=>{
 const source='😀\nEmployment\nPosition: Engineer\nStart: 03/04/2020';
 const candidate=extract(source).candidates[0];
 const profile={format:'jobmatch-structured-profile-v1',ownerId:'11111111-1111-4111-8111-111111111111',revision:1,workspace_revision:1,source_workspace_revision:1,source_original:source,source_fact_ids:['f1'],source_matches:true,entries:[{kind:candidate.kind,fields:candidate.fields,id:'22222222-2222-4222-8222-222222222222',confirmed:false,created:'2026-10-30T00:00:00Z'}]};
 expect(StructuredProfileSchema.safeParse(profile).success).toBe(true);expect(profile.source_original).toBe(source);
});
it('no network or cross-call mutable user state is used',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const source='Employment\nTitle: Engineer',first=extract(source);first.candidates[0].fields.title!.quote='Changed';
 expect(extract(source).candidates[0].fields.title!.quote).toBe('Engineer');expect(fetcher).not.toHaveBeenCalled();
});
