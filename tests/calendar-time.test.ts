import {it,expect} from 'vitest';
import {calendarTimeOptions,calendarStart,CalendarTimeFailure} from '../lib/calendar-time';
function code(fn:()=>unknown){try{fn();return null;}catch(e){return e instanceof CalendarTimeFailure?e.code:'unexpected';}}
it('requires an explicit occurrence for repeated New York local time',()=>{
 const candidates=calendarTimeOptions('2026-11-01T01:30','America/New_York');expect(candidates).toEqual([{dueAt:'2026-11-01T05:30:00.000Z',offsetMinutes:-240},{dueAt:'2026-11-01T06:30:00.000Z',offsetMinutes:-300}]);
 expect(code(()=>calendarStart('2026-11-01T01:30','America/New_York',''))).toBe('choose');
 expect(calendarStart('2026-11-01T01:30','America/New_York','-300').toISOString()).toBe('2026-11-01T06:30:00.000Z');
 expect(code(()=>calendarStart('2026-11-01T01:30','America/New_York','180'))).toBe('offset');
});
it('rejects clock gaps, invalid dates, unsupported years and unavailable zones semantically',()=>{
 expect(code(()=>calendarTimeOptions('2026-03-08T02:30','America/New_York'))).toBe('gap');
 for(const local of ['2026-02-30T10:30','1999-10-01T10:30','2100-10-01T10:30','bad'])expect(code(()=>calendarTimeOptions(local,'UTC'))).toBe('time');
 expect(code(()=>calendarTimeOptions('2026-11-02T10:30','Unknown/Zone'))).toBe('zone');
});
it('handles non-hour offsets and half-hour folds without using the process zone',()=>{
 const original=process.env.TZ;
 try{for(const zone of ['Pacific/Honolulu','Europe/Moscow']){process.env.TZ=zone;expect(calendarStart('2026-11-02T10:30','Asia/Kathmandu','').toISOString()).toBe('2026-11-02T04:45:00.000Z');expect(calendarTimeOptions('2026-04-05T01:45','Australia/Lord_Howe').map(x=>x.offsetMinutes)).toEqual([660,630]);}}
 finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
