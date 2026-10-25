import {afterEach,describe,expect,it,vi} from 'vitest';
import {requestJson} from '../lib/client-api';
afterEach(()=>vi.unstubAllGlobals());
describe('client transport',()=>{
 it('does not replay an uncertain write',async()=>{const fetch=vi.fn().mockRejectedValue(new TypeError('network'));vi.stubGlobal('fetch',fetch);await expect(requestJson('/api/service',{method:'POST'})).rejects.toMatchObject({status:0});expect(fetch).toHaveBeenCalledTimes(1);});
 it.each([401,403,409,429,500])('preserves status %i for recovery',async status=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'Ошибка'},{status})));await expect(requestJson('/api/service')).rejects.toMatchObject({status,message:'Ошибка'});});
 it('rejects malformed responses',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>upstream</html>')));await expect(requestJson('/api/service')).rejects.toThrow('некорректный');});
 it('requests fresh workspace without caching',async()=>{const fetch=vi.fn().mockResolvedValue(Response.json({revision:4}));vi.stubGlobal('fetch',fetch);expect(await requestJson('/api/service')).toEqual({revision:4});expect(fetch.mock.calls[0][1].cache).toBe('no-store');});
});
