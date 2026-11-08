import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {UserError} from '../lib/errors';
let fontBytes:Promise<Uint8Array>|undefined;
export async function resumePdf(text:string){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 fontBytes??=readFile(path.join(process.cwd(),'mvp/fonts/DejaVuSans.ttf'));
 const font=await doc.embedFont(await fontBytes,{subset:true});
 const size=10.5,lineHeight=15,margin=48,width=595.28,height=841.89;
 let page=doc.addPage([width,height]),y=height-margin;
 const characters=new Set(font.getCharacterSet());
 const clean=text.replace(/\r\n?/g,'\n').replaceAll('\t','    ');
 for(const char of clean){if(char!=='\n'&&!characters.has(char.codePointAt(0)!))throw new UserError('В резюме есть символы, которые не поддерживает PDF-шрифт. Выберите Word.',422);}
 const draw=(line:string)=>{if(y<margin){if(doc.getPageCount()>=50)throw new UserError('Для PDF слишком много страниц. Выберите Word.',413);page=doc.addPage([width,height]);y=height-margin;}page.drawText(line,{x:margin,y,font,size,color:rgb(.08,.12,.18)});y-=lineHeight;};
 for(const paragraph of clean.split('\n')){
  if(!paragraph){draw('');continue;}
  let line='';for(const char of paragraph){if(font.widthOfTextAtSize(line+char,size)>width-margin*2&&line){const space=line.lastIndexOf(' ');if(space>line.length*.5){draw(line.slice(0,space));line=line.slice(space+1)+char;}else{draw(line);line=char;}}else line+=char;}draw(line);
 }
 doc.setTitle('');doc.setAuthor('');doc.setCreator('JobMatch');doc.setProducer('JobMatch');
 return doc.save();
}
