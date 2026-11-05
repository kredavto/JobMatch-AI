import {describe,it,expect} from 'vitest';
import type {Application,Workspace} from '../lib/db';
import {addedApplication,updatedApplication} from '../lib/application-write-response';
import {specialtyBasis,sameSpecialtyBasis,specialtyText,acknowledgeSpecialtyDraft,type SpecialtyDraft} from '../app/application-specialty-draft';
const ownerId='11111111-1111-4111-8111-111111111111';
const row:Application={id:'__proto__',title:'Literal role',status:'Планируется',note:'keep note',created:'2026-11-01',events:[]};
const before:Workspace={ownerId,revision:7,original:'SQL',vacancy:'SQL',goal:'Goal',facts:[],versions:[],applications:[row,{...row,id:'other',specialty:{legacy:['opaque']}}]};
const intent={id:row.id,status:row.status,note:row.note,specialty:'QA 🧑‍💻'};
const after:Workspace={...before,revision:8,applications:[{...row,specialty:intent.specialty},before.applications[1]]};
const draft:SpecialtyDraft={ownerId,base:{present:false},text:intent.specialty};
describe('explicit specialty acknowledgement',()=>{
 it.each(['QA 🧑‍💻','','cafe\u0301','=formula'])('accepts literal label/clear %j without mutating unrelated metadata',specialty=>{const previous=JSON.stringify(before);expect(updatedApplication(before,{...after,applications:[{...row,specialty},before.applications[1]]},{...intent,specialty})).toBe(true);expect(JSON.stringify(before)).toBe(previous);});
 it.each([
  ['changed note',(w:Workspace)=>{w.applications[0].note='changed';}],
  ['changed status',(w:Workspace)=>{w.applications[0].status='Оффер';}],
  ['changed events',(w:Workspace)=>{w.applications[0].events=[{status:'Планируется',date:'2026-11-05T00:00:00Z'}];}],
  ['changed title',(w:Workspace)=>{w.applications[0].title='other';}],
  ['changed source',(w:Workspace)=>{w.original='other';}],
  ['changed other row',(w:Workspace)=>{w.applications[1].specialty='rewrite';}],
  ['wrong label',(w:Workspace)=>{w.applications[0].specialty='qa';}],
  ['omitted label',(w:Workspace)=>{delete w.applications[0].specialty;}],
  ['foreign owner',(w:Workspace)=>{w.ownerId='22222222-2222-4222-8222-222222222222';}],
  ['wrong revision',(w:Workspace)=>{w.revision=9;}],
  ['extra row',(w:Workspace)=>{w.applications.push({...row,id:'extra'});}],
  ['changed link',(w:Workspace)=>{w.applications[0].resumeVersionId='injected';}]
 ] as const)('rejects %s',(_label,mutate)=>{const next=structuredClone(after);mutate(next);expect(updatedApplication(before,next,intent)).toBe(false);});
 it.each([undefined,null,{},' QA','QA ','a'.repeat(121),'QA\n','\ud800'])('refuses malformed explicit intent %j',specialty=>{expect(updatedApplication(before,after,{...intent,specialty} as typeof intent)).toBe(false);});
 it('preserves absent/unknown label in an unrelated note write',()=>{for(const source of [row,{...row,specialty:{legacy:['opaque']}},{...row,specialty:''}]){const state={...before,applications:[source]},next={...state,revision:8,applications:[{...source,note:'new note'}]};expect(updatedApplication(state,next,{id:row.id,status:row.status,note:'new note'})).toBe(true);expect(updatedApplication(state,{...next,applications:[{...next.applications[0],specialty:'invented'}]},{id:row.id,status:row.status,note:'new note'})).toBe(false);}});
});
describe('owner-scoped specialty drafts',()=>{
 it('distinguishes absent, clear and unknown metadata structurally',()=>{expect(sameSpecialtyBasis(specialtyBasis(row),specialtyBasis({...row,specialty:''}))).toBe(false);expect(sameSpecialtyBasis(specialtyBasis({...row,specialty:{a:1,b:2}}),specialtyBasis({...row,specialty:{b:2,a:1}}))).toBe(true);expect(specialtyText({...row,specialty:{legacy:true}})).toBe('');expect(specialtyText({...row,specialty:'QA'})).toBe('QA');});
 it('clears only an unchanged acknowledged draft',()=>{expect(acknowledgeSpecialtyDraft(draft,draft,true)).toBeNull();});
 it('rebases newer typing without replacing it',()=>{const newer={...draft,text:'Newer'};expect(acknowledgeSpecialtyDraft(newer,draft,false)).toEqual({...newer,base:{present:true,value:draft.text}});});
 it('retains an edited-then-restored text when epoch changed',()=>{expect(acknowledgeSpecialtyDraft({...draft},draft,false)).toEqual({...draft,base:{present:true,value:draft.text}});});
 it('never recreates a cancelled draft',()=>{expect(acknowledgeSpecialtyDraft(undefined,draft,false)).toBeUndefined();});
 it('does not acknowledge a different owner or independently rebased draft',()=>{for(const current of [{...draft,ownerId:'other'},{...draft,base:{present:true,value:'server'}}])expect(acknowledgeSpecialtyDraft(current,draft,false)).toBe(current);});
 it('supports reserved keys without inherited draft or prototype mutation',()=>{const drafts:Record<string,SpecialtyDraft>={};expect(Object.hasOwn(drafts,row.id)).toBe(false);const next={...drafts,[row.id]:draft};expect(Object.hasOwn(next,row.id)).toBe(true);expect(next[row.id]).toBe(draft);expect(Object.getPrototypeOf(next)).toBe(Object.prototype);const epochs=new Map<string,number>();epochs.set(row.id,1);expect(epochs.get(row.id)).toBe(1);});
});

it('creation ACK cannot invent a specialty omitted by the tracker form',()=>{const created='2026-11-05T00:00:00Z',application={...row,id:'new',title:'New',note:'',created,events:[{status:'Планируется',date:created}],resumeVersionId:null};const next={...before,revision:8,applications:[...before.applications,application]};expect(addedApplication(before,next,{title:'New',resumeVersionId:null})).toBe(true);for(const specialty of ['QA','',{legacy:true}])expect(addedApplication(before,{...next,applications:[...before.applications,{...application,specialty}]},{title:'New',resumeVersionId:null})).toBe(false);});
