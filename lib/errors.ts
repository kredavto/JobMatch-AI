import type {ApiErrorCode} from './i18n/api-errors';
/** Explicit public code; an uncoded error is redacted at the HTTP boundary. */
export class UserError extends Error {constructor(message:string,readonly status=400,readonly code?:ApiErrorCode){super(message);this.name='UserError';}}
