import {UserError} from './errors';

/** Mail links must return to the browser that holds the PKCE verifier. */
export function mailOrigin(requestOrigin:string){
 const configured=process.env.APP_URL;
 let app:URL;
 try{if(!configured)throw new Error();app=new URL(configured);}catch{throw new UserError('Запрос писем пока не настроен администратором.',503);}
 if(app.protocol!=='https:'||app.username||app.password||app.pathname!=='/'||app.search||app.hash)throw new UserError('Некорректная настройка адреса приложения.',503);
 if(app.origin!==requestOrigin)throw new UserError('Запросите письмо на основном адресе приложения: '+app.origin,400);
 return app.origin;
}
