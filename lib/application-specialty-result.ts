import type {Workspace} from './db';
import {WorkspaceSchema} from './workspace-schema';
import {validSpecialty} from './application-specialty';
import {clientValidationError} from './i18n/workspace-feedback';

/** Stack-safe comparison for JSON metadata; bounded refusal is never an accepted acknowledgement. */
export function sameSpecialtyValue(a:unknown,b:unknown):boolean {
 const pending:[unknown,unknown][]=[[a,b]];let budget=1_000_000;
 try{while(pending.length){if(--budget<0)return false;const [left,right]=pending.pop()!;if(left===right)continue;
  if(left===null||right===null||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return false;
  if(Array.isArray(left)&&Array.isArray(right)&&left.length!==right.length)return false;
  const keys=Object.keys(left);if(keys.length!==Object.keys(right).length||keys.length>budget)return false;
  for(const key of keys){if(!Object.hasOwn(right,key))return false;pending.push([(left as Record<string,unknown>)[key],(right as Record<string,unknown>)[key]]);}
 }return true;}catch{return false;}
}
/** Bind the acknowledgement to one explicit label and the exact submitted owner/revision/state. */
export function validateSpecialtyWrite(data:unknown,previous:Workspace,id:string,label:string):Workspace {
 const parsed=WorkspaceSchema.safeParse(data);
 if(!validSpecialty(label)||!previous.ownerId||!parsed.success||parsed.data.ownerId!==previous.ownerId||previous.applications.filter(a=>a.id===id).length!==1)throw clientValidationError('CLIENT_INVALID_RESPONSE',502);
 const expected={...previous,revision:previous.revision+1,applications:previous.applications.map(a=>a.id===id?{...a,specialty:label}:a)};
 if(!sameSpecialtyValue(parsed.data,expected))throw clientValidationError('CLIENT_INVALID_RESPONSE',502);
 return parsed.data;
}

export type SpecialtyDraft={base:unknown;text:string};
export type SpecialtyDrafts=Record<string,SpecialtyDraft>;
/** A late response clears only the submitted text; newer typing retains the acknowledged base. */
export function acknowledgeSpecialty(drafts:SpecialtyDrafts,id:string,submitted:SpecialtyDraft|undefined,requested:string,saved:unknown):SpecialtyDrafts {
 if(!submitted||submitted.text!==requested||saved!==requested)return drafts;
 const current=drafts[id];if(!current||!sameSpecialtyValue(current.base,submitted.base))return drafts;
 const next={...drafts};if(current.text===submitted.text)delete next[id];else next[id]={base:requested,text:current.text};return next;
}
