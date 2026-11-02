import {afterEach,describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SavedLettersPanel from '../app/saved-letters-panel';
import {letterRequest,LetterClientError,LETTER_CLIENT_RESPONSE_BYTES,LETTER_CLIENT_TIMEOUT_MS} from '../lib/saved-letter-client';
import {savedLetterErrorText,savedLetterNoticeText} from '../lib/i18n/saved-letters';
const owner='11111111-1111-4111-8111-111111111111',signal=()=>new AbortController().signal;
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('saved-letter bounded transport and current presentation',()=>{
 it('keeps the owner, explicit action and literal UTF-8 JSON with no-store',async()=>{
  const body={action:'preview',snapshotJson:'{"text":"SQL 🧑‍💻\\r\\nПример"}'},value={literal:'SQL 🧑‍💻\r\nПример'},fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify(value)));vi.stubGlobal('fetch',fetcher);
  expect(await letterRequest('/api/letter-versions',owner,signal(),body)).toEqual(value);expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][1]).toMatchObject({method:'POST',cache:'no-store',headers:{'x-jobmatch-owner':owner,'Content-Type':'application/json'},body:JSON.stringify(body)});
 });
 it('refuses an error response without awaiting a stalled cancellation hook',async()=>{
  let cancelled=false;vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new ReadableStream({cancel(){cancelled=true;return new Promise<void>(()=>{});}}),{status:503})));await expect(letterRequest('/api/letter-versions',owner,signal())).rejects.toMatchObject({status:503,message:'LETTER_REQUEST_FAILED'});expect(cancelled).toBe(true);
 });
 it('aborts a stalled response even when fetch ignores its signal and cancellation never resolves',async()=>{
  let cancelled=false;vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new ReadableStream({cancel(){cancelled=true;return new Promise<void>(()=>{});}}))));const c=new AbortController(),reading=letterRequest('/api/letter-versions',owner,c.signal),checked=expect(reading).rejects.toMatchObject({status:502,message:'LETTER_REQUEST_FAILED'});await Promise.resolve();await Promise.resolve();c.abort();await checked;expect(cancelled).toBe(true);
 });
 it('enforces the unchanged full-body deadline without relying on a fetch implementation',async()=>{
  vi.useFakeTimers();let cancelled=false;vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(new ReadableStream({cancel(){cancelled=true;return new Promise<void>(()=>{});}}))));const reading=letterRequest('/api/letter-versions',owner,signal()),checked=expect(reading).rejects.toMatchObject({status:502});await vi.advanceTimersByTimeAsync(LETTER_CLIENT_TIMEOUT_MS+1);await checked;expect(cancelled).toBe(true);
 });
 it('enforces the exact existing byte budget on declared and chunked responses',async()=>{
  expect(LETTER_CLIENT_RESPONSE_BYTES).toBe(2100000);expect(LETTER_CLIENT_TIMEOUT_MS).toBe(20000);for(const declared of [true,false]){let cancelled=false;const stream=new ReadableStream<Uint8Array>({start(c){if(!declared)c.enqueue(new Uint8Array(LETTER_CLIENT_RESPONSE_BYTES+1));},cancel(){cancelled=true;return new Promise<void>(()=>{});}});vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(stream,{headers:declared?{'content-length':String(LETTER_CLIENT_RESPONSE_BYTES+1)}:{}})));await expect(letterRequest('/api/letter-versions',owner,signal())).rejects.toMatchObject({status:502});expect(cancelled).toBe(true);}
 });
 it('refuses invalid UTF-8 and JSON through fixed errors without returning raw text',async()=>{
  for(const bytes of [new Uint8Array([123,34,120,34,58,34,255,34,125]),new TextEncoder().encode('PRIVATE UPSTREAM')]){vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(bytes)));await expect(letterRequest('/api/letter-versions',owner,signal())).rejects.toEqual(new LetterClientError(502));}
 });
 it('renders semantic failures and notices in the current language, including an unknown write',()=>{
  expect(savedLetterErrorText({status:0,write:true},'en')).toContain('The save outcome is unknown.');expect(savedLetterErrorText({status:503,write:false},'ru')).toContain('недоступно');expect(savedLetterNoticeText({key:'saved',version:7},'en')).toContain('version 7 saved.');expect(savedLetterNoticeText({key:'saved',version:7},'ru')).toContain('версия 7');for(const status of [401,409,429,503,502,0])for(const locale of ['ru','en'] as const)expect(savedLetterErrorText({status,write:false},locale)).not.toContain('PRIVATE');
 });
 it('defaults to Russian and exposes optional English while unknown-owner operations stay disabled',()=>{
  const props={workspaceRevision:3,allowSave:true},ru=renderToStaticMarkup(createElement(SavedLettersPanel,props)),en=renderToStaticMarkup(createElement(SavedLettersPanel,{...props,locale:'en'}));expect(ru).toContain('Серверные версии писем');expect(en).toContain('Saved letter versions');expect(en).toContain('Server operations are unavailable.');expect(en).toContain('type="checkbox" disabled');expect(en).toContain('does not verify truth or meaning');expect(en).toContain('lang="en"');
 });
});
