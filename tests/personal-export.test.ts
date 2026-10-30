import {beforeEach,it,expect,vi} from 'vitest';
const db=vi.hoisted(()=>({readWorkspace:vi.fn(),supabase:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {personalExport} from '../lib/personal-export';
const workspace={revision:1,original:'SQL',vacancy:'',goal:'',facts:[],versions:[],applications:[]};
const owner={id:'owner',token:'private-token',email:'demo@example.test'};
const id=(n:number)=>'11111111-1111-4111-8111-'+String(n).padStart(12,'0');
const row=(n:number)=>({id:id(n),action:'verify',created:'2020-01-01T00:00:00Z'});
beforeEach(()=>{vi.resetAllMocks();db.readWorkspace.mockResolvedValue(workspace);});
it('exports all short pages, filters by owner and retains the separate history link',async()=>{
 db.supabase.mockResolvedValueOnce([row(1)]).mockResolvedValueOnce([row(2)]).mockResolvedValueOnce([]).mockResolvedValueOnce([{version:'privacy-v1',created:'2020-01-01T00:00:00Z'}]);
 const result=await personalExport(owner);
 expect(result.audit).toEqual([row(1),row(2)]);expect(result.complete).toBe(true);
 expect(result.scope).toBe('workspace-audit-consent');expect(result.consent_observation_kind).toBe('legacy-workspace-observation');expect(result.consent_receipts_export).toBe('settings-consent-panel');expect(result.fact_history_export).toBe('/api/fact-history?export=1');
 expect(db.supabase.mock.calls[1][0]).toContain('&id=gt.'+id(1));
 for(const call of db.supabase.mock.calls){expect(call[0]).toContain('user_id=eq.owner');expect(call[3]).toBe(owner.token);}
 expect(JSON.stringify(result)).not.toContain(owner.token);
});
it('fails rather than exporting after a revision change',async()=>{
 db.supabase.mockResolvedValue([]);db.readWorkspace.mockResolvedValueOnce(workspace).mockResolvedValueOnce({...workspace,revision:2});
 await expect(personalExport(owner)).rejects.toThrow('CONFLICT');
});
it.each([[row(2),row(1)],[row(1),row(1)],[{...row(1),created:'invalid'}],[{...row(1),action:42}]].map(rows=>({rows})))('rejects corrupted audit pages',async({rows})=>{
 db.supabase.mockResolvedValueOnce(rows);await expect(personalExport(owner)).rejects.toMatchObject({status:502});
});
it('detects a cursor that stops advancing',async()=>{
 db.supabase.mockResolvedValue([row(1)]);await expect(personalExport(owner)).rejects.toMatchObject({status:502});expect(db.supabase).toHaveBeenCalledTimes(2);
});
it('does not return a complete file when an intermediate fetch fails',async()=>{
 db.supabase.mockResolvedValueOnce([row(1)]).mockRejectedValueOnce(new Error('upstream'));
 await expect(personalExport(owner)).rejects.toThrow();
});
it('validates consent instead of dropping malformed data silently',async()=>{
 db.supabase.mockResolvedValueOnce([]).mockResolvedValueOnce([{version:null,created:'2020-01-01T00:00:00Z'}]);
 await expect(personalExport(owner)).rejects.toMatchObject({status:502});
});
it('fails closed at the bounded export limit',async()=>{
 let n=0;db.supabase.mockImplementation(async()=>Array.from({length:200},()=>row(++n)));
 await expect(personalExport(owner)).rejects.toMatchObject({status:413});
 expect(db.supabase).toHaveBeenCalledTimes(51);
});
