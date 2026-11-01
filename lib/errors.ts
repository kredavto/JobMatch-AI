import type {ApiErrorCode} from './i18n/api-errors';
export class UserError extends Error { constructor(message:string,readonly status=400,readonly code?:ApiErrorCode){super(message);this.name='UserError';} }
