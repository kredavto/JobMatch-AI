import {validatedWorkspace} from './client-api';
import {WorkspaceRequestError} from './workspace-feedback';
/** The current profile command contract increments once; known-owner responses must stay in that account. */
export function validatedProfileWrite(data:unknown,expected:{revision:number;ownerId?:string}){
 const next=validatedWorkspace(data);
 if(next.revision!==expected.revision+1||expected.ownerId!==undefined&&next.ownerId!==expected.ownerId)throw new WorkspaceRequestError('profileWriteContextInvalid',502);
 return next;
}
