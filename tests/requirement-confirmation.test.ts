import {it,expect} from 'vitest';
import type {Workspace} from '../lib/db';
import {validateFactConfirmation} from '../lib/requirement-confirmation';
import {workspaceNoticeMessage} from '../lib/i18n/workspace-feedback';
const previous=():Workspace=>({ownerId:'11111111-1111-4111-8111-111111111111',revision:7,original:'B2B\nExcel',vacancy:'Must-have:\nB2B',goal:'SYNTHETIC',facts:[{id:'a',text:'B2B',source:'SYNTHETIC',verified:false},{id:'b',text:'Excel',source:'SYNTHETIC',verified:false}],versions:[],applications:[]});
const confirmed=(before=previous()):Workspace=>({...before,revision:before.revision+1,facts:before.facts.map(fact=>({...fact,verified:fact.id==='a'?true:fact.verified}))});
it('accepts exactly one confirmed saved fact and next revision without mutating prior sources',()=>{
 const before=previous(),bytes=JSON.stringify(before),saved=confirmed(before);
 const reordered=Object.fromEntries(Object.entries(saved).reverse());expect(validateFactConfirmation(reordered,before,'a')).toEqual(saved);
 expect(JSON.stringify(before)).toBe(bytes);expect(before.facts[0].verified).toBe(false);
});
it.each(['wrong','missing','unknown-previous'] as const)('rejects %s owner before accepting a confirmation snapshot',kind=>{
 const before=previous(),saved=confirmed(before);if(kind==='wrong')saved.ownerId='22222222-2222-4222-8222-222222222222';if(kind==='missing')delete saved.ownerId;if(kind==='unknown-previous')delete before.ownerId;
 expect(()=>validateFactConfirmation(saved,before,'a')).toThrowError(expect.objectContaining({status:409,code:'CLIENT_OWNER_CHANGED'}));
});
it.each(['revision','original','vacancy','goal','text','source','not-confirmed','other-fact','fact-order','extra'] as const)('rejects unrelated or unacknowledged %s changes',kind=>{
 const before=previous(),saved=confirmed(before);
 if(kind==='revision')saved.revision++;
 if(kind==='original')saved.original+=' Changed';if(kind==='vacancy')saved.vacancy+=' Changed';if(kind==='goal')saved.goal+=' Changed';
 if(kind==='text')saved.facts[0].text+=' invented';if(kind==='source')saved.facts[0].source='changed';
 if(kind==='not-confirmed')saved.facts[0].verified=false;if(kind==='other-fact')saved.facts[1].verified=true;
 if(kind==='fact-order')saved.facts.reverse();if(kind==='extra')Object.assign(saved,{unknown:'injected'});
 expect(()=>validateFactConfirmation(saved,before,'a')).toThrowError(expect.objectContaining({status:502,code:'CLIENT_INVALID_RESPONSE'}));
 expect(before.facts.every(fact=>!fact.verified)).toBe(true);
});
it('refuses missing, duplicate or previously confirmed target IDs and malformed snapshots',()=>{
 const before=previous();expect(()=>validateFactConfirmation(confirmed(before),before,'missing')).toThrow();
 before.facts[0].verified=true;expect(()=>validateFactConfirmation(confirmed(before),before,'a')).toThrow();
 before.facts[0].verified=false;const duplicate=confirmed(before);duplicate.facts.push(duplicate.facts[0]);expect(()=>validateFactConfirmation(duplicate,before,'a')).toThrow();
 expect(()=>validateFactConfirmation({revision:8},before,'a')).toThrow();
});
it('re-renders explicit confirmed/pending outcome in both languages without claiming semantic proof',()=>{
 for(const locale of ['ru','en'] as const){const notice=workspaceNoticeMessage({key:'factConfirmed',before:0,after:50},locale);expect(notice).toContain('0 → 50');expect(workspaceNoticeMessage({key:'factConfirmedPending'},locale)).not.toBe(notice);}
 expect(workspaceNoticeMessage({key:'factConfirmed',before:0,after:50},'en')).toContain('does not prove the full requirement');
 expect(workspaceNoticeMessage({key:'factConfirmedPending'},'en')).toContain('confirmed and saved');
});
