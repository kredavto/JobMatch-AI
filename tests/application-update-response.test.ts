import {describe,it,expect} from 'vitest';
import type {Workspace} from '../lib/db';
import {updatedApplication,type ApplicationUpdateIntent} from '../lib/application-write-response';
import {editNoteDraft,acknowledgeNoteDraft} from '../app/application-note-draft';
const ownerId='11111111-1111-4111-8111-111111111111',created='2026-11-01T03:00:00Z',stamp='2026-11-02T03:33:00Z';
const before:Workspace={ownerId,revision:7,original:'SQL 🧑‍💻',vacancy:'SQL',goal:'Goal',facts:[{id:'f1',text:'SQL',source:'Raw',verified:true}],versions:[{id:'v1',created,text:'SQL',vacancy:'SQL',score:0,evidence_ids:[]}],applications:[{id:'a1',title:'Literal title',status:'Планируется',note:'Original',created,events:[{status:'Планируется',date:created}]},{id:'other',title:'Other',status:'Планируется',note:'Preserve',created,events:[],resumeVersionId:null}]};
const intent:ApplicationUpdateIntent={id:'a1',status:'Планируется',note:'New literal\r\n🧑‍💻 note'};
const after:Workspace={...before,revision:8,applications:before.applications.map(a=>a.id===intent.id?{...a,note:intent.note}:a)};
describe('exact current application updates',()=>{
 it('accepts a literal note update without changing source data or its inputs',()=>{const a=JSON.stringify(before),b=JSON.stringify(after);expect(updatedApplication(before,after,intent)).toBe(true);expect(JSON.stringify(before)).toBe(a);expect(JSON.stringify(after)).toBe(b);});
 it('accepts JSON key order, legacy unlinked values and an explicit existing-version link',()=>{const next=structuredClone(after);next.applications[0]=Object.fromEntries(Object.entries({...next.applications[0],resumeVersionId:null}).reverse()) as typeof next.applications[0];expect(updatedApplication(before,next,intent)).toBe(true);next.applications[0].resumeVersionId='v1';expect(updatedApplication(before,next,{...intent,resumeVersionId:'v1'})).toBe(true);});
 it('requires exactly one appended event only when the status changes',()=>{const next=structuredClone(after);next.applications[0].status='Интервью';next.applications[0].events.push({status:'Интервью',date:stamp});const change={...intent,status:'Интервью'};expect(updatedApplication(before,next,change)).toBe(true);next.applications[0].events[1].date='2026-11-02';expect(updatedApplication(before,next,change)).toBe(false);});
 it.each([
 ['wrong note',(w:Workspace)=>{w.applications[0].note='PRIVATE_WRONG';}],
 ['wrong status',(w:Workspace)=>{w.applications[0].status='Интервью';}],
 ['wrong link',(w:Workspace)=>{w.applications[0].resumeVersionId='v1';}],
 ['changed title',(w:Workspace)=>{w.applications[0].title='Wrong';}],
 ['changed created',(w:Workspace)=>{w.applications[0].created=stamp;}],
 ['changed other note',(w:Workspace)=>{w.applications[1].note='Wrong';}],
 ['changed original',(w:Workspace)=>{w.original='Wrong';}],
 ['changed fact',(w:Workspace)=>{w.facts[0].verified=false;}],
 ['changed version',(w:Workspace)=>{w.versions[0].text='Wrong';}],
 ['changed goal',(w:Workspace)=>{w.goal='Wrong';}],
 ['changed vacancy',(w:Workspace)=>{w.vacancy='Wrong';}],
 ['missing row',(w:Workspace)=>{w.applications.pop();}],
 ['extra row',(w:Workspace)=>{w.applications.push({...w.applications[0],id:'extra'});}],
 ['changed event',(w:Workspace)=>{w.applications[0].events[0].date=stamp;}],
 ['extra same-status event',(w:Workspace)=>{w.applications[0].events.push({status:'Планируется',date:stamp});}],
 ['wrong owner',(w:Workspace)=>{w.ownerId='22222222-2222-4222-8222-222222222222';}],
 ['stale revision',(w:Workspace)=>{w.revision=7;}],
 ['future revision',(w:Workspace)=>{w.revision=9;}]
 ] as const)('refuses schema-valid %s before adoption',(_label,change)=>{const next=structuredClone(after);change(next);expect(updatedApplication(before,next,intent)).toBe(false);});
 it('refuses missing expected owner/row and an explicit unknown version link',()=>{const {ownerId:_owner,...legacy}=before;void _owner;expect(updatedApplication(legacy,after,intent)).toBe(false);expect(updatedApplication(before,after,{...intent,id:'missing'})).toBe(false);expect(updatedApplication(before,after,{...intent,resumeVersionId:'missing'})).toBe(false);});
});
describe('note draft editing context',()=>{
 it('starts from displayed saved text when an old draft is clean, but preserves a dirty unfamiliar base',()=>{expect(editNoteDraft({base:'old',text:'saved'},'saved','next')).toEqual({base:'saved',text:'next'});expect(editNoteDraft({base:'old',text:'local'},'remote','next')).toEqual({base:'old',text:'next'});});
 it('removes the unchanged acknowledged draft and rebases newer typing without changing its text',()=>{expect(acknowledgeNoteDraft({base:'O',text:'A'},'O','A',true)).toBeNull();expect(acknowledgeNoteDraft({base:'O',text:'B 🧑‍💻'},'O','A',false)).toEqual({base:'A',text:'B 🧑‍💻'});});
 it('retains ABA context and never revives a cancelled or independently rebased draft',()=>{expect(acknowledgeNoteDraft({base:'O',text:'A'},'O','A',false)).toEqual({base:'A',text:'A'});expect(acknowledgeNoteDraft(undefined,'O','A',false)).toBeUndefined();const current={base:'remote',text:'local'};expect(acknowledgeNoteDraft(current,'O','A',false)).toBe(current);});
});
