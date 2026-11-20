/** Build-time copying only. No network and no candidate files. npm ci verifies package integrity. */
import {cp, mkdir, readFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'public','resume-assets');
const from=path.join(root,'node_modules');

async function packageAt(name,version) {
 const folder=path.join(from,name);
 const meta=JSON.parse(await readFile(path.join(folder,'package.json'),'utf8'));
 if(meta.version!==version)throw new Error('Pinned browser asset version mismatch: '+name);
 return folder;
}
async function put(src,dest){
 const target=path.join(out,dest);
 await mkdir(path.dirname(target),{recursive:true});
 await cp(src,target,{recursive:true});
}
const [pdf,tess,core,eng,rus]=await Promise.all([
 packageAt('pdfjs-dist','6.2.108'),packageAt('tesseract.js','7.0.0'),packageAt('tesseract.js-core','7.0.0'),
 packageAt('@tesseract.js-data/eng','1.0.0'),packageAt('@tesseract.js-data/rus','1.0.0'),
]);
await rm(out,{recursive:true,force:true});
await Promise.all([
 put(path.join(pdf,'legacy','build','pdf.worker.mjs'),'pdf-6.2.108/pdf.worker.mjs'),
 ...['cmaps','iccs','standard_fonts'].map(part=>put(path.join(pdf,part),'pdf-6.2.108/'+part)),
 ...['jbig2.wasm','jbig2_nowasm_fallback.js','openjpeg.wasm','openjpeg_nowasm_fallback.js','qcms_bg.wasm','LICENSE_JBIG2','LICENSE_OPENJPEG','LICENSE_PDFJS_JBIG2','LICENSE_PDFJS_OPENJPEG','LICENSE_PDFJS_QCMS','LICENSE_QCMS'].map(part=>put(path.join(pdf,'wasm',part),'pdf-6.2.108/wasm/'+part)),
 put(path.join(pdf,'LICENSE'),'pdf-6.2.108/LICENSE'),
 put(path.join(tess,'dist','worker.min.js'),'ocr-7.0.0/worker.min.js'),
 ...['tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js','tesseract-core-relaxedsimd-lstm.wasm.js','LICENSE'].map(part=>put(path.join(core,part),'ocr-7.0.0/'+part)),
 put(path.join(eng,'4.0.0_best_int','eng.traineddata.gz'),'ocr-7.0.0/lang/eng.traineddata.gz'),
 put(path.join(rus,'4.0.0_best_int','rus.traineddata.gz'),'ocr-7.0.0/lang/rus.traineddata.gz'),
]);
