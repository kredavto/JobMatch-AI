import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),applyWorkspaceCommand:vi.fn(),readWorkspace:vi.fn(),saveWorkspace:vi.fn(),supabase:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {POST} from '../app/api/service/route';
const owner='11111111-1111-4111-8111-111111111111';
const call=(extra:Record<string,unknown>,origin='https://app.test')=>POST(new NextRequest('https://app.test/api/service',{method:'POST',headers:{origin},body:JSON.stringify({revision:2,expectedOwnerId:owner,...extra})}));
beforeEach(()=>{vi.clearAllMocks();db.identity.mockResolvedValue({id:owner,token:'fixture'});db.applyWorkspaceCommand.mockResolvedValue({revision:3});});
it.each([{action:'goal',text:'Analyst'},{action:'vacancy',text:'SQL analyst'},{action:'verify',ids:['f1'],verified:true}])('routes entity intent without a snapshot read/write: %j',async command=>{
 const response=await call({...command,facts:[{text:'forged'}],versions:[{}],user_id:'foreign'});
 expect(response.status).toBe(200);expect(await response.json()).toEqual({revision:3,ownerId:owner});
 expect(db.applyWorkspaceCommand).toHaveBeenCalledWith({id:owner,token:'fixture'},2,command);
 expect(db.consumeQuota).toHaveBeenCalledWith(expect.anything(),'service');
 expect(db.readWorkspace).not.toHaveBeenCalled();expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it.each([{action:'goal',text:null},{action:'vacancy',text:'SQL'},{action:'verify',ids:['f1','f1'],verified:true},{action:'verify',ids:[],verified:'true'}])('rejects malformed intent before RPC: %j',async command=>{
 expect((await call(command)).status).toBe(400);expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();
});
it.each([
 [{action:'application',title:'SQL analyst',status:'Планируется'}, {action:'application',title:'SQL analyst',status:'Планируется',note:''}],
 [{action:'application',id:'legacy-a1',title:'ignored edit',status:'Приглашение',note:'call'}, {action:'application',id:'legacy-a1',status:'Приглашение',note:'call'}],
 [{action:'application',id:'a1',status:'Оффер',note:'accepted',resumeVersionId:null}, {action:'application',id:'a1',status:'Оффер',note:'accepted',resumeVersionId:null}],
 [{action:'application',title:'Job',status:'Планируется',resumeVersionId:'legacy-v1'}, {action:'application',title:'Job',status:'Планируется',note:'',resumeVersionId:'legacy-v1'}]
])('routes application intent without loading or writing a snapshot: %j',async(input,command)=>{
 const response=await call({...input,events:[{status:'Оффер',date:'forged'}],created:'forged',applications:[{}],user_id:'foreign'});
 expect(response.status).toBe(200);expect(await response.json()).toEqual({revision:3,ownerId:owner});
 expect(db.applyWorkspaceCommand).toHaveBeenCalledWith({id:owner,token:'fixture'},2,command);
 expect(db.consumeQuota).toHaveBeenCalledWith(expect.anything(),'service');
 expect(db.readWorkspace).not.toHaveBeenCalled();expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it.each([
 {action:'application',status:'Планируется'},
 {action:'application',id:'',title:'Job',status:'Планируется'},
 {action:'application',id:null,status:'Планируется'},
 {action:'application',title:'Job',status:'unknown'},
 {action:'application',title:'Job',status:'Планируется',note:false},
 {action:'application',title:'Job',status:'Планируется',note:null},
 {action:'application',id:'a1',status:'Планируется',resumeVersionId:''},
 {action:'application',id:'a1',status:'Планируется',resumeVersionId:42},
 {action:'application',id:'a1',status:'Планируется',revision:-1}
])('rejects malformed application before RPC: %j',async command=>{
 expect((await call(command)).status).toBe(400);
 expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it('does not retry a failed application write or send a snapshot fallback',async()=>{
 db.applyWorkspaceCommand.mockRejectedValueOnce(new Error('CONFLICT'));
 expect((await call({action:'application',id:'a1',status:'Интервью'})).status).toBe(409);
 expect(db.applyWorkspaceCommand).toHaveBeenCalledTimes(1);expect(db.saveWorkspace).not.toHaveBeenCalled();
});
it('blocks stale owner and cross-origin before command',async()=>{
 expect((await call({action:'goal',text:'x',expectedOwnerId:'22222222-2222-4222-8222-222222222222'})).status).toBe(409);
 expect((await call({action:'goal',text:'x'},'https://evil.test')).status).toBe(403);
 expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();
});
it('fails closed on quota and never retries an ambiguous write',async()=>{
 db.consumeQuota.mockRejectedValueOnce(new Error('RATE'));
 expect((await call({action:'goal',text:'x'})).status).toBe(429);expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();
 db.applyWorkspaceCommand.mockRejectedValueOnce(new Error('CONFLICT'));
 expect((await call({action:'goal',text:'x'})).status).toBe(409);
 expect(db.applyWorkspaceCommand).toHaveBeenCalledTimes(1);expect(db.saveWorkspace).not.toHaveBeenCalled();
});

it.each(['provenance','hhProvenance','hhVacancyId','source','sourceId'])('never silently launders declared HH source %s into legacy text',async key=>{const response=await call({action:'vacancy',text:'SQL analyst',[key]:{source:'hh-api'}});expect(response.status).toBe(409);expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();expect(db.saveWorkspace).not.toHaveBeenCalled();});

it.each(['\ud800','\udfff','\0'])('rejects invalid application Unicode before RPC',bad=>{
 return call({action:'application',title:'Job',status:'Планируется',note:bad}).then(response=>{expect(response.status).toBe(400);expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();expect(db.saveWorkspace).not.toHaveBeenCalled();});
});

it('rejects malformed UTF8 before identity or command without replacing source bytes',async()=>{
 const prefix=Buffer.from('{"action":"application","revision":2,"title":"'),suffix=Buffer.from('","status":"Планируется"}');
 const response=await POST(new NextRequest('https://app.test/api/service',{method:'POST',headers:{origin:'https://app.test'},body:Buffer.concat([prefix,Buffer.from([255]),suffix])}));
 expect(response.status).toBe(400);expect(db.identity).not.toHaveBeenCalled();expect(db.applyWorkspaceCommand).not.toHaveBeenCalled();expect(db.saveWorkspace).not.toHaveBeenCalled();
});
