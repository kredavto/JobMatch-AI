import {expect,it} from 'vitest';
import {empty,type Workspace} from '../lib/db';
import {prepareVersionCommand} from '../lib/version-command';
import {WorkspaceCommandSchema} from '../lib/workspace-command';
import {matchMetadata} from '../lib/match-config';
const state=():Workspace=>({...empty(),revision:7,original:'Python\r\n SQL \r\nOther',vacancy:'Обязательные требования:\nSQL\nЖелательно:\nPython',
 facts:[{id:'py',text:'Python',source:'input',verified:true},{id:'sql',text:'SQL',source:'input',verified:true}]});
const metadata=matchMetadata([{status:'matched'},{status:'matched'}]);
it('keeps engine ranking, ignores selection order and sends no text/snapshot/lifecycle fields',()=>{
 const s=state(),before=structuredClone(s);
 expect(prepareVersionCommand(s,['edit-py','edit-sql'])).toEqual({action:'version',evidence_ids:['sql','py'],score:100,match_metadata:metadata});
 expect(s).toEqual(before);
});
it('scores the saved profile independently of chosen edits, including an unchanged-text version',()=>{
 expect(prepareVersionCommand(state(),[])).toEqual({action:'version',evidence_ids:[],score:100,match_metadata:metadata});
 expect(prepareVersionCommand(state(),['edit-py'])).toEqual({action:'version',evidence_ids:['py'],score:100,match_metadata:metadata});
});
it('refuses unverified, risky, absent and stale edits even if an ID is present in the profile',()=>{
 const unverified=state();unverified.facts[0].verified=false;
 expect(()=>prepareVersionCommand(unverified,['edit-py'])).toThrow('устарела');
 const risky=state();risky.facts[1].text='Не знаю SQL';
 expect(()=>prepareVersionCommand(risky,['edit-sql'])).toThrow('устарела');
 expect(()=>prepareVersionCommand(state(),['edit-foreign'])).toThrow('устарела');
});
it.each([undefined,null,['edit-sql','edit-sql'],[1],[''],['x'.repeat(106)],Array.from({length:501},(_,i)=>String(i))])('refuses malformed edit selection %j',ids=>{
 expect(()=>prepareVersionCommand(state(),ids)).toThrow();
});
it('requires saved original/vacancy and enforces the 100-version cap before preparing a write',()=>{
 expect(()=>prepareVersionCommand({...state(),original:''},[])).toThrow('Добавьте');
 expect(()=>prepareVersionCommand({...state(),vacancy:''},[])).toThrow('Добавьте');
 expect(()=>prepareVersionCommand({...state(),versions:Array(100).fill({})},[])).toThrow('100');
});
it.each([
 {action:'restore',id:''},{action:'restore',id:null},{action:'restore',id:'v',text:'forged'},
 {action:'version',evidence_ids:['sql','sql'],score:100,match_metadata:metadata},
 {action:'version',evidence_ids:[1],score:100,match_metadata:metadata},
 {action:'version',evidence_ids:[],score:101,match_metadata:metadata},
 {action:'version',evidence_ids:[],score:0.5,match_metadata:metadata},
 {action:'version',evidence_ids:[],score:100,match_metadata:{...metadata,rules_revision:'forged'}},
 {action:'version',evidence_ids:[],score:100,match_metadata:{...metadata,weights:{...metadata.weights,mandatory:30,experience:30}}},
 {action:'version',evidence_ids:[],score:100,match_metadata:{...metadata,contributions:{...metadata.contributions,partial:1}}},
 {action:'version',evidence_ids:[],score:100,match_metadata:metadata,text:'forged'},
 {action:'version',evidence_ids:[],score:100,match_metadata:metadata,profile_revision:3}
])('rejects invalid lifecycle/evaluation command %j',command=>expect(WorkspaceCommandSchema.safeParse(command).success).toBe(false));
it('keeps legacy saved version IDs as opaque strings',()=>expect(WorkspaceCommandSchema.parse({action:'restore',id:'legacy-v1'})).toEqual({action:'restore',id:'legacy-v1'}));
