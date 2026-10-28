import JSZip from 'jszip';
export async function docx(extra){const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/document.xml','<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic resume SQL — проверка</w:t></w:r></w:p></w:body></w:document>');
 if(extra)zip.file(extra,'unsupported fixture');return zip.generateAsync({type:'nodebuffer'});
}
export function pdf(){const stream='BT /F1 12 Tf 72 720 Td (Synthetic resume SQL) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let value='%PDF-1.4\n';const offsets=[];for(const [i,object] of objects.entries()){offsets.push(Buffer.byteLength(value));value+=`${i+1} 0 obj\n${object}\nendobj\n`;}
 const xref=Buffer.byteLength(value);value+='xref\n0 6\n0000000000 65535 f \n'+offsets.map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(value);
}
/** Synthetic raster-only pages: no searchable text layer or embedded resume data. */
export async function rasterPdf({pages=1,mixed=false,blank=false}={}){
 const {createCanvas,GlobalFonts}=await import('@napi-rs/canvas');const {deflateSync}=await import('node:zlib');
 GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','FixtureSans');
 const width=1200,height=900,canvas=createCanvas(width,height),context=canvas.getContext('2d');
 context.fillStyle='#fff';context.fillRect(0,0,width,height);context.fillStyle='#000';context.font='48px FixtureSans';
 if(!blank){context.fillText('Alex Example SQL',60,120);context.fillText('Python developer 2024 2025',60,210);context.fillText('Иван Тестов',60,330);context.fillText('Разработчик SQL 2024',60,420);}
 const rgba=context.getImageData(0,0,width,height).data,rgb=Buffer.alloc(width*height*3);for(let i=0,j=0;i<rgba.length;i+=4){rgb[j++]=rgba[i];rgb[j++]=rgba[i+1];rgb[j++]=rgba[i+2];}
 const image=deflateSync(rgb),objects=[],add=value=>{objects.push(Buffer.isBuffer(value)?value:Buffer.from(value));return objects.length;};
 add('<< /Type /Catalog /Pages 2 0 R >>');add('');
 const imageId=add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`),image,Buffer.from('\nendstream')]));
 const fontId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),kids=[];
 for(let i=0;i<pages;i++){
  const text=mixed&&i===0,stream=text?'BT /F1 18 Tf 60 350 Td (Embedded engineering experience) Tj ET':'q 600 0 0 450 0 0 cm /Im0 Do Q';
  const content=add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 450] /Resources << /Font << /F1 ${fontId} 0 R >> /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${content} 0 R >>`));
 }
 objects[1]=Buffer.from(`<< /Type /Pages /Kids [${kids.map(id=>id+' 0 R').join(' ')}] /Count ${pages} >>`);
 const chunks=[Buffer.from('%PDF-1.4\n')],offsets=[];let size=chunks[0].length;
 for(let i=0;i<objects.length;i++){offsets.push(size);const block=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),objects[i],Buffer.from('\nendobj\n')]);chunks.push(block);size+=block.length;}
 chunks.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF`));return Buffer.concat(chunks);
}
