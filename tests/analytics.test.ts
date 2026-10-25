import {describe,it,expect} from 'vitest';
import {applicationsCsv,filterError,firstSentDate,previousPeriod,selectApplications,summarize,versionBreakdown} from '../lib/analytics';
import type {Application} from '../lib/db';
const row=(id:string,events:Application['events'],version?:string):Application=>({id,title:id,status:'Планируется',note:'',created:'2026-01-01T00:00:00Z',events,resumeVersionId:version});
const event=(status:string,date:string)=>({status,date});
const all={from:'',to:'',versionId:''};
describe('application analytics',()=>{
 it('counts unique applications from history, excluding views from responses',()=>{
  const rows=[row('one',[event('Отклик отправлен','2026-10-01'),event('Приглашение','2026-10-03'),event('Приглашение','2026-10-04'),event('Интервью','2026-10-05')]),row('two',[event('Просмотрено','2026-10-02')]),row('plan',[event('Планируется','2026-10-02')])];
  expect(summarize(rows)).toEqual({total:3,sent:2,responses:1,interviews:1,responseRate:50,interviewRate:50});
 });
 it('uses first nonplanned event, sorted by instant and normalized to UTC',()=>{
  const app=row('one',[event('Интервью','2026-10-05T12:00:00Z'),event('Отклик отправлен','2026-10-02T00:30:00+03:00')]);
  expect(firstSentDate(app)).toBe('2026-10-01T21:30:00.000Z');
  expect(selectApplications([app],{...all,from:'2026-10-01',to:'2026-10-01'})).toEqual([app]);
  expect(selectApplications([app],{...all,from:'2026-10-02'})).toEqual([]);
 });
 it('outcomes after cohort end count and planned applications appear only without dates',()=>{
  const app=row('one',[event('Отклик отправлен','2026-09-01'),event('Оффер','2026-10-12')]),planned=row('plan',[]);
  expect(selectApplications([app,planned],all)).toHaveLength(2);
  const rows=selectApplications([app,planned],{...all,from:'2026-09-01',to:'2026-09-30'});
  expect(summarize(rows).interviewRate).toBe(100);
 });
 it('handles zero denominators, malformed dates and unknown events conservatively',()=>{
  expect(summarize([row('bad',[event('Отклик отправлен','invalid'),event('Произвольный статус','2026-10-01')])]).responseRate).toBeNull();
  expect(filterError({...all,from:'2026-02-30'})).toBe('invalid');
  expect(filterError({...all,from:'2026-10-02',to:'2026-10-01'})).toBe('reversed');
  expect(selectApplications([row('a',[])],{...all,to:'bad'})).toEqual([]);
 });
 it('compares equal inclusive UTC periods across a leap day',()=>{
  expect(previousPeriod({...all,from:'2024-03-01',to:'2024-03-02',versionId:'v1'})).toEqual({from:'2024-02-28',to:'2024-02-29',versionId:'v1'});
  expect(previousPeriod({...all,from:'2024-03-01'})).toBeNull();
 });
 it('filters by current version and groups unlinked records',()=>{
  const a=row('a',[event('Отклик отправлен','2026-10-01')],'v1'),b=row('b',[event('Отказ','2026-10-02')]);
  expect(selectApplications([a,b],{...all,versionId:'unlinked'})).toEqual([b]);
  expect(selectApplications([a,b],{...all,versionId:'v1'})).toEqual([a]);
  expect(versionBreakdown([a,b]).map(g=>[g.versionId,g.sent,g.responses])).toEqual([['v1',1,0],['',1,1]]);
 });
 it('exports only supplied rows and neutralizes spreadsheet formula prefixes',()=>{
  const csv=applicationsCsv([row('  =HYPERLINK("test")',[])],['Title','Status','Created','Sent','Version']);
  expect(csv).toContain('"\'  =HYPERLINK(""test"")"');
  expect(csv.startsWith('\ufeff')).toBe(true);
  expect(csv.split('\r\n')).toHaveLength(2);
 });
});
