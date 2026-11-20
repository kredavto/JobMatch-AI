/** Bounded CFB + Word97–2003 main-story piece-table reader. No macros/embedded objects run. */
const bad=()=>{throw Error('DOC повреждён или использует неподдерживаемый формат. Сохраните его как DOCX.');};
export function extractLegacyDoc(bytes:Uint8Array):string{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const u16=(p:number)=>{if(p<0||p+2>bytes.length)return bad();return view.getUint16(p,true);};
 const u32=(p:number)=>{if(p<0||p+4>bytes.length)return bad();return view.getUint32(p,true);};
 if(bytes.length<512||[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].some((b,i)=>bytes[i]!==b)||u16(28)!==0xfffe)return bad();
 const shift=u16(30),major=u16(26);if(!((major===3&&shift===9)||(major===4&&shift===12))||u16(32)!==6)return bad();
 const sector=2**shift,max=Math.floor(bytes.length/sector)-1,END=0xfffffffe;
 const block=(id:number)=>{if(id<0||id>=max)return bad();return bytes.subarray((id+1)*sector,(id+2)*sector);};
 const ints=(b:Uint8Array)=>Array.from({length:b.length/4},(_,i)=>new DataView(b.buffer,b.byteOffset,b.length).getUint32(i*4,true));
 const fatIds:number[]=[];for(let i=0;i<109;i++){const id=u32(76+i*4);if(id<0xfffffffa)fatIds.push(id);}
 let dif=u32(68);const seenDif=new Set<number>();if(u32(72)>max)return bad();
 for(let i=0;i<u32(72);i++){if(seenDif.has(dif))return bad();seenDif.add(dif);const ids=ints(block(dif));fatIds.push(...ids.slice(0,-1).filter(id=>id<0xfffffffa));dif=ids[ids.length-1];}
 if(fatIds.length!==u32(44)||fatIds.length>max||new Set(fatIds).size!==fatIds.length)return bad();
 const fat=fatIds.flatMap(id=>ints(block(id)));
 const chain=(start:number,table:number[],get:(id:number)=>Uint8Array,limit:number)=>{let id=start;const seen=new Set<number>(),parts:Uint8Array[]=[];let size=0;while(id!==END){if(id>=table.length||seen.has(id))return bad();seen.add(id);const part=get(id);size+=part.length;if(size>limit)return bad();parts.push(part);id=table[id];}const out=new Uint8Array(size);let at=0;for(const b of parts){out.set(b,at);at+=b.length;}return out;};
 const dirs=chain(u32(48),fat,block,Math.min(bytes.length,1024*1024));
 type Entry={name:string;type:number;start:number;size:number};const entries:Entry[]=[];
 for(let p=0;p+128<=dirs.length;p+=128){const d=new DataView(dirs.buffer,dirs.byteOffset+p,128),type=dirs[p+66];if(!type)continue;const len=d.getUint16(64,true);if(len<2||len>64||len%2)return bad();const size=d.getUint32(120,true);if(d.getUint32(124,true)!==0||size>bytes.length)return bad();entries.push({name:new TextDecoder('utf-16le').decode(dirs.subarray(p,p+len-2)),type,start:d.getUint32(116,true),size});}
 if(entries.some(e=>/EncryptionInfo|EncryptedPackage/i.test(e.name)))throw Error('DOC защищён паролем. Сохраните незашифрованную копию.');
 const roots=entries.filter(e=>e.type===5);if(roots.length!==1)return bad();
 let mini:Uint8Array|undefined,miniFat:number[]|undefined;
 const read=(name:string)=>{const found=entries.filter(e=>e.name===name&&e.type===2);if(found.length!==1)return bad();const e=found[0];if(e.size===0)return new Uint8Array();if(e.size>=4096)return chain(e.start,fat,block,bytes.length).subarray(0,e.size);
  if(!mini){mini=chain(roots[0].start,fat,block,bytes.length).subarray(0,roots[0].size);miniFat=ints(chain(u32(60),fat,block,bytes.length));}
  return chain(e.start,miniFat!,id=>{if((id+1)*64>mini!.length)return bad();return mini!.subarray(id*64,(id+1)*64);},bytes.length).subarray(0,e.size);
 };
 const word=read('WordDocument'),w=new DataView(word.buffer,word.byteOffset,word.length);
 const s=(p:number)=>{if(p+2>word.length)return bad();return w.getUint16(p,true);},l=(p:number)=>{if(p+4>word.length)return bad();return w.getUint32(p,true);};
 if(s(0)!==0xa5ec||s(2)<0xc1)return bad();const flags=s(10);if(flags&0x8100)throw Error('DOC защищён паролем. Сохраните незашифрованную копию.');
 const table=read(flags&0x200?'1Table':'0Table');let at=32;const csw=s(at);at+=2+csw*2;const cslw=s(at);at+=2;if(cslw<4)return bad();const mainChars=l(at+12);if(mainChars>100000)return bad();at+=cslw*4;if(s(at)<34)return bad();at+=2;
 const clxStart=l(at+33*8),clxLen=l(at+33*8+4);if(!clxLen||clxStart+clxLen>table.length)return bad();let p=clxStart;const tv=new DataView(table.buffer,table.byteOffset,table.length),end=clxStart+clxLen;
 while(p<end&&table[p]===1){if(p+3>end)return bad();p+=3+tv.getUint16(p+1,true);}if(p+5>end||table[p]!==2)return bad();const len=tv.getUint32(p+1,true);p+=5;if(p+len>end||len<4||(len-4)%12)return bad();const n=(len-4)/12;if(n>10000)return bad();let text='';
 for(let i=0;i<n;i++){const from=tv.getUint32(p+i*4,true),to=tv.getUint32(p+(i+1)*4,true);if(to<from||(i===0&&from!==0))return bad();if(from>=mainChars)break;const count=Math.min(to,mainChars)-from,fc=tv.getUint32(p+4*(n+1)+i*8+2,true),compressed=!!(fc&0x40000000),off=(fc&0x3fffffff)/(compressed?2:1),size=count*(compressed?1:2);if(!Number.isInteger(off)||off+size>word.length)return bad();text+=new TextDecoder(compressed?'windows-1252':'utf-16le').decode(word.subarray(off,off+size));}
 if(text.length!==mainChars)return bad();
 // Fields: keep displayed result, not instruction; exclude field code without evaluating.
 let fieldDepth=0,inCode=false,out='';for(const ch of text){if(ch==='\x13'){if(fieldDepth) return bad();fieldDepth++;inCode=true;}else if(ch==='\x14'){inCode=false;}else if(ch==='\x15'){fieldDepth=0;inCode=false;}else if(!inCode)out+=ch;}
 return out.replace(/\r|\x07|\x0b|\x0c/g,'\n').replace(/[\x00-\x08\x0e-\x1f]/g,'');
}
