import {beforeEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const db=vi.hoisted(()=>({identity:vi.fn(),consumeQuota:vi.fn(),readWorkspace:vi.fn()}));
const ai=vi.hoisted(()=>({aiConfig:vi.fn(),aiReview:vi.fn()}));
vi.mock('../lib/db',()=>db);vi.mock('../lib/ai-provider',()=>ai);
import {POST} from '../app/api/ai-review/route';
const body={consent:true,revision:1,expectedOwnerId:'11111111-1111-4111-8111-111111111111'};
const request=(data:unknown=body,origin='https://app.test')=>new NextRequest('https://app.test/api/ai-review',{method:'POST',headers:{origin},body:JSON.stringify(data)});
beforeEach(()=>{vi.clearAllMocks();});
it.each([body,{...body,consent:false},{...body,revision:0},{...body,expectedOwnerId:'22222222-2222-4222-8222-222222222222'},{...body,endpoint:'https://evil.test',vacancy:'Synthetic input'},{}])('policy refuses every same-origin payload before authentication, workspace reads, quota, or AI %j',async payload=>{
 const response=await POST(request(payload));expect(response.status).toBe(503);expect(await response.text()).toContain('Внешний ИИ отключён');expect(response.headers.get('cache-control')).toBe('no-store');
 expect(db.identity).not.toHaveBeenCalled();expect(db.readWorkspace).not.toHaveBeenCalled();expect(db.consumeQuota).not.toHaveBeenCalled();expect(ai.aiConfig).not.toHaveBeenCalled();expect(ai.aiReview).not.toHaveBeenCalled();
});
it('checks origin before authentication or inference',async()=>{expect((await POST(request(body,'https://evil.test'))).status).toBe(403);expect(db.identity).not.toHaveBeenCalled();expect(ai.aiReview).not.toHaveBeenCalled();});
