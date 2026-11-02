import {it,expect} from 'vitest';
import {calendarTimeOptions,calendarStart,CalendarTimeFailure,formatCalendarOffset} from '../lib/calendar-time';
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

it('accepts supported local-year boundaries and exact zero offset without silent coercion',()=>{
 expect(calendarStart('2000-01-01T00:00','UTC','').toISOString()).toBe('2000-01-01T00:00:00.000Z');
 expect(calendarStart('2099-12-31T23:59','UTC','0').toISOString()).toBe('2099-12-31T23:59:00.000Z');
 for(const offset of ['00',' 0','0.0','-0','840'])expect(code(()=>calendarStart('2026-11-02T10:30','UTC',offset))).toBe('offset');
});
it('supports both bounded extreme offsets and rejects offset-looking zone strings',()=>{
 expect(calendarStart('2026-11-02T10:30','Pacific/Kiritimati','').toISOString()).toBe('2026-11-01T20:30:00.000Z');
 expect(calendarStart('2026-11-02T10:30','Etc/GMT+12','').toISOString()).toBe('2026-11-02T22:30:00.000Z');
 for(const zone of ['', '+03:00','Europe/Moscow\n','a'.repeat(101)])expect(code(()=>calendarTimeOptions('2026-11-02T10:30',zone))).toBe('zone');
});
it('rejects seconds, rollover and malformed local dates before conversion',()=>{
 for(const local of ['2026-11-02T10:30:00','2026-13-01T10:30','2026-01-01T24:00','2025-02-29T10:30','2026-11-02T10:60','2026-1-2T10:30'])expect(code(()=>calendarTimeOptions(local,'UTC'))).toBe('time');
 expect(calendarStart('2024-02-29T10:30','UTC','').toISOString()).toBe('2024-02-29T10:30:00.000Z');
});
it('formats quarter-hour, negative and zero offsets without losing minutes',()=>{
 expect([345,-210,0,840,-840].map(formatCalendarOffset)).toEqual(['UTC+05:45','UTC-03:30','UTC+00:00','UTC+14:00','UTC-14:00']);
 for(const offset of [NaN,Infinity,1.5,841,-841])expect(code(()=>formatCalendarOffset(offset))).toBe('offset');
});
