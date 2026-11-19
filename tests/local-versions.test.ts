import {describe,it,expect} from 'vitest';
import {VERSION_STORAGE_KEY,readVersions,writeVersions,type LocalVersion} from '../mvp/local-versions';
const v:LocalVersion={id:'11111111-1111-4111-8111-111111111111',createdAt:'2026-11-19T00:00:00.000Z',name:'Синтетика',source:'  Составил 5 отчётов SQL.\r\nНе руководил командой.  ',title:'Аналитик',text:'Составил 5 отчётов SQL.',coverLetter:'Синтетическое письмо.'};
function storage(initial:string|null=null){let raw=initial;return {getItem:()=>raw,setItem:(key:string,value:string)=>{expect(key).toBe(VERSION_STORAGE_KEY);raw=value;}};}
describe('explicit separate local versions',()=>{
 it('round trips exact source and result after reload without modifying the draft',()=>{const s=storage();const before=JSON.stringify(v);const raw=writeVersions(s,null,[v]);expect(readVersions(s.getItem())).toEqual([v]);expect(raw).toBe(s.getItem());expect(JSON.stringify(v)).toBe(before);});
 it('deletes only the selected version',()=>{const s=storage();const second={...v,id:'22222222-2222-4222-8222-222222222222'};const raw=writeVersions(s,null,[v,second]);writeVersions(s,raw,[second]);expect(readVersions(s.getItem())).toEqual([second]);});
 it('rejects corrupt, duplicate and unbounded state',()=>{for(const raw of ['bad','{}',JSON.stringify({version:1,versions:[v,v]}),'x'.repeat(1500001)])expect(()=>readVersions(raw)).toThrow();});
 it('never replaces existing corrupt data',()=>{const s=storage('bad');expect(()=>writeVersions(s,'bad',[v])).toThrow();expect(s.getItem()).toBe('bad');});
 it('rejects stale tabs',()=>{const s=storage();const raw=writeVersions(s,null,[v]);expect(()=>writeVersions(s,null,[])).toThrow(/другой вкладке/);expect(s.getItem()).toBe(raw);});
 it('keeps old data on quota failure',()=>{const raw=JSON.stringify({version:1,versions:[v]});const s={getItem:()=>raw,setItem:()=>{throw new Error('QuotaExceededError');}};expect(()=>writeVersions(s,raw,[])).toThrow('QuotaExceededError');expect(readVersions(s.getItem())).toEqual([v]);});
 it('bounds versions, fields and escaped serialization on write',()=>{const s=storage();expect(()=>writeVersions(s,null,Array.from({length:4},(_,i)=>({...v,id:`00000000-0000-4000-8000-00000000000${i}`})))).toThrow();expect(()=>writeVersions(s,null,[{...v,source:'x'.repeat(100001)}])).toThrow();expect(()=>writeVersions(s,null,[{...v,source:'\u0000'.repeat(100000),text:'\u0000'.repeat(200000)}])).toThrow();expect(s.getItem()).toBe(null);});
});
