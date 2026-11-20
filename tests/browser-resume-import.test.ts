import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import JSZip from 'jszip';
import {extractLegacyDoc} from '../mvp/browser-word-binary';
import {extractRtf,decodeResumeText,checkDocxZip} from '../mvp/browser-text-word';
import {parseResumeFile,normalizeImportedResume} from '../mvp/browser-resume-import';
const base='tests/fixtures/browser-import/';
describe('browser-local file input',()=>{
 it('extracts real LibreOffice Word97 binary Russian main story',()=>{
  const bytes=new Uint8Array(readFileSync(base+'word97-synthetic.doc'));
  expect([...bytes.slice(0,8)]).toEqual([208,207,17,224,161,177,26,225]);
  expect(normalizeImportedResume(extractLegacyDoc(bytes))).toBe(readFileSync(base+'word97-expected.txt','utf8'));
 });
 it('extracts RTF unicode and suppresses destinations without executing them',()=>{
  expect(normalizeImportedResume(extractRtf(new Uint8Array(readFileSync(base+'word97-synthetic.rtf'))))).toBe(readFileSync(base+'word97-expected.txt','utf8'));
  expect(extractRtf(new TextEncoder().encode('{\\rtf1 Visible {\\*\\unknown HIDDEN}{\\pict HIDDEN} text.}'))).toBe('Visible  text.');
 });
 it('rejects broken OLE and invalid directory chain',()=>{
  expect(()=>extractLegacyDoc(new Uint8Array(512))).toThrow();
  const b=new Uint8Array(readFileSync(base+'word97-synthetic.doc'));new DataView(b.buffer).setUint32(48,0xfffffffe,true);expect(()=>extractLegacyDoc(b)).toThrow();
 });
 it('parses TXT and genuine DOC without fetch',async()=>{
  const text=readFileSync(base+'word97-expected.txt','utf8');
  expect((await parseResumeFile(new File([text],'resume.TXT',{type:'text/plain'}))).text).toBe(text);
  expect((await parseResumeFile(new File([readFileSync(base+'word97-synthetic.doc')],'resume.doc',{type:'application/msword'}))).text).toBe(text);
 });
 it('rejects extension/type mismatch and renamed binaries',async()=>{
  await expect(parseResumeFile(new File(['this is not a word document'],'fake.doc'))).rejects.toThrow();
  await expect(parseResumeFile(new File(['valid enough resume content here'],'a.txt',{type:'image/png'}))).rejects.toThrow();
  await expect(parseResumeFile(new File(['%PDF-more than twenty bytes here'],'a.txt'))).rejects.toThrow();
 });
 it('rejects oversize and abort without truncation',async()=>{
  expect(()=>normalizeImportedResume('я'.repeat(100001))).toThrow();
  const a=new AbortController();a.abort();await expect(parseResumeFile(new File(['some resume text at least twenty'],'a.txt'),a.signal)).rejects.toHaveProperty('name','AbortError');
 });
 it('supports UTF16 BOM and cp1251 TXT',()=>{
  expect(decodeResumeText(Uint8Array.of(255,254,31,4,64,4))).toBe('Пр');expect(decodeResumeText(Uint8Array.of(207,240,232,226,229,242))).toBe('Привет');
 });
 it('rejects malformed RTF/ZIP and requires Word document entries',async()=>{
  expect(()=>extractRtf(new TextEncoder().encode('{\\rtf1 incomplete'))).toThrow();
  const z=new JSZip();z.file('not-word.txt','something');expect(()=>checkDocxZip(new Uint8Array(4))).toThrow();
  const b=await z.generateAsync({type:'uint8array'});expect(()=>checkDocxZip(b)).toThrow();
 });
});
