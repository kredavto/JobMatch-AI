import JSZip from 'jszip';
import {UserError} from './errors';
const xml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
/** Text-only OOXML: no fields, links, macros, templates or source metadata. */
export async function resumeDocx(text:string):Promise<Uint8Array>{
 if(text.length>200000)throw new UserError('Версия слишком велика для DOCX. Используйте TXT.',413,'DOCX_EXPORT_TOO_LARGE');
 // Reject instead of silently changing the saved facts.
 for(const c of text){const n=c.codePointAt(0)!;if((n<32&&![9,10,13].includes(n))||(n>=0xd800&&n<=0xdfff)||n===0xfffe||n===0xffff)throw new UserError('Текст содержит неподдерживаемые символы. Используйте TXT.',400,'DOCX_EXPORT_CHARACTERS');}
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 const paragraphs=text.replace(/\r\n?/g,'\n').split('\n').map(line=>'<w:p><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/><w:lang w:val="ru-RU"/></w:rPr>'+line.split('\t').map(t=>'<w:t xml:space="preserve">'+xml(t)+'</w:t>').join('<w:tab/>')+'</w:r></w:p>').join('');
 zip.file('word/document.xml','<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paragraphs+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>');
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
