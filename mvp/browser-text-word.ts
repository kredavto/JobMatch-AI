export function decodeResumeText(bytes:Uint8Array):string{
 if(bytes[0]===0xff&&bytes[1]===0xfe)return new TextDecoder('utf-16le',{fatal:true}).decode(bytes.subarray(2));
 if(bytes[0]===0xfe&&bytes[1]===0xff)return new TextDecoder('utf-16be',{fatal:true}).decode(bytes.subarray(2));
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return new TextDecoder('windows-1251',{fatal:true}).decode(bytes);}
}
export function extractRtf(bytes:Uint8Array):string{
 const src=Array.from(bytes,b=>String.fromCharCode(b)).join('');if(!/^\{\\rtf1\b/.test(src))throw Error('Неверная структура RTF.');
 type State={skip:boolean;uc:number;codepage:string};const stack:State[]=[];let state:State={skip:false,uc:1,codepage:'windows-1252'},out='',fallback=0,closed=false;
 const emit=(s:string)=>{if(fallback){fallback--;return;}if(!state.skip){out+=s;if(out.length>100000)throw Error('В RTF слишком много текста.');}};
 const destinations=new Set(['fonttbl','colortbl','stylesheet','info','pict','object','header','headerl','headerr','footer','footerl','footerr','filetbl','listtable','listoverridetable','generator','datastore','themedata','xmlnstbl','fldinst']);
 for(let i=0;i<src.length;){const c=src[i++];if(c==='{'){if(closed||stack.length>100)throw Error('Повреждённая структура RTF.');stack.push({...state});continue;}if(c==='}'){if(!stack.length)throw Error('Повреждённая структура RTF.');state=stack.pop()!;if(!stack.length)closed=true;continue;}if(closed){if(/\S/.test(c))throw Error('Лишние данные после RTF.');continue;}if(c!=='\\'){if(c!=='\r'&&c!=='\n')emit(c.charCodeAt(0)>127?new TextDecoder(state.codepage).decode(Uint8Array.of(c.charCodeAt(0))):c);continue;}
  const ch=src[i++];if(ch==='\\'||ch==='{'||ch==='}'){emit(ch);continue;}if(ch==='*'){state.skip=true;continue;}if(ch==="'"){const hex=src.slice(i,i+2);if(!/^[a-f\d]{2}$/i.test(hex))throw Error('Повреждённая кодировка RTF.');i+=2;emit(new TextDecoder(state.codepage).decode(Uint8Array.of(parseInt(hex,16))));continue;}
  if(ch==='~'){emit(' ');continue;}if(ch==='-')continue;if(ch==='_'){emit('-');continue;}if(!/[a-z]/i.test(ch??''))continue;
  let word=ch;while(i<src.length&&/[a-z]/i.test(src[i]))word+=src[i++];let num='';if(src[i]==='-')num+=src[i++];while(i<src.length&&/\d/.test(src[i]))num+=src[i++];if(src[i]===' ')i++;const n=num?Number(num):undefined;
  if(destinations.has(word)){state.skip=true;continue;}if(word==='bin'){if(n===undefined||n<0||i+n>src.length)throw Error('Повреждённый блок RTF.');i+=n;continue;}
  if(word==='ansicpg'){if(n!==1251&&n!==1252&&n!==65001)throw Error('Кодировка RTF не поддерживается. Сохраните DOCX.');if(n===65001)throw Error('UTF-8 RTF не поддерживается. Сохраните DOCX.');state.codepage=`windows-${n}`;}
  else if(word==='uc'){if(n===undefined||n<0||n>10)throw Error('Повреждённый RTF.');state.uc=n;}
  else if(word==='u'){if(n===undefined||n< -32768||n>65535)throw Error('Повреждённый Unicode RTF.');if(!state.skip)out+=String.fromCharCode(n<0?n+65536:n);fallback=state.uc;}
  else if(word==='par'||word==='line'||word==='row')emit('\n');else if(word==='tab'||word==='cell')emit('\t');else if(word==='emdash')emit('—');else if(word==='endash')emit('–');else if(word==='bullet')emit('•');
 }
 if(stack.length||!closed)throw Error('Незавершённый RTF.');if(out.length>100000)throw Error('В RTF больше 100 000 символов.');return out;
}
/** Preflight ZIP central sizes before JSZip inflates anything. No external relationships fetched. */
export function checkDocxZip(bytes:Uint8Array){
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);let e=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){if(d.getUint32(p,true)===0x06054b50){e=p;break;}}
 if(e<0||d.getUint16(e+4,true)!==0||d.getUint16(e+6,true)!==0)throw Error('Неверный ZIP/DOCX.');const count=d.getUint16(e+10,true),size=d.getUint32(e+12,true),start=d.getUint32(e+16,true);if(count>300||start+size>e||count===0xffff)throw Error('DOCX превышает безопасные лимиты.');let p=start,total=0;const names=new Set<string>();
 for(let i=0;i<count;i++){if(p+46>bytes.length||d.getUint32(p,true)!==0x02014b50)throw Error('Повреждённый DOCX.');const flags=d.getUint16(p+8,true),method=d.getUint16(p+10,true),packed=d.getUint32(p+20,true),unpacked=d.getUint32(p+24,true),nl=d.getUint16(p+28,true),xl=d.getUint16(p+30,true),cl=d.getUint16(p+32,true);if(p+46+nl+xl+cl>start+size)throw Error('Повреждённый DOCX.');const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(p+46,p+46+nl));total+=unpacked;if(flags&1||![0,8].includes(method)||unpacked>2_000_000||total>8_000_000||(unpacked>100000&&unpacked>packed*200)||names.has(name)||name.includes('..')||name.startsWith('/')||/vbaProject|embeddings\//i.test(name))throw Error('DOCX содержит неподдерживаемые вложения или слишком большой архив.');names.add(name);p+=46+nl+xl+cl;}
 if(p!==start+size||!names.has('word/document.xml')||!names.has('[Content_Types].xml'))throw Error('Это не документ DOCX.');
}
export async function extractDocx(bytes:Uint8Array):Promise<string>{
 checkDocxZip(bytes);const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(bytes);const raw=await new Promise<Uint8Array>((resolve,reject)=>{const chunks:Uint8Array[]=[];let total=0;const stream=(zip.file('word/document.xml')! as unknown as {internalStream:(type:string)=>{on(event:'data',callback:(chunk:Uint8Array)=>void):void;on(event:'error',callback:(error:Error)=>void):void;on(event:'end',callback:()=>void):void;pause:()=>void;resume:()=>void}}).internalStream('uint8array');stream.on('data',(chunk:Uint8Array)=>{total+=chunk.length;if(total>2_000_000){stream.pause();reject(Error('XML DOCX превышает лимит.'));return;}chunks.push(chunk);});stream.on('error',reject);stream.on('end',()=>{const all=new Uint8Array(total);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}resolve(all);});stream.resume();});const xml=new TextDecoder('utf-8',{fatal:true}).decode(raw);if(xml.length>2_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Недопустимый XML в DOCX.');
 const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('Повреждённый XML DOCX.');const namespaces=new Set(['http://schemas.openxmlformats.org/wordprocessingml/2006/main','http://purl.oclc.org/ooxml/wordprocessingml/main']);let out='';
 const append=(text:string)=>{out+=text;if(out.length>100000)throw Error('В DOCX больше 100 000 символов.');};
 if(!namespaces.has(doc.documentElement.namespaceURI??'')||doc.documentElement.localName!=='document')throw Error('Это не XML документа Word.');
 const stack:{el:Element;exit:boolean;depth:number}[]=[{el:doc.documentElement,exit:false,depth:0}];
 while(stack.length){const {el,exit,depth}=stack.pop()!;if(depth>100)throw Error('DOCX содержит слишком глубокую структуру.');const word=namespaces.has(el.namespaceURI??'');if(exit){if(word&&['p','tr'].includes(el.localName))append('\n');continue;}
  if(word&&['del','moveFrom','instrText'].includes(el.localName))continue;
  if(word&&el.localName==='t'){append(el.textContent??'');continue;}
  if(word&&['tab','br','cr'].includes(el.localName)){append(el.localName==='tab'?'\t':'\n');continue;}
  stack.push({el,exit:true,depth});for(let i=el.children.length-1;i>=0;i--)stack.push({el:el.children[i],exit:false,depth:depth+1});
 }
 return out;
}
