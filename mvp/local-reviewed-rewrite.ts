import {preservesKnownSkills} from './adapt';
import type {Vacancy} from './contracts';
import {eligibleEvidence} from './eligible-evidence';
import {resumeFacts} from './full-resume-consent';
import {reviewRewriteDraft} from './rewrite-draft';

type ResultBody={title:string;text:string};
const bullet=/^([ \t]*[-*•][ \t]+)(\S.*?)([ \t]*)$/u;
const invalidControl=/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
type Candidate={index:number;line:string};

function matchingPositions(rows:string[],quote:string){
 return rows.flatMap((row,index)=>row.trim()===quote?[index]:[]);
}

function isFlatBullet(rows:string[],index:number){
 const marker=bullet.exec(rows[index]);
 if(!marker||/^[\p{P}\p{S}]/u.test(marker[2]))return null;
 let first=index,last=index;
 while(first>0&&bullet.test(rows[first-1]))first--;
 while(last+1<rows.length&&bullet.test(rows[last+1]))last++;
 if(last+1<rows.length&&rows[last+1].trim())return null;
 const indentation=(line:string)=>line.match(/^[ \t]*/u)?.[0];
 if(rows.slice(first,last+1).some(line=>indentation(line)!==indentation(rows[index])))return null;
 return marker;
}

/** Match an exact, unique source bullet to the existing local result. Neither
 * ranking, letter nor skills are recomputed from model text. This does not
 * certify semantic equivalence: the user must explicitly approve each row. */
function placements(source:string,vacancy:Vacancy,result:ResultBody,output:unknown){
 const prefix=result.title+'\n\n', mapped=new Map<string,Candidate>();
 if(result.title!==vacancy.title||!result.text.startsWith(prefix))throw Error('STALE_LOCAL_REVIEW');
 const sourceRows=source.split(/\r?\n/),body=result.text.slice(prefix.length);
 const resultParts=body.split(/(\r\n|\r|\n)/);
 const rows=resultParts.filter((_,index)=>index%2===0);
 const eligible=eligibleEvidence(source);
 for(const row of reviewRewriteDraft(resumeFacts(source),output).suggestions){
  const sources=matchingPositions(sourceRows,row.sourceQuote);
  const results=matchingPositions(rows,row.sourceQuote);
  if(sources.length!==1||results.length!==1||!eligible.has(row.sourceQuote))continue;
  const original=isFlatBullet(sourceRows,sources[0]);
  const current=isFlatBullet(rows,results[0]);
  if(!original||!current||original[2]!==current[2])continue;
  const text=row.text.replace(/^[-*•][ \t]+/u,'');
  // Avoid editing headings, injected controls, contact text and nested bullets.
  if(!text||text===current[2]||invalidControl.test(text)||/^[\p{P}\p{S}]/u.test(text)||!eligibleEvidence(text).has(text))continue;
  if(!preservesKnownSkills(original[2],text,vacancy))continue;
  mapped.set(row.sourceId,{index:results[0],line:current[1]+text+current[3]});
 }
 return {prefix,resultParts,mapped};
}

export function localReviewCandidateIds(source:string,vacancy:Vacancy,result:ResultBody,output:unknown):ReadonlySet<string>{
 try{return new Set(placements(source,vacancy,result,output).mapped.keys());}catch{return new Set();}
}

export function applyLocalReviewedRewrite(source:string,vacancy:Vacancy,result:ResultBody,output:unknown,ids:readonly string[]){
 if(!ids.length||new Set(ids).size!==ids.length)throw Error('INVALID_LOCAL_REVIEW_SELECTION');
 const {prefix,resultParts,mapped}=placements(source,vacancy,result,output);
 for(const id of ids){
  const change=mapped.get(id);
  if(!change)throw Error('STALE_LOCAL_REVIEW');
  resultParts[change.index*2]=change.line;
 }
 return {text:prefix+resultParts.join(''),adaptationNote:'Применены только проверенные вами формулировки. Навыки, письмо и исходный профиль не изменились.'};
}
