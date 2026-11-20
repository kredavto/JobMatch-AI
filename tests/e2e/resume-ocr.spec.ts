import {readFileSync} from 'node:fs';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument,rgb} from 'pdf-lib';
import {expect,test} from '@playwright/test';

test.use({serviceWorkers:'block'});
const lines=['Тестовое резюме','Инженер по данным','Подготовил 17 отчётов.','Работал с Python и SQL.','Synthetic resume','Built 17 reports with Python.'];
let png:Buffer,scan:Buffer,searchable:Buffer;
test.beforeAll(async()=>{
 const fontBytes=readFileSync('mvp/fonts/DejaVuSans.ttf');
 GlobalFonts.register(fontBytes,'JobMatchFixtureFont');
 const canvas=createCanvas(1200,800);
 const context=canvas.getContext('2d');
 context.fillStyle='white';context.fillRect(0,0,1200,800);context.fillStyle='black';
 context.font='46px JobMatchFixtureFont';
 for(let i=0;i<lines.length;i++)context.fillText(lines[i],80,100+i*85);
 png=canvas.toBuffer('image/png');
 const imageDoc=await PDFDocument.create(),image=await imageDoc.embedPng(png);
 imageDoc.addPage([600,400]).drawImage(image,{x:0,y:0,width:600,height:400});
 scan=Buffer.from(await imageDoc.save());
 const textDoc=await PDFDocument.create();textDoc.registerFontkit(fontkit);
 const font=await textDoc.embedFont(fontBytes,{subset:true}),page=textDoc.addPage([600,400]);
 for(let i=0;i<lines.length;i++)page.drawText(lines[i],{x:40,y:350-i*37,font,size:20,color:rgb(0,0,0)});
 searchable=Buffer.from(await textDoc.save());
});

for(const kind of ['native pdf','scan pdf','png'] as const){
 test('reads synthetic bilingual '+kind+' in browser without file egress',async({page,context,baseURL})=>{
  const origin=new URL(baseURL!).origin;
  const writes:string[]=[],offsite:string[]=[],assets:string[]=[],errors:string[]=[];
  context.on('request',request=>{
   const url=new URL(request.url());
   if(url.origin!==origin)offsite.push(url.origin);
   if(!['GET','HEAD'].includes(request.method()))writes.push(url.pathname);
   if(url.pathname.startsWith('/resume-assets/'))assets.push(url.pathname);
  });
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await context.route('**/*',route=>{
   const request=route.request();
   return new URL(request.url()).origin===origin&&['GET','HEAD'].includes(request.method())?route.continue():route.abort();
  });
  await page.goto('/');
  const docCsp=(await page.request.get('/')).headers()['content-security-policy'];
  expect(docCsp).toContain("worker-src 'self'");
  expect(docCsp).not.toContain('wasm-unsafe-eval');
  const engine=kind==='png'?'/resume-assets/ocr-7.0.0/worker.min.js':'/resume-assets/pdf-6.2.108/pdf.worker.mjs';
  const workerHeaders=(await page.request.head(engine)).headers();
  expect(workerHeaders['content-security-policy']).toContain("script-src 'self' 'wasm-unsafe-eval'");
  expect(workerHeaders['content-security-policy']).toContain("connect-src 'self'");
  expect(assets).toEqual([]);
  await page.getByLabel('Файл резюме',{exact:true}).setInputFiles({name:kind==='png'?'resume.png':'resume.pdf',mimeType:kind==='png'?'image/png':'application/pdf',buffer:kind==='png'?png:kind==='native pdf'?searchable:scan});
  await page.getByRole('button',{name:'Прочитать файл',exact:true}).click();
  await expect(page.getByText('Файл прочитан. Выберите, как использовать резюме.')).toBeVisible({timeout:45000});
  await page.getByText('Проверить извлечённый текст',{exact:true}).click();
  const output=page.getByLabel('Извлечённый текст для проверки');
  if(kind==='native pdf'){
   expect(await output.textContent()).toBe(lines.join('\n'));
   expect(assets.some(path=>path.includes('/ocr-'))).toBe(false);
  }else{
   await expect(output).toHaveText(/Инженер по данным/iu);
   await expect(output).toHaveText(/17 отч[её]тов/iu);
   await expect(output).toHaveText(/Built 17 reports with Python/iu);
   expect(assets).toEqual(expect.arrayContaining(['/resume-assets/ocr-7.0.0/lang/rus.traineddata.gz','/resume-assets/ocr-7.0.0/lang/eng.traineddata.gz']));
  }
  expect(assets).toContain(engine);
  expect(writes).toEqual([]);
  expect(offsite).toEqual([]);
  expect(errors).toEqual([]);
 });
}
