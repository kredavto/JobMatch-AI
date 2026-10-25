import {beforeEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),supabase:vi.fn()}));
vi.mock('../lib/db',()=>db);
import {GET} from '../app/api/fact-history/route';
import {POST} from '../app/api/import/route';
import {requireExpectedOwner} from '../lib/http';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{vi.clearAllMocks();db.identity.mockResolvedValue({id:other,token:'fixture'});});
it.each(['','?export=1'])('blocks stale-owner history before any storage read: %s',async query=>{
 const response=await GET(new NextRequest('https://app.test/api/fact-history'+query,{headers:{'x-jobmatch-owner':owner}}));
 expect(response.status).toBe(409);expect(db.supabase).not.toHaveBeenCalled();expect(db.consumeQuota).not.toHaveBeenCalled();expect(response.headers.get('content-disposition')).toBeNull();
});
it('binds the download link to its originating account',async()=>{
 const response=await GET(new NextRequest('https://app.test/api/fact-history?export=1&expectedOwnerId='+owner));expect(response.status).toBe(409);expect(db.supabase).not.toHaveBeenCalled();
});
it('blocks stale-owner upload before reading or parsing the body',async()=>{
 const response=await POST(new NextRequest('https://app.test/api/import',{method:'POST',headers:{origin:'https://app.test','x-jobmatch-owner':owner},body:'invalid multipart'}));expect(response.status).toBe(409);expect(db.consumeQuota).not.toHaveBeenCalled();
});
it('accepts matching owner and legacy requests; rejects malformed and conflicting hints',()=>{
 expect(()=>requireExpectedOwner(new NextRequest('https://app.test'),owner)).not.toThrow();
 expect(()=>requireExpectedOwner(new NextRequest('https://app.test?expectedOwnerId='+owner,{headers:{'x-jobmatch-owner':owner}}),owner)).not.toThrow();
 for(const query of ['invalid',other,owner+'&expectedOwnerId='+other])expect(()=>requireExpectedOwner(new NextRequest('https://app.test?expectedOwnerId='+query),owner)).toThrow();
});
