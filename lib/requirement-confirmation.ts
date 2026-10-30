import type {Workspace} from './db';
import {validatedWorkspace,RequestError} from './client-api';
import {clientErrors} from './i18n/api-errors';
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
 return value;
}
/** Verify only the explicit one-fact acknowledgement before installing it or requesting analysis. */
export function validateFactConfirmation(data:unknown,previous:Workspace,id:string):Workspace{
 const saved=validatedWorkspace(data);
 if(!previous.ownerId||saved.ownerId!==previous.ownerId)throw new RequestError(clientErrors.CLIENT_OWNER_CHANGED.ru,409,'CLIENT_OWNER_CHANGED');
 const selected=previous.facts.filter(fact=>fact.id===id);
 const expected={...previous,revision:previous.revision+1,facts:previous.facts.map(fact=>fact.id===id?{...fact,verified:true}:fact)};
 if(selected.length!==1||selected[0].verified||JSON.stringify(canonical(saved))!==JSON.stringify(canonical(expected)))
  throw new RequestError(clientErrors.CLIENT_INVALID_RESPONSE.ru,502,'CLIENT_INVALID_RESPONSE');
 return saved;
}
