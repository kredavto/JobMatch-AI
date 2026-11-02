import {it,expect} from 'vitest';
import {firstSentDate,applicationsCsv} from '../lib/analytics';
import type {Application} from '../lib/db';
const app=(events:Application['events']):Application=>({id:'a',title:'Literal title',status:'Отклик отправлен',note:'',created:'2026-10-01',events});
it('does not silently place an offset-less event using the device zone or a later known event',()=>{
 expect(firstSentDate(app([{status:'Отклик отправлен',date:'2026-10-01T00:30:00'},{status:'Интервью',date:'2026-11-01T12:00:00Z'}]))).toBeNull();
});
it('CSV preserves a day-only first observation without inventing a midnight timestamp',()=>{
 expect(applicationsCsv([app([{status:'Просмотрено',date:'2026-10-01'}])],['Title','Status','Created','Sent','Version'])).toContain('"Literal title","Отклик отправлен","2026-10-01","2026-10-01",""');
});
