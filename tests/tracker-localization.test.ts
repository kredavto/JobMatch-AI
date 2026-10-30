import {it,expect} from 'vitest';
import {APPLICATION_STATUSES,filterApplications} from '../lib/application-filter';
import {applicationStatusLabel,trackerCopy} from '../lib/i18n/tracker';
import {formatRecordedDate} from '../lib/i18n/version-dates';
import {recordedEventTime} from '../lib/analytics';
import {explicitInstant} from '../lib/recorded-time';
import {versionsCopy} from '../lib/i18n/versions';
it('localizes all canonical statuses for display while preserving values and unknown source text',()=>{
 expect(Object.keys(trackerCopy.en.statuses)).toEqual([...APPLICATION_STATUSES]);
 for(const status of APPLICATION_STATUSES){expect(applicationStatusLabel(status,'ru')).toBe(status);expect(applicationStatusLabel(status,'en')).not.toBe(status);}
 expect(applicationStatusLabel('SYNTHETIC unknown','en')).toBe('SYNTHETIC unknown');expect(applicationStatusLabel('toString','en')).toBe('toString');
 const applications=[{id:'a',title:'SYNTHETIC SQL',note:'raw source',status:'Интервью',created:'2026-10-30',events:[]}],before=JSON.stringify(applications);
 expect(filterApplications(applications,{query:'raw SQL',status:'Интервью',version:''})).toEqual(applications);
 expect(filterApplications(applications,{query:'',status:applicationStatusLabel('Интервью','en'),version:''})).toEqual([]);
 expect(JSON.stringify(applications)).toBe(before);
});
it('shares supported explicit legacy parsing with analytics without losing recorded minute precision',()=>{
 const values=['2026-10-01T00:30+0300','2026-10-01T00:30+03:00','2026-09-30T21:30z'];
 for(const source of values){const shown=formatRecordedDate(source,'en');expect(shown.kind).toBe('instant');expect(shown.text).toContain('21:30 UTC');expect(shown.text).not.toContain('21:30:00');expect(shown.text).toContain(versionsCopy.en.dates.minute);expect(recordedEventTime(source)).toBe(Date.parse('2026-09-30T21:30:00Z'));}
 expect(formatRecordedDate('2026-10-01T00:30:12+0300','en').text).toContain('21:30:12 UTC');
 expect(formatRecordedDate('2026-09-30T21:30:12z','ru').text).toContain('21:30:12 UTC');
});
it('never assigns an instant or zone to missing, impossible or unsupported dates',()=>{
 for(const source of ['2026-10-01T10:30','2026-10-01T10:30:00','2026-02-30T10:00:00Z','2026-10-01T00:30:00+24:00','unknown']){
  expect(explicitInstant(source)).toBeNull();expect(formatRecordedDate(source,'en')).toEqual({kind:'unspecified',text:source+' ('+versionsCopy.en.dates.unspecified+')'});
 }
 const day=formatRecordedDate('2026-10-01','en');expect(day.kind).toBe('date');expect(day.text).toContain(versionsCopy.en.dates.only);expect(day.text).not.toContain('00:00');
});
it('tracker and version displays are identical across device zones with source precision untouched',()=>{
 const original=process.env.TZ,values=['2026-10-01T00:30+0300','2026-10-01T00:30:12z','2026-10-01','2026-10-01T10:30','2026-10-01T00:30:00GMT'];
 try{process.env.TZ='Pacific/Honolulu';const first=values.map(value=>formatRecordedDate(value,'en'));process.env.TZ='Asia/Kathmandu';expect(values.map(value=>formatRecordedDate(value,'en'))).toEqual(first);expect(values[0]).toBe('2026-10-01T00:30+0300');}
 finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
