import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {WorkspaceCommandSchema} from '../lib/workspace-command';
import {applyWorkspaceCommand,empty} from '../lib/db';
beforeEach(()=>{vi.stubEnv('SUPABASE_URL','https://fixture.example');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','fixture');});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it.each([
 {action:'verify',ids:['f','f'],verified:true},
 {action:'verify',ids:[''],verified:true},
 {action:'verify',ids:['f'],verified:'true'},
 {action:'goal',text:'a',facts:[]},
 {action:'goal',text:'a',ownerId:'foreign'},
 {action:'goal',text:'a'.repeat(1001)},
 {action:'vacancy',text:'SQL'},
 {action:'verify',ids:Array.from({length:501},(_,i)=>String(i)),verified:true}
])('rejects invalid command %j',command=>expect(WorkspaceCommandSchema.safeParse(command).success).toBe(false));
it('sends only command/revision and session token; preserves unknown response fields',async()=>{
 const state={...empty(),revision:3,goal:'Analyst',legacy:'keep'};
 const fetch=vi.fn().mockResolvedValue(Response.json(state));vi.stubGlobal('fetch',fetch);
 expect(await applyWorkspaceCommand({id:'owner',token:'jwt'},2,{action:'goal',text:'Analyst'})).toEqual(state);
 expect(fetch).toHaveBeenCalledTimes(1);
 expect(fetch.mock.calls[0][0]).toBe('https://fixture.example/rest/v1/rpc/apply_workspace_command');
 expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({p_revision:2,p_command:{action:'goal',text:'Analyst'}});
 expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt');
});
it.each([null,3,{...empty(),revision:2},{...empty(),revision:4},{...empty(),revision:3,facts:'broken'},{...empty(),revision:3,ownerId:'11111111-1111-4111-8111-111111111111'}])('rejects ambiguous or malformed command response %j',async state=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(state)));
 await expect(applyWorkspaceCommand({id:'owner',token:'jwt'},2,{action:'goal',text:'Analyst'})).rejects.toMatchObject({status:502});
});
it('never retries a conflict or falls back to snapshot writes',async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json({message:'CONFLICT'},{status:400}));vi.stubGlobal('fetch',fetch);
 await expect(applyWorkspaceCommand({id:'owner',token:'jwt'},2,{action:'verify',ids:['f'],verified:true})).rejects.toThrow('CONFLICT');
 expect(fetch).toHaveBeenCalledTimes(1);
});
