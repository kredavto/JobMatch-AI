import {describe,it,expect} from 'vitest';import {deflateRawSync} from 'node:zlib';
import {validateDocx,extractDocument,MAX_FILE_BYTES} from '../lib/documents';
function crc(b:Buffer){let n=0xffffffff;for(const byte of b){n^=byte;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
function zip(files:{name:string;text:string;size?:number;flags?:number}[]){const locals:Buffer[]=[],central:Buffer[]=[];let offset=0;for(const f of files){const name=Buffer.from(f.name),raw=Buffer.from(f.text),body=deflateRawSync(raw),h=Buffer.alloc(30),c=Buffer.alloc(46);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(f.flags||0,6);h.writeUInt16LE(8,8);h.writeUInt32LE(crc(raw),14);h.writeUInt32LE(body.length,18);h.writeUInt32LE(f.size??raw.length,22);h.writeUInt16LE(name.length,26);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);h.copy(c,6,4,28);c.writeUInt32LE(offset,42);locals.push(h,name,body);central.push(c,name);offset+=h.length+name.length+body.length;}const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,cd,end]);}
const files=[{name:'[Content_Types].xml',text:'<Types/>'},{name:'word/document.xml',text:'<document/>'}];
describe('DOCX envelope',()=>{
 it('accepts minimal safe structure',async()=>expect(await validateDocx(zip(files))).toBeUndefined());
 it('rejects corrupted zip',async()=>expect(validateDocx(Buffer.from('PKbad'))).rejects.toThrow());
 it('rejects non-DOCX zip',async()=>expect(validateDocx(zip([{name:'a',text:'a'}]))).rejects.toThrow());
 it('rejects encrypted entries',async()=>expect(validateDocx(zip([...files,{name:'hidden',text:'x',flags:1}]))).rejects.toThrow());
 it('rejects macro payload',async()=>expect(validateDocx(zip([...files,{name:'word/vbaProject.bin',text:'x'}]))).rejects.toThrow());
 it('rejects traversal',async()=>expect(validateDocx(zip([...files,{name:'../outside',text:'x'}]))).rejects.toThrow());
 it('rejects large inflated payload before parser',async()=>expect(validateDocx(zip([...files,{name:'bomb',text:'x',size:21_000_000}]))).rejects.toThrow());
 it('rejects false size declarations',async()=>expect(validateDocx(zip([...files,{name:'false',text:'x'.repeat(1000),size:1}]))).rejects.toThrow());
 it('rejects excessive entries',async()=>expect(validateDocx(zip(Array.from({length:1001},(_,i)=>({name:String(i),text:'x'}))))).rejects.toThrow());
});
describe('File validation',()=>{
 it('imports UTF-8 TXT',async()=>expect(await extractDocument('resume.TXT',Buffer.from('Мой опыт: SQL'))).toContain('SQL'));
 it('rejects binary TXT',async()=>expect(extractDocument('resume.txt',Buffer.from('abc\0def'))).rejects.toThrow());
 it('rejects invalid UTF-8',async()=>expect(extractDocument('resume.txt',Buffer.from([255,254,255]))).rejects.toThrow());
 it('rejects extension masquerading',async()=>expect(extractDocument('resume.pdf',Buffer.from('not a pdf'))).rejects.toThrow());
 it('rejects file size',async()=>expect(extractDocument('resume.txt',Buffer.alloc(MAX_FILE_BYTES+1))).rejects.toThrow());
 it('rejects empty extraction',async()=>expect(extractDocument('resume.txt',Buffer.from('  '))).rejects.toThrow());
});
