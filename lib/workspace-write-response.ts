import {validatedWorkspace} from './client-api';
import {WorkspaceRequestError} from './workspace-feedback';
import type {WorkspaceErrorKey} from './i18n/workspace';
/** Workspace-producing commands; auth/export/delete use their separate acknowledgement contracts. */
export const workspaceMutationActions=['goal','vacancy','verify','import','demo','fact','application','version','restore'] as const;
export function requiresKnownWriteOwner(action:string){return action==='delete'||workspaceMutationActions.some(value=>value===action);}
/** Response consistency only. Unknown-owner legacy snapshots remain readable, never writable. */
export function validatedWorkspaceWrite(data:unknown,expected:{revision:number;ownerId?:string},copyKey:WorkspaceErrorKey='writeResponseContextInvalid'){
 if(!expected.ownerId)throw new WorkspaceRequestError('ownerUnknown');
 const next=validatedWorkspace(data);
 if(next.ownerId!==expected.ownerId||next.revision!==expected.revision+1)throw new WorkspaceRequestError(copyKey,502);
 return next;
}
