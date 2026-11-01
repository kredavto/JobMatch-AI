import {RequestError} from './client-api';
import {authErrorText} from './auth-feedback';
import {normalizeLocale,type UiLocale} from './i18n/locale';
import {workspaceErrors,type WorkspaceErrorKey} from './i18n/workspace';
/** A local presentation key with the original control-flow status. Never sent to the API. */
export class WorkspaceRequestError extends RequestError {
 constructor(readonly copyKey:WorkspaceErrorKey,status=0){super(workspaceErrors[copyKey].ru,status);}
}
export function workspaceFailure(value:unknown,fallback:WorkspaceErrorKey):RequestError{return value instanceof RequestError?value:new WorkspaceRequestError(fallback);}
export function workspaceErrorText(error:RequestError,locale:UiLocale='ru'){
 return error instanceof WorkspaceRequestError?workspaceErrors[error.copyKey][normalizeLocale(locale)]:authErrorText(error,locale);
}
