import {it,expect} from 'vitest';
import {settingsExportHref,knownSettingsOwner,validatedPersonalExport,SETTINGS_EXPORT_PATHS} from '../lib/settings-export';
import {WorkspaceRequestError} from '../lib/workspace-feedback';
const ownerId='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222';
const workspace={ownerId,revision:7,original:'literal source',vacancy:'',goal:'',facts:[],versions:[],applications:[]};
const archive={format:'jobmatch-personal-data-v1',complete:true,scope:'workspace-audit-consent',exported_at:'2026-11-02T00:00:00Z',fact_history_export:'/api/fact-history?export=1',user:{id:ownerId},workspace,audit:[],consent:[]};
function status(fn:()=>unknown){try{fn();return null;}catch(e){return e instanceof WorkspaceRequestError?e.status:'unexpected';}}
it('validates a complete matching archive while preserving literal content and current schema',()=>{
 expect(validatedPersonalExport(archive,{ownerId,currentOwnerId:ownerId})).toEqual(archive);
 const {ownerId:ignored,...legacy}=workspace;void ignored;
 expect(validatedPersonalExport({...archive,workspace:legacy},{ownerId,currentOwnerId:ownerId}).workspace.original).toBe('literal source');
});
it.each(['user','workspace'] as const)('rejects a valid-shaped %s identity mismatch before a download can be constructed',field=>{
 const data=field==='user'?{...archive,user:{id:otherId}}:{...archive,workspace:{...workspace,ownerId:otherId}};
 expect(status(()=>validatedPersonalExport(data,{ownerId,currentOwnerId:ownerId}))).toBe(409);
});
it.each([undefined,otherId])('rejects a changed or lost current owner %s',currentOwnerId=>{
 expect(status(()=>validatedPersonalExport(archive,{ownerId,currentOwnerId}))).toBe(409);
});
it.each([undefined,'','legacy','x&expectedOwnerId=other','../other'])('unknown owner %s never creates a URL or authorizes archive validation',owner=>{
 expect(knownSettingsOwner(owner)).toBe(false);
 for(const kind of Object.keys(SETTINGS_EXPORT_PATHS) as (keyof typeof SETTINGS_EXPORT_PATHS)[])expect(settingsExportHref(kind,owner)).toBeNull();
 expect(()=>validatedPersonalExport(archive,{ownerId:owner,currentOwnerId:owner})).toThrow(WorkspaceRequestError);
});
it.each([{complete:false},{audit:null},{format:'other'},{workspace:{...workspace,revision:-1}}])('rejects incomplete or malformed archives %#',patch=>{
 expect(status(()=>validatedPersonalExport({...archive,...patch},{ownerId,currentOwnerId:ownerId}))).toBe(502);
});
it('binds exactly the three current same-origin history routes without obsolete reminder endpoints',()=>{
 expect(SETTINGS_EXPORT_PATHS).toEqual({facts:'/api/fact-history',letters:'/api/letter-versions',sources:'/api/source-versions'});
 for(const kind of Object.keys(SETTINGS_EXPORT_PATHS) as (keyof typeof SETTINGS_EXPORT_PATHS)[]){const url=new URL(settingsExportHref(kind,ownerId)!,'https://fixture.test');expect(url.origin).toBe('https://fixture.test');expect(url.pathname).toBe(SETTINGS_EXPORT_PATHS[kind]);expect([...url.searchParams]).toEqual([['export','1'],['expectedOwnerId',ownerId]]);}
});
