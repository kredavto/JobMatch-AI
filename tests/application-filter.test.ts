import {it,expect} from 'vitest';
import {filterApplications,EMPTY_APPLICATION_FILTER as base} from '../lib/application-filter';
import type {Application} from '../lib/db';
const applications:Application[]=[{id:'a',title:'Аналитик Орёл',note:'Обсудить SQL и зарплату',status:'Интервью',created:'2026-10-25',resumeVersionId:'v1',events:[]},{id:'b',title:'Менеджер B2B',note:'Позвонить рекрутеру',status:'Планируется',created:'2026-10-25',events:[]}];
it('matches normalized title and notes across words',()=>{expect(filterApplications(applications,{...base,query:'  ОРЕЛ   sql '})).toEqual([applications[0]]);});
it('combines status, version and search',()=>{expect(filterApplications(applications,{query:'SQL',status:'Интервью',version:'v1'})).toHaveLength(1);expect(filterApplications(applications,{query:'SQL',status:'Планируется',version:'v1'})).toHaveLength(0);});
it('supports unlinked and missing versions without reassigning them',()=>{expect(filterApplications(applications,{...base,version:'unlinked'})).toEqual([applications[1]]);expect(filterApplications(applications,{...base,version:'missing'})).toEqual([]);});
it('does not interpret search as regex or mutate order/data',()=>{const before=JSON.stringify(applications);expect(filterApplications(applications,{...base,query:'.*'})).toEqual([]);expect(filterApplications(applications,base)).toEqual(applications);expect(JSON.stringify(applications)).toBe(before);});
it('uses current status, not a historical event',()=>{expect(filterApplications([{...applications[0],events:[{status:'Отказ',date:'2026-10-25'}]}],{...base,status:'Отказ'})).toEqual([]);});
