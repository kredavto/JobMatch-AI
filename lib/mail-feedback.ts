import {mailCopy} from './i18n/mail';
import {normalizeLocale,type UiLocale} from './i18n/locale';
export type MailStage='request'|'exchange'|'update';
/** Fixed messages only; status and stage are retained so locale changes never replay a request. */
export function mailFailure(status:number,stage:MailStage,locale:UiLocale='ru'){
 const t=mailCopy[normalizeLocale(locale)].feedback;
 if(status===429)return t.rate;
 if(stage==='update')return t.uncertainUpdate;
 if(status===403)return t.forbidden;
 if(stage==='exchange'&&(status===400||status===401))return t.expired;
 if(stage==='request'&&status===400)return t.requestInvalid;
 if(status>=500)return t.outage;
 return t.failed;
}
