import {it,expect,vi} from 'vitest';
import {collectProfileAcceptanceExport} from '../lib/ai-profile-acceptance';
import {aiAcceptanceFixture} from './fixtures/ai-profile-acceptance';
const fresh=()=>new AbortController();
it('exports every validated record from the initial bounded list without claiming model or offline attestation',async()=>{
 const f=await aiAcceptanceFixture(),read=vi.fn(async()=>f.record);
 const file=await collectProfileAcceptanceExport(f.profile.ownerId,async()=>f.list,read,fresh().signal);
 expect(file).toMatchObject({complete:true,scope:'initial-metadata-list',sourceStatus:'editable-local-copy',modelIdentityVerified:false,modelAcceptance:'not-accepted',records:[f.record]});expect(read).toHaveBeenCalledExactlyOnceWith(f.record.id);expect(JSON.stringify(file)).not.toContain('ab'.repeat(32));
});
it('returns an explicit empty journal when the initial list is empty',async()=>{
 const f=await aiAcceptanceFixture(),read=vi.fn();const file=await collectProfileAcceptanceExport(f.profile.ownerId,async()=>({...f.list,items:[]}),read,fresh().signal);expect(file.records).toEqual([]);expect(file.complete).toBe(true);expect(read).not.toHaveBeenCalled();
});
it('refuses a foreign list or record rather than returning a partial file',async()=>{
 const f=await aiAcceptanceFixture(),other='22222222-2222-4222-8222-222222222222';
 await expect(collectProfileAcceptanceExport(f.profile.ownerId,async()=>({...f.list,ownerId:other}),async()=>f.record,fresh().signal)).rejects.toThrow();
 await expect(collectProfileAcceptanceExport(f.profile.ownerId,async()=>f.list,async()=>({...f.record,ownerId:other}),fresh().signal)).rejects.toThrow();
});
it('checks record identity and all source/model metadata against the initial list',async()=>{
 const f=await aiAcceptanceFixture();
 for(const change of [{id:'22222222-2222-4222-8222-222222222222'},{created:'2020-01-01T00:00:00Z'},{entryCount:1},{payloadSha256:'0'.repeat(64)},{model:'different'},{operatorDeclaredModelDigest:'sha256:'+'0'.repeat(64)},{workspaceRevision:2},{profileRevision:2}]){
  await expect(collectProfileAcceptanceExport(f.profile.ownerId,async()=>({...f.list,items:[{...f.list.items[0],...change}]}),async()=>f.record,fresh().signal)).rejects.toThrow();
 }
});
it('cancellation prevents initial reads and stops before the next record after a late reply',async()=>{
 const f=await aiAcceptanceFixture(),second=await aiAcceptanceFixture(),controller=fresh(),list=vi.fn(async()=>f.list),read=vi.fn(async()=>f.record);controller.abort();
 await expect(collectProfileAcceptanceExport(f.profile.ownerId,list,read,controller.signal)).rejects.toThrow();expect(list).not.toHaveBeenCalled();expect(read).not.toHaveBeenCalled();
 const active=fresh(),late=vi.fn(async()=>{active.abort();return f.record;});
 await expect(collectProfileAcceptanceExport(f.profile.ownerId,async()=>({...f.list,items:[...f.list.items,...second.list.items]}),late,active.signal)).rejects.toThrow();expect(late).toHaveBeenCalledTimes(1);
});
it('a failed record fetch creates no complete result and is never retried',async()=>{
 const f=await aiAcceptanceFixture(),read=vi.fn(async()=>{throw Error('fixture transport');});
 await expect(collectProfileAcceptanceExport(f.profile.ownerId,async()=>f.list,read,fresh().signal)).rejects.toThrow();expect(read).toHaveBeenCalledTimes(1);
});
