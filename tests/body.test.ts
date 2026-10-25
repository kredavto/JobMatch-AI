import {it,expect,vi} from 'vitest';import {boundedBody} from '../lib/body';import {failure} from '../lib/http';import {UserError} from '../lib/errors';
it('reads bounded request',async()=>expect(new TextDecoder().decode(await boundedBody(new Request('https://example.com',{method:'POST',body:'abc'}),3))).toBe('abc'));
it('enforces actual bytes without header',async()=>expect(boundedBody(new Request('https://example.com',{method:'POST',body:'abcde'}),3)).rejects.toThrow());
it('rejects declared oversized body',async()=>expect(boundedBody(new Request('https://example.com',{method:'POST',body:'a',headers:{'content-length':'99'}}),3)).rejects.toThrow());
it('cancels a chunked body at the bound',async()=>{const cancel=vi.fn();const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(4));},cancel});await expect(boundedBody(new Request('https://example.com',{method:'POST',body:stream,duplex:'half'} as RequestInit),3)).rejects.toThrow();expect(cancel).toHaveBeenCalled();});
it('redacts internal error detail',async()=>{const r=failure(new Error('postgres secret: /var/task/token'));expect(r.status).toBe(500);expect(JSON.stringify(await r.json())).not.toContain('secret');});
it('returns upload limit status',()=>expect(failure(new UserError('Too large',413)).status).toBe(413));
it('provides retry hint for quota',()=>expect(failure(new Error('RATE')).headers.get('Retry-After')).toBe('60'));
it('times out a stalled stream even when its cancel hook never settles',async()=>{
 vi.useFakeTimers();try{const cancel=vi.fn(()=>new Promise<void>(()=>{}));const stream=new ReadableStream<Uint8Array>({cancel});const req=new Request('https://example.com',{method:'POST',body:stream,duplex:'half'} as RequestInit);
 const result=boundedBody(req,100,50);const assertion=expect(result).rejects.toMatchObject({status:408});await vi.advanceTimersByTimeAsync(50);await assertion;expect(cancel).toHaveBeenCalledTimes(1);expect(req.body!.locked).toBe(false);expect(vi.getTimerCount()).toBe(0);
 }finally{vi.useRealTimers();}
});
it('uses a total deadline instead of extending it for each chunk',async()=>{
 vi.useFakeTimers();try{let controller!:ReadableStreamDefaultController<Uint8Array>;const stream=new ReadableStream<Uint8Array>({start(c){controller=c;}});const req=new Request('https://example.com',{method:'POST',body:stream,duplex:'half'} as RequestInit);
 const result=boundedBody(req,100,50);const assertion=expect(result).rejects.toMatchObject({status:408});await vi.advanceTimersByTimeAsync(30);controller.enqueue(new Uint8Array([1]));await vi.advanceTimersByTimeAsync(20);await assertion;
 }finally{vi.useRealTimers();}
});
it('cancels an interrupted request without returning partial text',async()=>{
 const abort=new AbortController(),cancel=vi.fn();const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array([1]));},cancel});const req=new Request('https://example.com',{method:'POST',body:stream,signal:abort.signal,duplex:'half'} as RequestInit);
 const result=boundedBody(req,100);const assertion=expect(result).rejects.toMatchObject({status:408});abort.abort();await assertion;expect(cancel).toHaveBeenCalledTimes(1);expect(req.body!.locked).toBe(false);
});
it('rejects an already aborted request',async()=>{const abort=new AbortController();abort.abort();await expect(boundedBody(new Request('https://example.com',{method:'POST',body:'abc',signal:abort.signal}),100)).rejects.toMatchObject({status:408});});
it('does not let a failing cancel hook mask the size error',async()=>{const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(4));},cancel(){throw new Error('private cancel detail');}});await expect(boundedBody(new Request('https://example.com',{method:'POST',body:stream,duplex:'half'} as RequestInit),3)).rejects.toMatchObject({status:413});});
it('redacts stream errors and releases the lock',async()=>{const stream=new ReadableStream<Uint8Array>({start(c){c.error(new Error('private stream detail'));}});const req=new Request('https://example.com',{method:'POST',body:stream,duplex:'half'} as RequestInit);await expect(boundedBody(req,100)).rejects.toMatchObject({status:400,message:'Не удалось прочитать загрузку. Повторите попытку.'});expect(req.body!.locked).toBe(false);});
it('clears deadline after successful reads',async()=>{vi.useFakeTimers();try{await boundedBody(new Request('https://example.com',{method:'POST',body:'abc'}),100);expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();}});
