import {describe,it,expect} from 'vitest';
import type {Workspace} from '../lib/db';
import {addedApplication} from '../lib/application-write-response';
const ownerId='11111111-1111-4111-8111-111111111111',created='2026-11-02T03:00:00Z';
const title='  SQL 🧑‍💻 role  ',intent={title,resumeVersionId:'v1'};
const before:Workspace={ownerId,revision:7,original:'Literal\r\nSQL 🧑‍💻',vacancy:'SQL',goal:'Goal',facts:[{id:'f1',text:'SQL',source:'User',verified:true}],versions:[{id:'v1',created:'2026-10-25',text:'SQL',vacancy:'SQL',score:0,evidence_ids:[]}],applications:[{id:'old',title:'Old',status:'Планируется',note:'Raw old note',created:'2026-10-25',events:[]}]};
const after:Workspace={...before,revision:8,applications:[...before.applications,{id:'new',title,status:'Планируется',note:'',created,events:[{status:'Планируется',date:created}],resumeVersionId:'v1'}]};
describe('exact current application creation acknowledgement',()=>{
 it('accepts the literal captured title/link and preserves complete existing data without mutation',()=>{const prior=JSON.stringify(before),next=JSON.stringify(after);expect(addedApplication(before,after,intent)).toBe(true);expect(JSON.stringify(before)).toBe(prior);expect(JSON.stringify(after)).toBe(next);});
 it('accepts harmless JSON object-key reordering and legacy omitted/null unlinked values',()=>{const reordered=Object.fromEntries(Object.entries(after).reverse()) as unknown as Workspace;reordered.applications=reordered.applications.map(row=>Object.fromEntries(Object.entries(row).reverse()) as typeof row);reordered.applications[0]={...reordered.applications[0],resumeVersionId:null};expect(addedApplication(before,reordered,intent)).toBe(true);expect(addedApplication({...before,applications:[]},{...after,applications:[{...after.applications[1],resumeVersionId:null}]},{title,resumeVersionId:null})).toBe(true);});
 it.each([
  ['missing row',(w:Workspace)=>{w.applications=[];}],
  ['extra row',(w:Workspace)=>{w.applications.push({...w.applications[1],id:'another'});}],
  ['changed old note',(w:Workspace)=>{w.applications[0].note='Changed';}],
  ['changed source',(w:Workspace)=>{w.original='Wrong';}],
  ['changed fact',(w:Workspace)=>{w.facts[0].verified=false;}],
  ['changed version',(w:Workspace)=>{w.versions[0].text='Wrong';}],
  ['changed goal',(w:Workspace)=>{w.goal='Wrong';}],
  ['changed vacancy',(w:Workspace)=>{w.vacancy='Wrong';}],
  ['trimmed title',(w:Workspace)=>{w.applications[1].title=title.trim();}],
  ['wrong link',(w:Workspace)=>{w.applications[1].resumeVersionId=null;}],
  ['wrong status',(w:Workspace)=>{w.applications[1].status='Интервью';}],
  ['unexpected note',(w:Workspace)=>{w.applications[1].note='Wrong';}],
  ['missing initial event',(w:Workspace)=>{w.applications[1].events=[];}],
  ['wrong initial event',(w:Workspace)=>{w.applications[1].events[0].status='Интервью';}],
  ['different event stamp',(w:Workspace)=>{w.applications[1].events[0].date='2026-11-02T03:00:01Z';}],
  ['date-only new stamp',(w:Workspace)=>{w.applications[1].created='2026-11-02';w.applications[1].events[0].date='2026-11-02';}],
  ['foreign owner',(w:Workspace)=>{w.ownerId='22222222-2222-4222-8222-222222222222';}],
  ['stale revision',(w:Workspace)=>{w.revision=7;}],
  ['future revision',(w:Workspace)=>{w.revision=9;}]
 ] as const)('refuses schema-valid %s before UI adoption',(_label,change)=>{const next=structuredClone(after);change(next);expect(addedApplication(before,next,intent)).toBe(false);});
 it('refuses an unknown expected owner or a link absent from the captured versions',()=>{const {ownerId:_owner,...legacy}=before;void _owner;expect(addedApplication(legacy,after,intent)).toBe(false);expect(addedApplication(before,after,{title,resumeVersionId:'missing'})).toBe(false);});
});
