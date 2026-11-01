import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const local=vi.hoisted(()=>vi.fn());vi.mock('../lib/documents',()=>({extractDocument:local}));
import {parseImport} from '../lib/import-parser';
import {MAX_FILE_BYTES,MAX_PARSER_RESPONSE_BYTES,PARSER_ERRORS} from '../lib/parser-contract';
const token='worker_test_token_'.repeat(3);
beforeEach(()=>{vi.stubEnv('IMPORT_PARSER_MODE','worker');vi.stubEnv('IMPORT_PARSER_URL','https://owned-parser.example/extract');vi.stubEnv('IMPORT_PARSER_TOKEN',token);local.mockReset();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('keeps inline compatibility explicit and does not contact a worker',async()=>{
 vi.stubEnv('IMPORT_PARSER_MODE','inline');local.mockResolvedValue('Local confirmed text');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 expect(await parseImport('personal.docx',Buffer.from('document'))).toEqual({text:'Local confirmed text'});expect(local).toHaveBeenCalledWith('personal.docx',Buffer.from('document'));expect(fetch).not.toHaveBeenCalled();
});
it('sends bytes and extension only, without owner, filename, cookies or app credentials',async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json({ok:true,text:'Draft resume SQL'}));vi.stubGlobal('fetch',fetch);
 expect(await parseImport('Personal Full Name.DOCX',Buffer.from('document'))).toEqual({text:'Draft resume SQL'});
 expect(fetch).toHaveBeenCalledTimes(1);const [url,options]=fetch.mock.calls[0];expect(String(url)).toBe('https://owned-parser.example/extract');
 expect(options.headers).toEqual({Authorization:'Bearer '+token,'Content-Type':'application/octet-stream','X-File-Extension':'docx'});
 expect(Buffer.from(options.body).toString()).toBe('document');expect(options.redirect).toBe('error');expect(options.cache).toBe('no-store');expect(local).not.toHaveBeenCalled();
});
it.each(['http://owned-parser.example/extract','https://user:secret@owned-parser.example/extract','https://owned-parser.example/extract#secret','https://owned-parser.example/extract?secret=token','bad','https://owned-parser.example/other','https://owned-parser.example/extract/'])('rejects unsafe configured endpoint %s',async endpoint=>{
 vi.stubEnv('IMPORT_PARSER_URL',endpoint);const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await expect(parseImport('resume.pdf',Buffer.from('PDF'))).rejects.toMatchObject({status:503});expect(fetch).not.toHaveBeenCalled();expect(local).not.toHaveBeenCalled();
});
it.each(['','short','key\n'.repeat(12)])('fails closed on missing/invalid worker credentials',async key=>{vi.stubEnv('IMPORT_PARSER_TOKEN',key);vi.stubGlobal('fetch',vi.fn());await expect(parseImport('a.txt',Buffer.from('text input'))).rejects.toMatchObject({status:503});expect(fetch).not.toHaveBeenCalled();expect(local).not.toHaveBeenCalled();});
it('rejects an unknown mode without inline fallback',async()=>{vi.stubEnv('IMPORT_PARSER_MODE','typo');await expect(parseImport('a.txt',Buffer.from('text input'))).rejects.toMatchObject({status:503});expect(local).not.toHaveBeenCalled();});
it.each(['INVALID','TOO_LARGE','TIMEOUT','BUSY','UNAVAILABLE'] as const)('maps only a matching fixed worker code %s',async code=>{
 const expected=PARSER_ERRORS[code];const fetch=vi.fn().mockResolvedValue(Response.json({ok:false,code},{status:expected.status}));vi.stubGlobal('fetch',fetch);
 await expect(parseImport('a.pdf',Buffer.from('document'))).rejects.toMatchObject(expected);expect(fetch).toHaveBeenCalledTimes(1);expect(local).not.toHaveBeenCalled();
});
it.each([null,{ok:true,text:'Invalid \ud800 text'},{ok:true,text:'Invalid \0 text'},{ok:true,text:'x'},{ok:true,text:'x'.repeat(100001)},{ok:true,text:'Valid text',internal:'sensitive'},{ok:false,code:'EXEC',error:'secret'}])('rejects unexpected worker output without exposing it',async data=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(data)));await expect(parseImport('a.pdf',Buffer.from('document'))).rejects.toMatchObject({status:503,message:PARSER_ERRORS.UNAVAILABLE.message});expect(local).not.toHaveBeenCalled();
});
it.each([[{ok:true,text:'Valid resume'},500],[{ok:false,code:'INVALID'},200],[{ok:false,code:'TIMEOUT'},400]] as const)('rejects status/protocol disagreement',async(data,status)=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(data,{status})));await expect(parseImport('a.pdf',Buffer.from('document'))).rejects.toMatchObject({status:503});});
it('bounds the response stream and never prints a worker diagnostic',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('private data',{headers:{'Content-Type':'application/json','Content-Length':String(MAX_PARSER_RESPONSE_BYTES+1)}})));await expect(parseImport('a.pdf',Buffer.from('document'))).rejects.toMatchObject({message:PARSER_ERRORS.UNAVAILABLE.message,status:503});});
it('never retries network/redirect failures or falls back to the inline parser',async()=>{const fetch=vi.fn().mockRejectedValue(new Error('private connection details '+token));vi.stubGlobal('fetch',fetch);await expect(parseImport('a.pdf',Buffer.from('document'))).rejects.toMatchObject({message:PARSER_ERRORS.UNAVAILABLE.message,status:503});expect(fetch).toHaveBeenCalledTimes(1);expect(local).not.toHaveBeenCalled();});
it('rejects unsupported extensions and oversized input before transmission',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await expect(parseImport('a.exe',Buffer.from('text'))).rejects.toMatchObject({status:400});await expect(parseImport('a.pdf',Buffer.alloc(MAX_FILE_BYTES+1))).rejects.toMatchObject({status:413});expect(fetch).not.toHaveBeenCalled();});
it('has a total timeout independent of a stalled fetch',async()=>{
 vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>new Promise(()=>{})));
 const check=expect(parseImport('a.pdf',Buffer.from('document'))).rejects.toMatchObject({status:408});await vi.advanceTimersByTimeAsync(20000);await check;expect(local).not.toHaveBeenCalled();
});
it('propagates caller cancellation to the transport',async()=>{const controller=new AbortController();vi.stubGlobal('fetch',vi.fn().mockImplementation((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))));const check=expect(parseImport('a.pdf',Buffer.from('document'),controller.signal)).rejects.toMatchObject({status:408});controller.abort();await check;});

it('cancels the transport when a response is rejected before reading its body',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response('untrusted diagnostics',{headers:{'Content-Type':'text/html'}}));vi.stubGlobal('fetch',fetch);
 await expect(parseImport('a.pdf',Buffer.from('document'))).rejects.toMatchObject({status:503});expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
});

it('preserves strictly bounded OCR page metadata for PDF without another transmission',async()=>{const fetch=vi.fn().mockResolvedValue(Response.json({ok:true,text:'Recognised resume SQL',ocrPages:2}));vi.stubGlobal('fetch',fetch);expect(await parseImport('private.pdf',Buffer.from('document'))).toEqual({text:'Recognised resume SQL',ocrPages:2});expect(fetch).toHaveBeenCalledTimes(1);});
it.each([0,4,1.5,'1',null])('rejects malformed OCR metadata %j',async value=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({ok:true,text:'Recognised resume SQL',ocrPages:value})));await expect(parseImport('a.pdf',Buffer.from('document'))).rejects.toMatchObject({status:503});});
it.each(['txt','docx'])('refuses OCR provenance or OCR_LIMIT on non-PDF %s',async ext=>{vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>Response.json({ok:true,text:'Recognised text SQL',ocrPages:1})));await expect(parseImport('a.'+ext,Buffer.from('document'))).rejects.toMatchObject({status:503});vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>Response.json({ok:false,code:'OCR_LIMIT'},{status:400})));await expect(parseImport('a.'+ext,Buffer.from('document'))).rejects.toMatchObject({status:503});});
it('maps an entire-document OCR page refusal without a partial result',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({ok:false,code:'OCR_LIMIT'},{status:400})));await expect(parseImport('a.pdf',Buffer.from('document'))).rejects.toMatchObject(PARSER_ERRORS.OCR_LIMIT);});
