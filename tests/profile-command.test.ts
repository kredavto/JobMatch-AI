import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {WorkspaceCommandSchema} from '../lib/workspace-command';
import {DEMO_RESUME,DEMO_VACANCIES} from '../lib/engine';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),applyWorkspaceCommand:vi.fn(),readWorkspace:vi.fn(),saveWorkspace:vi.fn(),supabase:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {POST} from '../app/api/service/route';
const owner='11111111-1111-4111-8111-111111111111';
const call=(body:Record<string,unknown>,origin='https://app.test')=>POST(new NextRequest('https://app.test/api/service',{method:'POST',headers:{origin},body:JSON.stringify({revision:2,expectedOwnerId:owner,...body})}));
beforeEach(()=>{vi.clearAllMocks();db.identity.mockResolvedValue({id:owner,token:'fixture'});db.applyWorkspaceCommand.mockResolvedValue({revision:3});});
it.each([
 {action:'import',text:'\uFEFF SQL \r\n\n😀\nSQL'},
 {action:'fact',text:'  v\r\nSQL😀  '}
])('passes exact text intent, with no snapshot read/write or client lifecycle fields: %j',async command=>{
 const response=await call({...command,id:'forged',source:'forged',verified:true,facts:[{}],versions:[{}],applications:[{}],vacancy:'forged'});
 expect(response.status).toBe(200);expect(await response.json()).toEqual({revision:3,ownerId:owner});
 expect(db.applyWorkspaceCommand).toHaveBeenCalledWith({id:owner,token:'fixture'},2,command);
 expect(db.consumeQuota).toHaveBeenCalledWith(expect.anything(),'service');
 expect(db.readWorkspace).not.toHaveBeenCalled();expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it('uses only server-owned demo text and vacancy, ignoring supplied profile fields',async()=>{
 const response=await call({action:'demo',text:'forged',vacancy:'forged',facts:[{verified:true}]});
 expect(response.status).toBe(200);
 expect(db.applyWorkspaceCommand).toHaveBeenCalledWith({id:owner,token:'fixture'},2,{action:'demo',text:DEMO_RESUME,vacancy:DEMO_VACANCIES[0].text});
 expect(db.readWorkspace).not.toHaveBeenCalled();expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it.each([
 {action:'import',text:''},{action:'import',text:null},{action:'import',text:42},
 {action:'import',text:'x'.repeat(100001)},
 {action:'fact',text:'x'},{action:'fact',text:'x'.repeat(2001)},
 {action:'fact',text:'😀'.repeat(2000)+'x'},
 {action:'fact',text:'😀'},
 {action:'fact',text:'SQL',revision:-1}
])('rejects malformed input before RPC: %j',async command=>{
 expect((await call(command)).status).toBe(400);expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();
});
it('blocks wrong owner, origin, session and quota before any command',async()=>{
 const command={action:'import',text:'SQL'};
 expect((await call({...command,expectedOwnerId:'22222222-2222-4222-8222-222222222222'})).status).toBe(409);
 expect((await call(command,'https://evil.test')).status).toBe(403);
 db.identity.mockRejectedValueOnce(new Error('AUTH'));expect((await call(command)).status).toBe(401);
 db.consumeQuota.mockRejectedValueOnce(new Error('RATE'));expect((await call(command)).status).toBe(429);
 expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();
});
it('never retries an import or falls back after a conflict or ambiguous write failure',async()=>{
 db.applyWorkspaceCommand.mockRejectedValueOnce(new Error('CONFLICT'));
 expect((await call({action:'import',text:'SQL'})).status).toBe(409);
 db.applyWorkspaceCommand.mockRejectedValueOnce(new Error('response lost'));
 expect((await call({action:'fact',text:'Python'})).status).toBe(500);
 expect(db.applyWorkspaceCommand).toHaveBeenCalledTimes(2);expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it.each([
 {action:'import',text:'SQL',facts:[]},
 {action:'import',text:'SQL',vacancy:'forged'},
 {action:'fact',text:'SQL',verified:true},
 {action:'fact',text:'SQL',source:'forged'},
 {action:'fact',text:'SQL',id:'forged'},
 {action:'demo',text:'SQL'},
 {action:'demo',text:'SQL',vacancy:'SQL'},
 {action:'demo',text:'SQL',vacancy:'SQL analyst',ownerId:owner}
])('rejects extra or missing fields on direct command: %j',command=>expect(WorkspaceCommandSchema.safeParse(command).success).toBe(false));
it('preserves whitespace and Zod code-point boundaries for raw commands',()=>{
 for(const command of [{action:'import',text:' \t\r\n'}, {action:'import',text:' '.repeat(99999)+'v'}, {action:'fact',text:'😀'.repeat(2000)}, {action:'fact',text:'  '}])expect(WorkspaceCommandSchema.parse(command)).toEqual(command);
});
