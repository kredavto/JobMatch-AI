import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {validatedProfileWrite} from '../lib/profile-write-response';
import {WorkspaceRequestError} from '../lib/workspace-feedback';
import OverviewPanel from '../app/overview-panel';
const ownerId='11111111-1111-4111-8111-111111111111';
const previous={ownerId,revision:7};
const next={ownerId,revision:8,original:'SQL 🧑‍💻\r\n2026',vacancy:'',goal:'Цель',facts:[],versions:[],applications:[]};
describe('profile command response context',()=>{
 it('accepts exactly the next known-owner revision without rewriting raw text',()=>{expect(validatedProfileWrite(next,previous)).toEqual(next);expect(next.original).toBe('SQL 🧑‍💻\r\n2026');});
 it.each([{ownerId:'22222222-2222-4222-8222-222222222222'},{ownerId:undefined},{revision:7},{revision:9}])('rejects mismatched context %j before returning a workspace',change=>{try{validatedProfileWrite({...next,...change},previous);throw Error('Unexpected acceptance');}catch(error){expect(error).toBeInstanceOf(WorkspaceRequestError);expect(error).toMatchObject({copyKey:'profileWriteContextInvalid',status:502});}});
 it('retains explicit legacy owner-unknown compatibility while requiring the next revision',()=>{const {ownerId:_owner,...legacy}=next;void _owner;expect(validatedProfileWrite(legacy,{revision:7})).toEqual(legacy);expect(()=>validatedProfileWrite(legacy,{revision:8})).toThrow(WorkspaceRequestError);});
 it('keeps schema validation and does not expose arbitrary response fields',()=>{expect(()=>validatedProfileWrite({private:'PRIVATE_INVALID_RESPONSE'},previous)).toThrow();});
 it('renders actual bilingual overview counts, demo scope and disabled reasons without implying HH delivery',()=>{for(const locale of ['ru','en'] as const){const html=renderToStaticMarkup(createElement(OverviewPanel,{locale,confirmed:2,total:5,versions:3,sent:4,outcomes:1,busy:false,demoBlocked:'draft',onProfile:()=>{},onDemo:async()=>{}}));expect(html).toContain('disabled');expect(html).toContain('<strong>2<small> / 5</small></strong>');expect(html).toContain('<strong>4</strong>');expect(html).toContain(locale==='ru'?'вручную записанных откликах':'manually recorded applications');expect(html).toContain(locale==='ru'?'резюме, вакансии или цели':'resume, vacancy or goal');}});
});
