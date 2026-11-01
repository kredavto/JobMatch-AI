import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,rm,stat,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPdfOcr,runOcrCommand,OcrLimitError} from '../dist/worker/pdf-ocr.js';
import {runParser} from '../dist/worker/supervisor.js';
import {extractDocument} from '../dist/lib/documents.js';
import {rasterPdf,pdf} from './documents.mjs';
const native=process.platform==='linux'&&['/usr/bin/tesseract','/usr/bin/pdftoppm','/usr/bin/prlimit'].every(existsSync);
let bilingual=false;try{bilingual=native&&execFileSync('/usr/bin/tesseract',['--list-langs'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split(/\s+/).includes('rus');}catch{}
if(process.env.JOBMATCH_REQUIRE_OCR_TESTS==='1')assert.ok(native&&bilingual,'Required OCR engines/languages missing');
async function temporary(fn){const root=await mkdtemp(join(tmpdir(),'jobmatch-ocr-test-'));try{await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('OCR is lazy and never writes a temporary file for embedded text',async()=>temporary(async root=>{const ocr=createPdfOcr(pdf(),{root,run:async()=>assert.fail('Unexpected OCR')});try{assert.match(await extractDocument('text.pdf',pdf(),{readScannedPage:n=>ocr.readPage(n)}),/Synthetic resume SQL/);assert.equal(ocr.pages,0);assert.deepEqual(await readdir(root),[]);}finally{await ocr.dispose();}}));
test('OCR refuses invalid page/input before creating a workspace',async()=>temporary(async root=>{for(const page of [0,-1,31,1.5]){const ocr=createPdfOcr(Buffer.alloc(0),{root});await assert.rejects(ocr.readPage(page));}const big=createPdfOcr(Buffer.alloc(4000001),{root});await assert.rejects(big.readPage(1));assert.deepEqual(await readdir(root),[]);}));
test('OCR rejects a fourth scanned page instead of returning a truncated result',async()=>temporary(async root=>{let calls=0;const ocr=createPdfOcr(Buffer.from('synthetic'),{root,run:async(file,args)=>{calls++;return args.includes('--list-langs')?'eng\nrus':file.endsWith('tesseract')?'Synthetic OCR text':'';}});try{for(let page=1;page<=3;page++)await ocr.readPage(page);await assert.rejects(ocr.readPage(4),OcrLimitError);assert.equal(calls,7);assert.equal(ocr.pages,3);}finally{await ocr.dispose();}assert.deepEqual(await readdir(root),[]);}));
test('OCR failure discards its workspace and does not count a failed page',async()=>temporary(async root=>{const ocr=createPdfOcr(Buffer.from('synthetic'),{root,run:async(_file,args)=>{if(args.includes('--list-langs'))return 'eng\nrus';throw new Error('Synthetic tool failure');}});await assert.rejects(ocr.readPage(1));assert.equal(ocr.pages,0);await ocr.dispose();assert.deepEqual(await readdir(root),[]);}));
for(const text of ['\0private','Unpaired \ud800','x'.repeat(100001)])test('OCR rejects invalid or oversized output',async()=>temporary(async root=>{const ocr=createPdfOcr(Buffer.from('synthetic'),{root,run:async(file,args)=>args.includes('--list-langs')?'eng\nrus':file.endsWith('tesseract')?text:''});try{await assert.rejects(ocr.readPage(1));}finally{await ocr.dispose();}assert.deepEqual(await readdir(root),[]);}));
test('real raster PDF has no text layer; native OCR uses private bounded image and cleans it',{skip:!native,timeout:15000},async()=>temporary(async root=>{
 const bytes=await rasterPdf();await assert.rejects(extractDocument('scan.pdf',bytes));let imageChecked=false;
 const ocr=createPdfOcr(bytes,{root,languages:'eng',run:async(file,args)=>{
  const result=await runOcrCommand(file,args);
  if(file.endsWith('pdftoppm')){const names=await readdir(root);assert.equal(names.length,1);const directory=join(root,names[0]);assert.equal((await stat(directory)).mode&0o777,0o700);assert.equal((await stat(join(directory,'input.pdf'))).mode&0o777,0o600);
   const data=await readFile(join(directory,'page.pgm'));const header=/^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(data.subarray(0,100).toString());assert.ok(header);assert.ok(Number(header[1])<=2000&&Number(header[2])<=2000);assert.ok(data.length<=4_000_100);imageChecked=true;
  }return result;
 }});
 try{const text=await extractDocument('scan.pdf',bytes,{readScannedPage:n=>ocr.readPage(n)});assert.match(text,/Alex Example SQL/);assert.match(text,/2024 2025/);assert.equal(ocr.pages,1);assert.ok(imageChecked);const directory=join(root,(await readdir(root))[0]);assert.deepEqual((await readdir(directory)).sort(),['input.pdf']);}finally{await ocr.dispose();}assert.deepEqual(await readdir(root),[]);
}));
test('native command failure is redacted and empty PDF cannot become OCR text',{skip:!native},async()=>temporary(async root=>{const ocr=createPdfOcr(Buffer.from('%PDF-invalid'),{root,languages:'eng'});try{await assert.rejects(ocr.readPage(1),error=>error.message==='OCR failed');}finally{await ocr.dispose();}assert.deepEqual(await readdir(root),[]);}));
for(const [name,options,expected] of [['bilingual image PDF',{},true],['mixed text/image PDF',{pages:2,mixed:true},true],['over-budget image PDF',{pages:4},false],['blank PDF',{blank:true},false]])test('real isolated job: '+name,{skip:!bilingual,timeout:25000},async()=>{

  const result=await runParser(await rasterPdf(options),'pdf',undefined,{ocr:true});assert.equal(result.ok,expected,JSON.stringify(result));
  if(expected){assert.equal(result.ocrPages,1);assert.match(result.text,/Alex Example SQL/);assert.match(result.text,/Иван Тестов/);if(options.mixed)assert.match(result.text,/Embedded engineering experience/);}
  else assert.equal(result.code,options.pages===4?'OCR_LIMIT':'INVALID');
});
test('OCR remains disabled by default even when the supervisor process has an ambient OCR flag',{skip:!native,timeout:10000},async()=>{const previous=process.env.PARSER_WORKER_OCR;process.env.PARSER_WORKER_OCR='true';try{assert.deepEqual(await runParser(await rasterPdf(),'pdf'),{ok:false,code:'INVALID'});}finally{if(previous===undefined)delete process.env.PARSER_WORKER_OCR;else process.env.PARSER_WORKER_OCR=previous;}});

test('native command deadline terminates a stalled subprocess without exposing diagnostics',{skip:!native,timeout:7000},async()=>{await assert.rejects(runOcrCommand(process.execPath,['-e',"process.stderr.write('private synthetic diagnostic');setInterval(()=>{},1000)"]),error=>error.status===408&&error.message==='OCR deadline');});
test('native command output/encoding are bounded and missing engines are unavailable',{skip:!native},async()=>{
 await assert.rejects(runOcrCommand(process.execPath,['-e',"process.stdout.write('x'.repeat(500000))"]),error=>error.message==='OCR output limit');
 await assert.rejects(runOcrCommand(process.execPath,['-e',"process.stdout.write(Buffer.from([255]))"]),error=>error.message==='Invalid OCR encoding');
 await assert.rejects(runOcrCommand('/nonexistent-jobmatch-synthetic-engine',[]),error=>error.status===503&&error.message==='OCR unavailable');
});

test('missing requested OCR language refuses the job before writing input or scanning',async()=>temporary(async root=>{let commands=0;const ocr=createPdfOcr(Buffer.from('synthetic'),{root,run:async(_file,args)=>{commands++;assert.deepEqual(args,['--list-langs']);return 'List of available languages (1):\neng\n';}});await assert.rejects(ocr.readPage(1),error=>error.status===503&&error.message==='OCR unavailable');assert.equal(commands,1);assert.equal(ocr.pages,0);assert.deepEqual(await readdir(root),[]);}));
