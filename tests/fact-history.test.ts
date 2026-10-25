import {beforeEach,it,expect,vi} from 'vitest';import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({supabase:vi.fn(),quota:vi.fn(),identity:vi.fn()}));
vi.mock('../lib/db',()=>({supabase:db.supabase,consumeQuota:db.quota,identity:db.identity}));
import {GET} from '../app/api/fact-history/route';
const row={id:1,workspace_revision:2,kind:'change',captured_at:'2026-10-25T00:00:00Z',facts:[{id:'f1',text:'SQL',source:'user',verified:true}]};
beforeEach(()=>{vi.clearAllMocks();db.identity.mockResolvedValue({id:'owner',token:'jwt'});db.supabase.mockResolvedValue([row]);});
it('reads only owner history with bounded pagination',async()=>{const r=await GET(new NextRequest('https://app.test/api/fact-history?before=42'));expect(r.status).toBe(200);expect(db.supabase.mock.calls[0][0]).toContain('user_id=eq.owner&order=id.desc&limit=20&id=lt.42');expect(await r.json()).toEqual({rows:[row],next:1});});
it.each(['-1','abc','1.5','2147483648'])('rejects invalid cursor %s',async cursor=>{expect((await GET(new NextRequest('https://app.test/api/fact-history?before='+cursor))).status).toBe(400);expect(db.supabase).not.toHaveBeenCalled();});
it('requires authentication',async()=>{db.identity.mockRejectedValueOnce(new Error('AUTH'));expect((await GET(new NextRequest('https://app.test/api/fact-history')))).toHaveProperty('status',401);expect(db.supabase).not.toHaveBeenCalled();});
it('exports every page and terminal completion record',async()=>{db.supabase.mockResolvedValueOnce(Array.from({length:20},(_,i)=>({...row,id:30-i}))).mockResolvedValueOnce([row]).mockResolvedValueOnce([]);const r=await GET(new NextRequest('https://app.test/api/fact-history?export=1'));const lines=(await r.text()).trim().split('\n').map(s=>JSON.parse(s));expect(lines).toHaveLength(22);expect(lines.at(-1)).toEqual({complete:true});expect(db.supabase.mock.calls[1][0]).toContain('id=lt.11');});
it('does not label failed stream complete or expose details',async()=>{db.supabase.mockResolvedValueOnce(Array.from({length:20},(_,i)=>({...row,id:30-i}))).mockRejectedValueOnce(new Error('password=secret'));const r=await GET(new NextRequest('https://app.test/api/fact-history?export=1'));const text=await r.text();expect(text).toContain('"complete":false');expect(text).not.toContain('secret');expect(text).not.toContain('"complete":true');});
it('fails closed on provider schema change',async()=>{db.supabase.mockResolvedValueOnce([{facts:'bad'}]);expect((await GET(new NextRequest('https://app.test/api/fact-history')))).toHaveProperty('status',502);});
it('rejects a repeating provider page during export instead of looping',async()=>{
 db.supabase.mockResolvedValueOnce([{...row,id:5}]).mockResolvedValueOnce([{...row,id:5}]);
 const r=await GET(new NextRequest('https://app.test/api/fact-history?export=1'));const text=await r.text();
 expect(text).toContain('"complete":false');expect(text).not.toContain('"complete":true');expect(db.supabase).toHaveBeenCalledTimes(2);
});
it('does not label a cursor-truncated archive as a full export',async()=>{
 const r=await GET(new NextRequest('https://app.test/api/fact-history?export=1&before=42'));
 expect(r.status).toBe(400);expect(db.supabase).not.toHaveBeenCalled();
});
