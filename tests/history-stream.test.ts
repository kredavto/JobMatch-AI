import {it,expect,vi} from 'vitest';
import {validateHistoryPage} from '../lib/history-schema';
import {historyStream} from '../lib/history-stream';
const row=(id:number)=>({id,workspace_revision:1,kind:'change' as const,captured_at:'2026-10-25T00:00:00Z',facts:[]});
const page=(ids:number[])=>({rows:ids.map(row),next:ids.at(-1)??null});
it('validates ordering, cursor and malformed nested facts',()=>{
 expect(validateHistoryPage(page([5,3]),6)).toEqual(page([5,3]));
 for(const value of [page([3,5]),page([3,3]),{...page([3]),next:9},{...page([3]),next:null},{rows:[{...row(3),facts:null}],next:3}]){
  expect(()=>validateHistoryPage(value,4)).toThrow('INVALID_HISTORY');
 }
 expect(()=>validateHistoryPage(page([4]),4)).toThrow();
 expect(()=>validateHistoryPage({rows:[{...row(1),captured_at:'bad'}],next:1})).toThrow();
});
it('continues short pages until the empty page and emits a single terminal marker',async()=>{
 const read=vi.fn().mockResolvedValueOnce(page([2])).mockResolvedValueOnce(page([]));
 const text=await new Response(historyStream(page([5]),read)).text();
 const lines=text.trim().split('\n').map(s=>JSON.parse(s));
 expect(lines.map(r=>r.id??r.complete)).toEqual([5,2,true]);
 expect(read.mock.calls.map(c=>c[0])).toEqual([5,2]);
});
it('marks midstream errors incomplete without leaking details',async()=>{
 const read=vi.fn().mockRejectedValue(new Error('token=secret'));
 const text=await new Response(historyStream(page([5]),read)).text();
 expect(text).toContain('"complete":false');expect(text).not.toContain('"complete":true');expect(text).not.toContain('secret');
});
it.each([{rows:1,bytes:10000},{rows:10,bytes:1}])('enforces output bounds without false completion',async limits=>{
 const text=await new Response(historyStream(page([5,4]),vi.fn(),limits)).text();
 expect(text).toContain('"complete":false');expect(text).not.toContain('"complete":true');
});
it('does not fetch another page after cancellation',async()=>{
 const read=vi.fn();const reader=historyStream(page([5,4]),read).getReader();
 await reader.read();await reader.cancel();expect(read).not.toHaveBeenCalled();
});
it('does not enqueue a result after cancellation of an in-flight read',async()=>{
 let resolve!:(value:ReturnType<typeof page>)=>void;
 const read=vi.fn(()=>new Promise<ReturnType<typeof page>>(done=>{resolve=done;}));
 const reader=historyStream(page([5]),read).getReader();await reader.read();
 await vi.waitFor(()=>expect(read).toHaveBeenCalledTimes(1));await reader.cancel();resolve(page([4]));
 expect(await reader.read()).toEqual({done:true,value:undefined});
});
