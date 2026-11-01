import {validatedWorkspaceWrite} from './workspace-write-response';
/** Current profile writes require a displayed owner and exactly the next same-owner revision. */
export function validatedProfileWrite(data:unknown,expected:{revision:number;ownerId?:string}){
 return validatedWorkspaceWrite(data,expected,'profileWriteContextInvalid');
}
