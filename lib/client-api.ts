/** Never retry mutations: a lost response does not prove a failed write. */
export class RequestError extends Error {
 constructor(message:string,public status=0){super(message);}
}
export async function requestJson<T>(url:string,init?:RequestInit):Promise<T>{
 let response:Response;
 try{response=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(30000)});}catch{throw new RequestError('Связь с сервером потеряна. Результат записи неизвестен. Загрузите актуальные данные перед повторным сохранением.');}
 let data;
 try{data=await response.json();}catch{throw new RequestError('Сервер вернул некорректный ответ. Загрузите актуальные данные.',response.ok?0:response.status);}
 if(!response.ok)throw new RequestError(typeof data?.error==='string'?data.error:'Не удалось выполнить запрос',response.status);
 return data as T;
}
