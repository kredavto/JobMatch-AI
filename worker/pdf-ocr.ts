import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {UserError} from '../lib/errors.js';
import {MAX_FILE_BYTES,MAX_TEXT_CHARS} from '../lib/parser-contract.js';
export const MAX_OCR_PAGES=3;
export class OcrLimitError extends UserError {constructor(){super('OCR page limit',400);}}
type Command=(file:string,args:string[])=>Promise<string>;
/** All subprocesses stay in the job's process group/cgroup; no shell, network or user-supplied paths. */
export const runOcrCommand:Command=(file,args)=>new Promise((resolve,reject)=>{
 let done=false,size=0;const chunks:Buffer[]=[];
 const child=spawn(file,args,{stdio:['ignore','pipe','ignore'],env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',NODE_ENV:'production',HOME:'/tmp',OMP_THREAD_LIMIT:'1',OMP_NUM_THREADS:'1'}});
 const finish=(error?:UserError)=>{if(done)return;done=true;clearTimeout(timer);if(error){child.kill('SIGKILL');reject(error);}else{try{resolve(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{reject(new UserError('Invalid OCR encoding'));}}};
 const timer=setTimeout(()=>finish(new UserError('OCR deadline',408)),4000);
 child.stdout.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>MAX_TEXT_CHARS*4)finish(new UserError('OCR output limit'));else chunks.push(chunk);});
 child.on('error',()=>finish(new UserError('OCR unavailable',503)));
 child.on('close',(code,signal)=>finish(code===0?undefined:new UserError('OCR failed',signal==='SIGKILL'||signal==='SIGXCPU'?408:400)));
});
/** Lazy private tmpfs workspace. The whole container is also retired on timeout/cancellation. */
export function createPdfOcr(data:Buffer,options:{run?:Command;root?:string;languages?:'eng'|'eng+rus'}={}){
 let directory:string|undefined,pages=0,languagesChecked=false;
 const run=options.run??runOcrCommand;
 return {
  get pages(){return pages;},
  async readPage(page:number):Promise<string>{
   if(!Number.isInteger(page)||page<1||page>30||data.length>MAX_FILE_BYTES)throw new UserError('Invalid OCR input');
   if(pages>=MAX_OCR_PAGES)throw new OcrLimitError();
   if(!languagesChecked){
    const available=(await run('/usr/bin/tesseract',['--list-langs'])).split(/\r?\n/).map(value=>value.trim());
    if((options.languages??'eng+rus').split('+').some(language=>!available.includes(language)))throw new UserError('OCR unavailable',503);
    languagesChecked=true;
   }
   if(!directory){directory=await mkdtemp(join(options.root??tmpdir(),'jobmatch-ocr-'));await writeFile(join(directory,'input.pdf'),data,{flag:'wx',mode:0o600});}
   const input=join(directory,'input.pdf'),image=join(directory,'page.pgm');
   try{
    await run('/usr/bin/pdftoppm',['-f',String(page),'-l',String(page),'-singlefile','-r','200','-scale-to','2000','-gray',input,join(directory,'page')]);
    const text=await run('/usr/bin/tesseract',[image,'stdout','-l',options.languages??'eng+rus','--oem','1','--psm','3','--dpi','200']);
    if(!text.isWellFormed()||text.includes('\u0000')||text.length>MAX_TEXT_CHARS)throw new UserError('Invalid OCR output');
    pages++;return text.trim();
   }finally{await unlink(image).catch(()=>{});}
  },
  async dispose(){if(directory){await rm(directory,{recursive:true,force:true});directory=undefined;}}
 };
}
