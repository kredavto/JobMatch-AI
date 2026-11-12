import {describe,it,expect,vi,afterEach} from 'vitest';
const {lookup,request}=vi.hoisted(()=>({lookup:vi.fn(),request:vi.fn()}));
vi.mock('node:dns/promises',()=>({lookup}));
vi.mock('node:https',()=>({request}));
import {loadVacancy} from '../mvp/vacancy';
afterEach(()=>{vi.resetAllMocks();vi.restoreAllMocks();});
describe('vacancy DNS cancellation',()=>{
 it('does not start DNS or HTTP after prior cancellation',async()=>{
  const controller=new AbortController();controller.abort();
  await expect(loadVacancy('https://example.com/job',new Request('https://preview.example',{signal:controller.signal}))).rejects.toThrow();
  expect(lookup).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();
 });
 it('releases the request while DNS is pending and ignores a late resolution',async()=>{
  let resolve!:(value:{address:string;family:number}[])=>void;
  lookup.mockImplementation(()=>new Promise(done=>{resolve=done;}));
  const controller=new AbortController();const result=loadVacancy('https://example.com/job',new Request('https://preview.example',{signal:controller.signal}));
  controller.abort();await expect(result).rejects.toThrow('Не удалось загрузить');
  resolve([{address:'8.8.8.8',family:4}]);await Promise.resolve();
  expect(request).not.toHaveBeenCalled();
 });
 it('applies the existing 15-second deadline while DNS remains pending',async()=>{
  lookup.mockImplementation(()=>new Promise(()=>{}));
  const deadline=new AbortController();
  const timeout=vi.spyOn(AbortSignal,'timeout').mockReturnValue(deadline.signal);
  const result=loadVacancy('https://example.com/job',new Request('https://preview.example'));
  expect(timeout).toHaveBeenCalledWith(15000);
  deadline.abort(new DOMException('Deadline exceeded','TimeoutError'));
  await expect(result).rejects.toThrow('Не удалось загрузить');expect(request).not.toHaveBeenCalled();
 });
 it('handles late DNS failure without an unhandled rejection',async()=>{
  let reject!:(reason:Error)=>void;lookup.mockImplementation(()=>new Promise((_done,fail)=>{reject=fail;}));
  const controller=new AbortController();const result=loadVacancy('https://example.com/job',new Request('https://preview.example',{signal:controller.signal}));
  controller.abort();await expect(result).rejects.toThrow();reject(new Error('late DNS failure'));await Promise.resolve();
  expect(request).not.toHaveBeenCalled();
 });
 it('still rejects mixed public/private DNS answers before HTTP',async()=>{
  lookup.mockResolvedValue([{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]);
  await expect(loadVacancy('https://example.com/job',new Request('https://preview.example'))).rejects.toThrow('недоступна');
  expect(request).not.toHaveBeenCalled();
 });
});
