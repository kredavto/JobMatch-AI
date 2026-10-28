import {MAX_FILE_BYTES,ParserResponseSchema,type ParserResponse} from '../lib/parser-contract.js';
import {UserError} from '../lib/errors.js';
import {createPdfOcr,OcrLimitError} from './pdf-ocr.js';
// Parser diagnostics may contain input. Only the protocol reaches stdout; stderr is discarded by the parent.
console.log=console.warn=console.error=console.info=()=>{};
async function main(){
 let result:ParserResponse;let ocr:ReturnType<typeof createPdfOcr>|undefined;
 process.umask(0o077);
 try{
  const ext=process.argv[2];if(!['txt','docx','pdf'].includes(ext))throw new UserError('Invalid format');
  const chunks:Buffer[]=[];let size=0;
  for await(const raw of process.stdin){const chunk=Buffer.from(raw);size+=chunk.length;if(size>MAX_FILE_BYTES)throw new UserError('Too large',413);chunks.push(chunk);}
  const {extractDocument}=await import('../lib/documents.js');
  const data=Buffer.concat(chunks);if(ext==='pdf'&&process.env.PARSER_WORKER_OCR==='true')ocr=createPdfOcr(data);
  const text=await extractDocument('upload.'+ext,data,ocr?{readScannedPage:page=>ocr!.readPage(page)}:{});
  result={ok:true,text,...(ocr?.pages?{ocrPages:ocr.pages}:{})};
 }catch(error){result={ok:false,code:error instanceof OcrLimitError?'OCR_LIMIT':error instanceof UserError?(error.status===413?'TOO_LARGE':error.status===408?'TIMEOUT':error.status===503?'UNAVAILABLE':'INVALID'):'UNAVAILABLE'};}
 finally{await ocr?.dispose();}
 const safe=ParserResponseSchema.safeParse(result);
 process.stdout.write(JSON.stringify(safe.success?safe.data:{ok:false,code:'UNAVAILABLE'}),()=>process.exit(0));
}
void main();
