import {it,expect,vi} from 'vitest';import {boundedBody} from '../lib/body';import {failure} from '../lib/http';import {UserError} from '../lib/errors';
it('reads bounded request',async()=>expect(new TextDecoder().decode(await boundedBody(new Request('https://example.com',{method:'POST',body:'abc'}),3))).toBe('abc'));
it('enforces actual bytes without header',async()=>expect(boundedBody(new Request('https://example.com',{method:'POST',body:'abcde'}),3)).rejects.toThrow());
it('rejects declared oversized body',async()=>expect(boundedBody(new Request('https://example.com',{method:'POST',body:'a',headers:{'content-length':'99'}}),3)).rejects.toThrow());
it('cancels a chunked body at the bound',async()=>{const cancel=vi.fn();const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(4));},cancel});await expect(boundedBody(new Request('https://example.com',{method:'POST',body:stream,duplex:'half'} as RequestInit),3)).rejects.toThrow();expect(cancel).toHaveBeenCalled();});
it('redacts internal error detail',async()=>{const r=failure(new Error('postgres secret: /var/task/token'));expect(r.status).toBe(500);expect(JSON.stringify(await r.json())).not.toContain('secret');});
it('returns upload limit status',()=>expect(failure(new UserError('Too large',413)).status).toBe(413));
it('provides retry hint for quota',()=>expect(failure(new Error('RATE')).headers.get('Retry-After')).toBe('60'));
