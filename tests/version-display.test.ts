import {it,expect} from 'vitest';
import {formatVersionCreated} from '../lib/i18n/version-dates';
import {docxStatusError,versionsCopy} from '../lib/i18n/versions';
it('renders explicit instants in UTC without changing the stored timestamp',()=>{
 const source='2026-10-29T00:15:30+05:45';
 expect(formatVersionCreated(source,'en')).toEqual({kind:'instant',text:'October 28, 2026 at 18:30:30 UTC'});
 expect(formatVersionCreated(source,'ru').text).toContain('18:30:30 UTC');
 expect(source).toBe('2026-10-29T00:15:30+05:45');
});
it('preserves date-only precision and marks missing time/zone instead of inventing midnight',()=>{
 const value=formatVersionCreated('2026-10-29','en');
 expect(value.kind).toBe('date');expect(value.text).toContain('October 29, 2026');expect(value.text).toContain(versionsCopy.en.dates.only);expect(value.text).not.toContain('00:00');
 expect(formatVersionCreated('2026-10-29','ru').text).toContain('29 октября 2026');
});
it('leaves offset-less and unknown legacy values verbatim with explicit uncertainty',()=>{
 for(const source of ['2026-10-29T10:30:00','2026-02-30','unknown']){
  expect(formatVersionCreated(source,'en')).toEqual({kind:'unspecified',text:source+' ('+versionsCopy.en.dates.unspecified+')'});
 }
});
it('date rendering is independent of device time zone for all legacy precisions',()=>{
 const original=process.env.TZ;
 try{
  const values=['2026-10-29T00:15:30+05:45','2026-10-29','2026-10-29T10:30:00'];
  process.env.TZ='Pacific/Honolulu';const first=values.map(value=>formatVersionCreated(value,'en'));
  process.env.TZ='Asia/Kathmandu';expect(values.map(value=>formatVersionCreated(value,'en'))).toEqual(first);
 }finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
it('DOCX status feedback remains semantic and never consumes provider response text',()=>{
 const expected={401:'session',409:'changed',404:'missing',429:'rate',413:'large',503:'prepare'} as const;
 for(const [status,key] of Object.entries(expected)){const semantic=docxStatusError(Number(status));expect(semantic).toBe(key);expect(versionsCopy.en.docx.errors[semantic]).not.toBe(versionsCopy.ru.docx.errors[semantic]);}
 expect(docxStatusError(500)).toBe('prepare');
});
