import {afterCleanScan,type ScanVerdict} from './clamav.js';
import type {ParserResponse} from '../lib/parser-contract.js';
/** Unverified scanner readiness never permits transmission, even after a clean verdict. */
export async function guardedExtraction(data:Buffer,signal:AbortSignal,dependencies:{ready:()=>Promise<boolean>;scan:(data:Buffer)=>Promise<ScanVerdict>;parse:(data:Buffer)=>Promise<ParserResponse>}):Promise<ParserResponse>{
 if(signal.aborted)return{ok:false,code:'TIMEOUT'};
 try{
  if(!await dependencies.ready()||signal.aborted)return{ok:false,code:'UNAVAILABLE'};
  const result=await afterCleanScan(data,dependencies.scan,async bytes=>{
   if(signal.aborted)return{ok:false,code:'TIMEOUT'} as ParserResponse;
   if(!await dependencies.ready()||signal.aborted)return{ok:false,code:'UNAVAILABLE'} as ParserResponse;
   return dependencies.parse(bytes);
  });
  if(result.verdict==='blocked')return{ok:false,code:'INVALID'};
  return result.value??{ok:false,code:'UNAVAILABLE'};
 }catch{return{ok:false,code:'UNAVAILABLE'};}
}
