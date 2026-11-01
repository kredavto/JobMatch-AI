import {describe,it,expect} from 'vitest';
import {validatedWorkspaceWrite,requiresKnownWriteOwner,workspaceMutationActions} from '../lib/workspace-write-response';
import {WorkspaceRequestError} from '../lib/workspace-feedback';
import {RequestError} from '../lib/client-api';
const ownerId='11111111-1111-4111-8111-111111111111';
const context={ownerId,revision:7};
const next={ownerId,revision:8,original:'Literal SQL 🧑‍💻\r\n2026',vacancy:'SQL',goal:'A&B',facts:[],versions:[],applications:[],opaque:{literal:'Сохранено'}};
describe('workspace write response context',()=>{
 it('accepts the exact next same-owner workspace without rewriting raw or compatibility fields',()=>{expect(validatedWorkspaceWrite(next,context)).toEqual(next);expect(validatedWorkspaceWrite(next,context).original).toBe('Literal SQL 🧑‍💻\r\n2026');});
 it.each([{ownerId:'22222222-2222-4222-8222-222222222222'},{ownerId:undefined},{revision:7},{revision:9}])('refuses schema-valid mismatched metadata %j',change=>{try{validatedWorkspaceWrite({...next,...change},context);throw Error('Unexpected acceptance');}catch(error){expect(error).toBeInstanceOf(WorkspaceRequestError);expect(error).toMatchObject({copyKey:'writeResponseContextInvalid',status:502});}});
 it('refuses missing expected owner instead of authorizing a legacy read shape',()=>{for(const ownerId of [undefined,'']){try{validatedWorkspaceWrite(next,{revision:7,ownerId});throw Error('Unexpected acceptance');}catch(error){expect(error).toMatchObject({copyKey:'ownerUnknown'});}}});
 it('retains schema rejection before adoption and does not expose invalid body fields',()=>{try{validatedWorkspaceWrite({private:'PRIVATE_WRONG_BODY'},context);throw Error('Unexpected acceptance');}catch(error){expect(error).toBeInstanceOf(RequestError);expect((error as Error).message).not.toContain('PRIVATE_WRONG_BODY');}});
 it('requires known owner for every workspace mutation and delete, retaining separate auth/read contracts',()=>{expect([...workspaceMutationActions]).toEqual(['goal','vacancy','verify','import','demo','fact','application','version','restore']);for(const action of [...workspaceMutationActions,'delete'])expect(requiresKnownWriteOwner(action)).toBe(true);for(const action of ['login','register','refresh','logout','export','analyze'])expect(requiresKnownWriteOwner(action)).toBe(false);});
});
