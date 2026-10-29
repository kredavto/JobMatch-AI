import {it,expect} from 'vitest';
import type {Application} from '../lib/db';
import {firstSentDate,firstSentRecordedValue,recordedEventTime,validRecordedEventDate,unplacedApplications,selectApplications,summarize,applicationsCsv} from '../lib/analytics';
import {monthlyResults} from '../lib/analytics-timeline';
import {analyticsRu,analyticsEn} from '../lib/i18n/analytics';
const app=(id:string,events:Application['events'],versionId='v1'):Application=>({id,title:id,note:'',status:'Отклик отправлен',created:'2026-10-01',resumeVersionId:versionId,events});
const all={from:'',to:'',versionId:''};
it('unplaced legacy events never acquire the device zone or silently move to a later dated event',()=>{
 const source=app('SYNTHETIC unplaced',[{status:'Отклик отправлен',date:'2026-10-01T00:30:00'},{status:'Интервью',date:'2026-11-01T12:00:00Z'}]),before=JSON.stringify(source),original=process.env.TZ;
 try{
  for(const zone of ['Pacific/Honolulu','Asia/Kathmandu']){
   process.env.TZ=zone;expect(firstSentDate(source)).toBeNull();expect(monthlyResults([source])).toEqual([]);expect(selectApplications([source],{...all,from:'2026-10-01',to:'2026-12-01'})).toEqual([]);expect(unplacedApplications([source])).toEqual([source]);expect(summarize([source])).toMatchObject({total:1,sent:1,responses:1,interviews:1});
  }
 }finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
 expect(JSON.stringify(source)).toBe(before);
});
it('keeps established calendar-day buckets but preserves day-only precision in CSV',()=>{
 const day=app('SYNTHETIC day',[{status:'Просмотрено',date:'2026-10-01'}]),offset=app('SYNTHETIC offset',[{status:'Оффер',date:'2026-10-01T00:30:00+03:00'}]);
 expect(firstSentDate(day)).toBe('2026-10-01T00:00:00.000Z');expect(firstSentRecordedValue(day)).toBe('2026-10-01');expect(firstSentRecordedValue(offset)).toBe('2026-09-30T21:30:00.000Z');
 const csv=applicationsCsv([day,offset],analyticsEn.csvHeaders);expect(csv).toContain('"SYNTHETIC day","Отклик отправлен","2026-10-01","2026-10-01","v1"');expect(csv).toContain('"2026-09-30T21:30:00.000Z"');expect(csv).not.toContain('2026-10-01T00:00:00.000Z');expect(monthlyResults([day,offset]).map(row=>row.month)).toEqual(['2026-09','2026-10']);
});
it('distinguishes a recorded local date from a placeable instant and rejects impossible dates',()=>{
 expect(validRecordedEventDate('2026-10-29T10:30:00')).toBe(true);expect(recordedEventTime('2026-10-29T10:30:00')).toBeNull();
 for(const value of ['2026-02-30','2026-10-29T24:00:00Z','bad']){expect(validRecordedEventDate(value)).toBe(false);expect(recordedEventTime(value)).toBeNull();}
 const source=app('SYNTHETIC invalid outcome',[{status:'Отклик отправлен',date:'2026-10-01'},{status:'Приглашение',date:'bad'}]);expect(summarize([source])).toMatchObject({sent:1,responses:0});expect(monthlyResults([source])[0].invited).toBe(0);
});
it('counts unplaced applications once without inventing submissions for plans or invalid events',()=>{
 const unplaced=app('SYNTHETIC unplaced',[{status:'Просмотрено',date:'2026-10-01T01:00:00'},{status:'Оффер',date:'2026-10-03T10:00:00'}]),planned=app('SYNTHETIC planned',[{status:'Планируется',date:'2026-10-01T01:00:00'}]),bad=app('SYNTHETIC invalid',[{status:'Просмотрено',date:'bad'}]),known=app('SYNTHETIC known',[{status:'Планируется',date:'2026-09-01T01:00:00'},{status:'Просмотрено',date:'2026-10-01'}]);
 expect(unplacedApplications([unplaced,planned,bad,known]).map(row=>row.id)).toEqual(['SYNTHETIC unplaced']);expect(summarize([unplaced,planned,bad,known]).sent).toBe(2);
});
it('combines version/date selection and translated headers without translating source values or mutating history',()=>{
 const rows=[app('=SYNTHETIC day',[{status:'Оффер',date:'2026-10-01'}]),app('SYNTHETIC unplaced',[{status:'Оффер',date:'2026-10-01T01:00:00'}]),app('SYNTHETIC other',[{status:'Оффер',date:'2026-10-01'}],'v2')],before=JSON.stringify(rows);
 const selected=selectApplications(rows,{from:'2026-10-01',to:'2026-10-31',versionId:'v1'});expect(selected.map(row=>row.id)).toEqual(['=SYNTHETIC day']);
 for(const copy of [analyticsRu,analyticsEn]){const csv=applicationsCsv(selected,copy.csvHeaders);expect(csv).toContain(copy.csvHeaders[0]);expect(csv).toContain('"\'=SYNTHETIC day","Отклик отправлен","2026-10-01","2026-10-01","v1"');expect(csv).not.toContain('SYNTHETIC unplaced');}
 expect(JSON.stringify(rows)).toBe(before);
});
