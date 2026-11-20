import {describe,expect,it} from 'vitest';
import {extractPdfResume,extractPngResume,parseResumePngHeader,resumeScanScale,textFromPdfItems} from '../mvp/resume-pdf-png';

function header(width:number,height:number){
 const bytes=new Uint8Array(33);
 bytes.set([137,80,78,71,13,10,26,10]);
 const view=new DataView(bytes.buffer);
 view.setUint32(8,13);view.setUint32(12,0x49484452);view.setUint32(16,width);view.setUint32(20,height);
 return bytes;
}
describe('PDF/PNG local extraction bounds',()=>{
 it('checks the PNG dimensions before decoding',()=>{
  expect(parseResumePngHeader(header(1200,800))).toEqual({width:1200,height:800});
  expect(()=>parseResumePngHeader(header(8000,8000))).toThrow(/мегапикселей/);
  expect(()=>parseResumePngHeader(header(0,800))).toThrow(/неверные размеры/);
  expect(()=>parseResumePngHeader(new Uint8Array(25))).toThrow(/не PNG/);
  const bad=header(1200,800);bad[11]=12;
  expect(()=>parseResumePngHeader(bad)).toThrow(/Заголовок/);
 });
 it('never renders a scan beyond the target pixel and axis bounds',()=>{
  for(const [width,height] of [[1200,800],[8000,1500],[1500,8000],[4000,4000]]){
   const scale=resumeScanScale(width,height,2.8);
   expect(Math.floor(width*scale)).toBeLessThanOrEqual(2400);
   expect(Math.floor(height*scale)).toBeLessThanOrEqual(2400);
   expect(Math.floor(width*scale)*Math.floor(height*scale)).toBeLessThanOrEqual(4_000_000);
  }
  expect(()=>resumeScanScale(Number.POSITIVE_INFINITY,800,1)).toThrow(/размер/);
 });
 it('takes selectable text, reconstructs adjacent pieces and rejects oversized text without truncation',()=>{
  const item=(str:string,x:number,y:number,hasEOL=false)=>({str,transform:[10,0,0,10,x,y],width:12,height:10,dir:'ltr',fontName:'fixture',hasEOL});
  expect(textFromPdfItems([item('Built',0,20),item('17',17,20),item('reports',35,20,true),item('Отчёты',0,9)])).toBe('Built 17 reports\nОтчёты');
  expect(textFromPdfItems([item('x'.repeat(100000),0,20)])).toHaveLength(100000);
  expect(()=>textFromPdfItems([item('x'.repeat(100001),0,20)])).toThrow(/100 000/);
 });
 it('short-circuits a caller-aborted import without requiring a browser',async()=>{
  const signal=AbortSignal.abort(new DOMException('Отмена','AbortError'));
  await expect(extractPdfResume(new File(['%PDF-1.0'],'x.pdf'),signal)).rejects.toHaveProperty('name','AbortError');
  await expect(extractPngResume(new File([header(1200,800)],'x.png'),signal)).rejects.toHaveProperty('name','AbortError');
 });
});
