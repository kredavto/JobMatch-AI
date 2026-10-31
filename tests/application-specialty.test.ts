import {describe,it,expect} from 'vitest';
import {empty,type Application,type Workspace} from '../lib/db';
import {WorkspaceSchema} from '../lib/workspace-schema';
import {WorkspaceCommandSchema} from '../lib/workspace-command';
import {validSpecialty,specialtyLabel,specialtyKey,specialtyOptions} from '../lib/application-specialty';
import {acknowledgeSpecialty,validateSpecialtyWrite,sameSpecialtyValue,type SpecialtyDrafts} from '../lib/application-specialty-result';
import {specialtyBreakdown,specialtiesCsv,selectApplications,previousPeriod} from '../lib/analytics';
import {filterApplications} from '../lib/application-filter';

const owner='11111111-1111-4111-8111-111111111111';
const application=(id:string,specialty?:unknown,events:Application['events']=[]):Application=>({id,title:'SQL vacancy',note:'unchanged',status:'Планируется',created:'2026-10-31',events,...(specialty===undefined?{}:{specialty})});
const previous:Workspace={...empty(),ownerId:owner,revision:7,goal:'Unrelated current goal',applications:[application('a'),application('b','QA')]};
const acknowledgement=()=>({...previous,revision:8,applications:[{...previous.applications[0],specialty:'Analyst'},previous.applications[1]]});
const event=(status:string,date='2026-10-31')=>({status,date});

describe('explicit specialty label contract and legacy compatibility',()=>{
 it.each(['','SQL analyst','QA','qa','Аналитик данных','café','cafe\u0301','🧑‍💻','😀'.repeat(120)])('accepts an explicit literal label %j',label=>{
  expect(validSpecialty(label)).toBe(true);
  expect(WorkspaceCommandSchema.parse({action:'application',id:'a',status:'Планируется',note:'',specialty:label})).toHaveProperty('specialty',label);
 });
 it.each([null,3,{},[],true,'x'.repeat(121),'😀'.repeat(121),' QA','QA ','\u00a0QA','QA\ufeff','QA\nengineer','QA\tengineer','QA\u007f','QA\u009f','\ud800','\udfff'])('refuses new malformed labels %j',label=>{
  expect(validSpecialty(label)).toBe(false);
  expect(WorkspaceCommandSchema.safeParse({action:'application',id:'a',status:'Планируется',note:'',specialty:label}).success).toBe(false);
 });
 it.each([null,42,{legacy:['opaque']},' old ',['x']])('preserves old unknown values in workspace round trips, without classifying %j',value=>{
  const state={...previous,applications:[application('a',value)]};
  expect(WorkspaceSchema.parse(state)).toEqual(state);
  expect(specialtyLabel(state.applications[0])).toBe(null);
  expect(specialtyKey(state.applications[0])).toBe('unclassified');
 });
 it('keeps omission and explicit clearing distinct and never infers a label from goal/title',()=>{
  const command=WorkspaceCommandSchema.parse({action:'application',id:'a',status:'Планируется',note:''});
  expect(Object.hasOwn(command,'specialty')).toBe(false);
  expect(WorkspaceCommandSchema.parse({...command,specialty:''})).toHaveProperty('specialty','');
  expect(specialtyLabel(previous.applications[0])).toBe(null);
  expect(specialtyOptions([application('a','unclassified'),application('b'),application('c','QA'),application('d','qa')])).toEqual({labels:['QA','qa','unclassified'],unclassified:true});
 });
});

describe('owner/revision/state-bound specialty acknowledgement',()=>{
 it('accepts exactly one explicit label while preserving source, notes, lifecycle and other rows',()=>{
  expect(validateSpecialtyWrite(acknowledgement(),previous,'a','Analyst')).toEqual(acknowledgement());
  const old=JSON.stringify(previous);validateSpecialtyWrite(acknowledgement(),previous,'a','Analyst');expect(JSON.stringify(previous)).toBe(old);
 });
 it.each([
  (s:Workspace)=>{s.ownerId='22222222-2222-4222-8222-222222222222';},
  (s:Workspace)=>{delete s.ownerId;},
  (s:Workspace)=>{s.revision=7;},(s:Workspace)=>{s.revision=9;},
  (s:Workspace)=>{s.applications[0].specialty='unexpected';},
  (s:Workspace)=>{delete s.applications[0].specialty;},
  (s:Workspace)=>{s.applications[0].title='Changed';},
  (s:Workspace)=>{s.applications[0].note='Changed';},
  (s:Workspace)=>{s.applications[0].status='Отказ';},
  (s:Workspace)=>{s.applications[0].events=[event('Оффер')];},
  (s:Workspace)=>{s.applications[0].resumeVersionId='other';},
  (s:Workspace)=>{s.applications[1].specialty='Changed';},
  (s:Workspace)=>{s.applications.reverse();},
  (s:Workspace)=>{s.applications.push(application('c'));},
  (s:Workspace)=>{s.goal='Changed';},(s:Workspace)=>{s.facts=[];s.original='Changed';},
 ])('rejects an unrelated or ambiguous server result %#',change=>{
  const saved=structuredClone(acknowledgement());change(saved);expect(()=>validateSpecialtyWrite(saved,previous,'a','Analyst')).toThrow();
 });
 it('requires a known owner and a unique selected row before accepting',()=>{
  expect(()=>validateSpecialtyWrite(acknowledgement(),{...previous,ownerId:undefined},'a','Analyst')).toThrow();
  expect(()=>validateSpecialtyWrite(acknowledgement(),previous,'missing','Analyst')).toThrow();
  expect(()=>validateSpecialtyWrite(acknowledgement(),previous,'a',' bad ')).toThrow();
  expect(()=>validateSpecialtyWrite(acknowledgement(),{...previous,applications:[previous.applications[0],previous.applications[0]]},'a','Analyst')).toThrow();
 });
 it('compares unknown JSON metadata independently of object-key ordering',()=>{
  const before={...previous,applications:[{...previous.applications[0],opaque:{a:1,b:[2,3]}}]};
  const saved={...before,revision:8,applications:[{...before.applications[0],specialty:'Analyst',opaque:{b:[2,3],a:1}}]};
  expect(validateSpecialtyWrite(saved,before,'a','Analyst')).toEqual(saved);
 });
 it('handles deeply nested legacy JSON without recursive stack failure',()=>{
  let left:unknown='old',right:unknown='old';for(let i=0;i<10000;i++){left={nested:left};right={nested:right};}
  expect(sameSpecialtyValue(left,right)).toBe(true);expect(sameSpecialtyValue(left,{nested:'different'})).toBe(false);
 });
 it('refuses comparison exceptions without leaking arbitrary getter errors',()=>{
  const value={get legacy(){throw Error('PRIVATE metadata diagnostic');}};
  expect(sameSpecialtyValue(value,{legacy:1})).toBe(false);
 });
});

describe('late acknowledgement and newer editing contexts',()=>{
 const submitted={base:undefined,text:'Analyst'};
 it('clears only the acknowledged draft',()=>expect(acknowledgeSpecialty({a:submitted,b:{base:'QA',text:'Dev'}},'a',submitted,'Analyst','Analyst')).toEqual({b:{base:'QA',text:'Dev'}}));
 it('preserves newer typing and advances its saved base',()=>expect(acknowledgeSpecialty({a:{...submitted,text:'Newer'}},'a',submitted,'Analyst','Analyst')).toEqual({a:{base:'Analyst',text:'Newer'}}));
 it.each([undefined,'Other',null])('does not clear a missing or incorrect acknowledgement %j',saved=>{
  const drafts={a:submitted};expect(acknowledgeSpecialty(drafts,'a',submitted,'Analyst',saved)).toBe(drafts);
 });
 it('does not touch a different base, cancelled context, or different submitted text',()=>{
  const drafts:SpecialtyDrafts={a:{base:{legacy:true},text:'Analyst'}};
  expect(acknowledgeSpecialty(drafts,'a',submitted,'Analyst','Analyst')).toBe(drafts);
  expect(acknowledgeSpecialty({},'a',submitted,'Analyst','Analyst')).toEqual({});
  expect(acknowledgeSpecialty(drafts,'a',drafts.a,'Other','Other')).toBe(drafts);
 });
});

describe('observed outcomes by current literal specialty',()=>{
 it('keeps planned and unclassified observations, deduplicates recorded statuses, and never invents funnel stages',()=>{
  const rows=[application('a','QA',[event('Планируется')]),application('b','QA',[event('Оффер'),event('Оффер')]),application('c','QA',[event('Отказ')]),application('d',undefined,[event('Просмотрено')]),application('e',{legacy:true},[event('Приглашение','bad')])];
  const original=structuredClone(rows),groups=specialtyBreakdown(rows);
  expect(groups).toEqual([
   {key:'label:QA',label:'QA',total:3,sent:2,responses:2,interviews:1,responseRate:100,interviewRate:50,invited:0,offers:1},
   {key:'unclassified',label:null,total:2,sent:1,responses:0,interviews:0,responseRate:0,interviewRate:0,invited:0,offers:0},
  ]);expect(rows).toEqual(original);
 });
 it('uses null rates for groups without recorded submissions, and returns no fabricated empty groups',()=>{
  expect(specialtyBreakdown([])).toEqual([]);expect(specialtyBreakdown([application('a','QA')])[0]).toMatchObject({sent:0,responseRate:null,interviewRate:null});
 });
 it('separates case, Unicode normalization forms and real labels resembling filter sentinels',()=>{
  const rows=['QA','qa','café','cafe\u0301','unclassified','label:QA'].map((label,i)=>application(String(i),label));
  const groups=specialtyBreakdown([...rows,application('missing')]);expect(groups).toHaveLength(7);
  expect(selectApplications(rows,{from:'',to:'',versionId:'',specialty:'label:unclassified'})).toEqual([rows[4]]);
  expect(selectApplications([...rows,application('missing')],{from:'',to:'',versionId:'',specialty:'unclassified'})).toEqual([application('missing')]);
 });
 it('combines specialty/date/version filters and carries the same specialty into the prior period',()=>{
  const rows=[{...application('a','QA',[event('Отклик отправлен','2026-10-10')]),resumeVersionId:'v1'},application('b','QA',[event('Отклик отправлен','2026-10-10')]),{...application('c','Dev',[event('Отклик отправлен','2026-10-10')]),resumeVersionId:'v1'}];
  const filter={from:'2026-10-01',to:'2026-10-31',versionId:'v1',specialty:'label:QA'};
  expect(selectApplications(rows,filter)).toEqual([rows[0]]);expect(previousPeriod(filter)?.specialty).toBe('label:QA');
  expect(selectApplications(rows,{...filter,specialty:'label:missing'})).toEqual([]);
 });
 it('includes saved labels in tracker search without changing their classification',()=>{
  const row=application('a','Аналитик ё');expect(filterApplications([row],{query:'аналитик е',status:'',version:''})).toEqual([row]);expect(specialtyLabel(row)).toBe('Аналитик ё');
 });
 it('exports explicit counts/denominators and protects formula-like labels with quotes and Unicode',()=>{
  const rows=specialtyBreakdown([application('a','=SYNTHETIC("Я")',[event('Приглашение')]),application('b')]);
  const csv=specialtiesCsv(rows,['label','total','sent','invited','interviews','offers','responses','response rate','interview rate'],'Unclassified');
  expect(csv).toContain('"\'=SYNTHETIC(""Я"")","1","1","1","0","0","1","100","0"');
  expect(csv).toContain('"Unclassified","1","0","0","0","0","0","",""');expect(csv.startsWith('\ufeff')).toBe(true);
 });
});
