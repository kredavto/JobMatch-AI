import {describe,it,expect} from 'vitest';
import golden from './fixtures/letter-snapshot-v1.json';
import {composeLetter,letterStyles} from '../lib/cover-letter';
import {createLetterSnapshotJson,validateLetterSnapshotJson,LETTER_TEMPLATE_VERSION,LETTER_SNAPSHOT_MAX_BYTES} from '../lib/letter-snapshot';
import {reviewLetterEdit} from '../lib/letter-edit-review';
const facts=[{id:'f1',text:'SQL saved 42%.',source:'Synthetic',verified:true}];
function build(edited=false){const generated=composeLetter(facts,'SQL',['edit-f1'],'professional').text;const text=edited?generated.replace('42%','99%')+' Never used Python.':generated;return createLetterSnapshotJson({facts,vacancy:'SQL',selection:['edit-f1'],style:'professional',generated,text,reviewedIssueIds:reviewLetterEdit(generated,text).issues.map(i=>i.id),wholeLetter:true});}
const parsed=()=>JSON.parse(build(true));
const valid=(value:unknown)=>validateLetterSnapshotJson(JSON.stringify(value)).ok;
describe('local letter snapshot',()=>{
 it('validates fixed synthetic v1 packet and preserves serialization contract',()=>{expect(valid(golden)).toBe(true);expect(JSON.parse(build(true))).toEqual(golden);});
 it('pins all four template texts; changes require explicit version review',()=>{expect({version:LETTER_TEMPLATE_VERSION,templates:Object.fromEntries(Object.keys(letterStyles).map(style=>[style,composeLetter(facts,'SQL',['edit-f1'],style as keyof typeof letterStyles).text]))}).toMatchSnapshot();});
 it('roundtrips unchanged and reviewed edits',()=>{expect(validateLetterSnapshotJson(build()).ok).toBe(true);expect(validateLetterSnapshotJson(build(true)).ok).toBe(true);});
 it('omits unselected private facts',()=>{const generated=composeLetter(facts,'SQL',['edit-f1'],'professional').text;const json=createLetterSnapshotJson({facts:[Object.assign({},facts[0],{privateMetadata:'PRIVATE METADATA'}), {id:'private',text:'PRIVATE HOME ADDRESS',source:'PRIVATE SOURCE',verified:false}],vacancy:'SQL',selection:['edit-f1'],style:'professional',generated,text:generated,reviewedIssueIds:[],wholeLetter:true});expect(json).not.toContain('PRIVATE');});
 it('accepts key reordering, not audit changes',()=>{const p=parsed();p.review=Object.fromEntries(Object.entries(p.review).reverse());p.review.issues=p.review.issues.map((i:object)=>Object.fromEntries(Object.entries(i).reverse()));expect(valid(p)).toBe(true);});
 const mutations:Record<string,(p:ReturnType<typeof parsed>)=>void>={
 version:p=>p.templateVersion='future',format:p=>p.format='future',trust:p=>p.trust='immutable',
 rootExtra:p=>p.ownerId='secret',sourceExtra:p=>p.source.original='private',factExtra:p=>p.source.facts[0].session='secret',reviewExtra:p=>p.review.semanticPass=true,approvalExtra:p=>p.approval.serverAccepted=true,
 duplicateFacts:p=>p.source.facts.push(p.source.facts[0]),extraFact:p=>p.source.facts.push({...p.source.facts[0],id:'extra'}),duplicateSelection:p=>p.selection.push(p.selection[0]),wrongSelection:p=>p.selection=['edit-missing'],revoked:p=>p.source.facts[0].verified=false,
 changedGenerated:p=>p.generated+=' altered',changedSource:p=>p.source.facts[0].text='SQL saved 43%.',unrelatedVacancy:p=>p.source.vacancy='Python',
 textTamper:p=>p.text+=' 123',spanTamper:p=>p.review.issues[1].before.start++,missingIssue:p=>p.review.issues.pop(),coverage:p=>p.review.coverage='token-limit',semantic:p=>p.review.semanticAssessment='verified',
 missingAck:p=>p.approval.reviewedIssueIds.pop(),extraAck:p=>p.approval.reviewedIssueIds.push('extra'),duplicateAck:p=>p.approval.reviewedIssueIds.push(p.approval.reviewedIssueIds[0]),notApproved:p=>p.approval.wholeLetter=false,
 empty:p=>p.text='',long:p=>p.text='x'.repeat(15001),unicode:p=>p.source.facts[0].source='\ud800',tooLongSource:p=>p.source.facts[0].source='x'.repeat(2001),tooLongVacancy:p=>p.source.vacancy='x'.repeat(30001),tooManyTokens:p=>p.text+=' '+Array(65).fill('5').join(' ')
 };
 for(const [name,mutate] of Object.entries(mutations))it('rejects '+name,()=>{const p=parsed();mutate(p);expect(valid(p)).toBe(false);});
 it('fixed errors on malformed or oversized input',()=>{for(const json of ['{','null','[]','x'.repeat(LETTER_SNAPSHOT_MAX_BYTES+1)])expect(validateLetterSnapshotJson(json)).toEqual({ok:false,error:'INVALID_LOCAL_LETTER_SNAPSHOT'});});
 it('rejects whole profile contradiction before minimization',()=>{const generated=composeLetter(facts,'SQL',['edit-f1'],'professional').text;expect(()=>createLetterSnapshotJson({facts:[...facts,{id:'risky',text:'Не знаю SQL',source:'Synthetic',verified:true}],vacancy:'SQL',selection:['edit-f1'],style:'professional',generated,text:generated,reviewedIssueIds:[],wholeLetter:true})).toThrow();});
});
