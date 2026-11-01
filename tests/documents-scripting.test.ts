import {it,expect,vi,afterEach} from 'vitest';
import {extractDocument} from '../lib/documents';
afterEach(()=>vi.unstubAllGlobals());
function activePdf(){
 const stream='BT /F1 12 Tf 20 100 Td (SYNTHETIC PDF SQL) Tj ET';
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R /OpenAction 6 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream',
  '<< /S /JavaScript /JS (globalThis.JOBMATCH_PDF_SCRIPT_CANARY = true;) >>'
 ];
 let source='%PDF-1.4\n';const offsets:number[]=[];
 for(const [index,object] of objects.entries()){offsets.push(Buffer.byteLength(source));source+=(index+1)+' 0 obj\n'+object+'\nendobj\n';}
 const xref=Buffer.byteLength(source);source+='xref\n0 7\n0000000000 65535 f \n'+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return Buffer.from(source);
}
it('updated PDF text extraction preserves text without executing an embedded OpenAction',async()=>{
 vi.stubGlobal('JOBMATCH_PDF_SCRIPT_CANARY',false);
 expect(await extractDocument('synthetic-active.pdf',activePdf())).toContain('SYNTHETIC PDF SQL');
 expect(Reflect.get(globalThis,'JOBMATCH_PDF_SCRIPT_CANARY')).toBe(false);
});
