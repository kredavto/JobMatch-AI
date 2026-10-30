import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import type {Workspace} from '../lib/db';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),applyWorkspaceCommand:vi.fn(),readWorkspace:vi.fn(),saveWorkspace:vi.fn(),supabase:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {ordinaryState,ordinaryResult,ordinaryIds} from './fixtures/ordinary-version';
import {POST} from '../app/api/service/route';
const owner='11111111-1111-4111-8111-111111111111';
const workspace:Workspace={revision:2,original:'SQL',vacancy:'SQL',goal:'',facts:[{id:'f1',text:'SQL',source:'input',verified:true}],versions:[],applications:[]};
const call=(extra:Record<string,unknown>,origin='https://app.test')=>POST(new NextRequest('https://app.test/api/service',{method:'POST',headers:{origin},body:JSON.stringify({revision:2,expectedOwnerId:owner,...extra})}));
beforeEach(()=>{vi.clearAllMocks();db.identity.mockResolvedValue({id:owner,token:'fixture'});db.readWorkspace.mockResolvedValue(structuredClone(workspace));db.applyWorkspaceCommand.mockResolvedValue({revision:3});});
it('restores by ID only, ignoring forged history/lifecycle fields, with no snapshot read/write',async()=>{
 const r=await call({action:'restore',id:'legacy-v1',text:'forged',created:'forged',evidence_snapshot:[{}],versions:[{}]});
 expect(r.status).toBe(200);expect(await r.json()).toEqual({revision:3,ownerId:owner});
 expect(db.applyWorkspaceCommand).toHaveBeenCalledWith({id:owner,token:'fixture'},2,{action:'restore',id:'legacy-v1'});
 expect(db.readWorkspace).not.toHaveBeenCalled();expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it('evaluates one snapshot, binds it to its revision and sends no client-provided version',async()=>{
 const r=await call({action:'version',ids:['edit-f1'],text:'forged',score:0,evidence_ids:['foreign'],match_metadata:{rules_revision:'forged'},versions:[{}]});
 expect(r.status).toBe(200);expect(db.readWorkspace).toHaveBeenCalledTimes(1);
 expect(db.applyWorkspaceCommand).toHaveBeenCalledWith({id:owner,token:'fixture'},2,{action:'version',evidence_ids:['f1'],score:100,match_metadata:{rules_revision:'rules-2026-10-25.1',weights:{mandatory:35,experience:25,skills:20,context:10,clarity:10},contributions:{matched:1,partial:0.5,missing:0,unknown:0},requirements:1,outcomes:{matched:1,partial:0,missing:0,unknown:0}}});
 expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it.each([{action:'restore',id:''},{action:'restore',id:null},{action:'restore',id:'v',revision:-1},{action:'version',ids:['edit-f1','edit-f1']},{action:'version',ids:['edit-foreign']}])('refuses malformed/stale intent before RPC: %j',async command=>{
 expect((await call(command)).status).toBe(400);expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();
});
it('blocks a stale revision before evaluation and a race reported by SQL without retry/fallback',async()=>{
 db.readWorkspace.mockResolvedValueOnce({...workspace,revision:3});expect((await call({action:'version',ids:[]})).status).toBe(409);expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();
 db.applyWorkspaceCommand.mockRejectedValueOnce(new Error('CONFLICT'));
 expect((await call({action:'version',ids:[]})).status).toBe(409);expect(db.applyWorkspaceCommand).toHaveBeenCalledTimes(1);expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it('enforces owner/origin/session/quota before restoration',async()=>{
 const command={action:'restore',id:'v'};
 expect((await call({...command,expectedOwnerId:'22222222-2222-4222-8222-222222222222'})).status).toBe(409);
 expect((await call(command,'https://evil.test')).status).toBe(403);
 db.identity.mockRejectedValueOnce(new Error('AUTH'));expect((await call(command)).status).toBe(401);
 db.consumeQuota.mockRejectedValueOnce(new Error('RATE'));expect((await call(command)).status).toBe(429);
 expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();expect(db.readWorkspace).not.toHaveBeenCalled();
});

it('explicit English passes only the fixed tag and verifies the full acknowledged append against its saved source',async()=>{
 const s={...ordinaryState(),revision:2};db.readWorkspace.mockResolvedValueOnce(s);db.applyWorkspaceCommand.mockResolvedValueOnce(ordinaryResult(s));
 const r=await call({action:'version',ids:ordinaryIds,templateVersion:'ordinary-literal-en-v1',text:'forged',template_version:'forged'});
 expect(r.status).toBe(200);expect((await r.json()).versions.at(-1).template_version).toBe('ordinary-literal-en-v1');
 expect(db.applyWorkspaceCommand.mock.calls[0][2].template_version).toBe('ordinary-literal-en-v1');expect(db.applyWorkspaceCommand.mock.calls[0][2]).not.toHaveProperty('text');
});
it('invalid template values do not reach a mutation and valid mismatching replies fail once without raw data',async()=>{
 for(const templateVersion of ['en',null,'ordinary-literal-en-v2'])expect((await call({action:'version',ids:[],templateVersion})).status).toBe(400);
 expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();
 const s={...ordinaryState(),revision:2},next=ordinaryResult(s);next.versions.at(-1)!.text='PRIVATE FORGED TEXT';
 db.readWorkspace.mockResolvedValueOnce(s);db.applyWorkspaceCommand.mockResolvedValueOnce(next);
 const r=await call({action:'version',ids:ordinaryIds,templateVersion:'ordinary-literal-en-v1'});expect(r.status).toBe(502);expect(await r.text()).not.toContain('PRIVATE FORGED TEXT');expect(db.applyWorkspaceCommand).toHaveBeenCalledTimes(1);
});
