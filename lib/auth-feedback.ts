import {errorFromResponse,type RequestError} from './client-api';
import {clientErrors,type ClientErrorCode} from './i18n/api-errors';
import {normalizeLocale,type UiLocale} from './i18n/locale';
/** Presentation only: never infer authentication, permission, delivery or retry from copy. */
export function authErrorText(error:RequestError,locale:UiLocale='ru'){
 const language=normalizeLocale(locale);
 if(error.code&&Object.hasOwn(clientErrors,error.code))return clientErrors[error.code as ClientErrorCode][language];
 return errorFromResponse(error.code?{code:error.code}:{error:error.message},error.status,language).message;
}
