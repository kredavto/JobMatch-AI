export type UiLocale='ru'|'en';
export const normalizeLocale=(value:unknown):UiLocale=>value==='en'?'en':'ru';
/** Same keys and interpolation parameters in every language. */
export type Copy<T>={[K in keyof T]:T[K] extends (...args:infer A)=>string?(...args:A)=>string:T[K] extends object?Copy<T[K]>:string};
