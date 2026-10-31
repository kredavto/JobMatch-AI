import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {ProfileReceiptSchema,PROFILE_RECEIPT_TTL,decodeProfileReceipt,profileReceiptSource,type ProfileReceipt} from './ai-profile-acceptance';
import {validateAiProfilePreview,type AiProfilePreview} from './ai-profile-v2';
import type {StructuredProfile} from './structured-profile';
import {UserError} from './errors';
const DOMAIN='jobmatch-ai-profile-receipt-v1\n';
export type ProfileSigningConfig={key:Buffer;keyId:string};
export function optionalProfileSigningConfig():ProfileSigningConfig|null{
 const enabled=process.env.JOBMATCH_AI_PROFILE_ACCEPTANCE_ENABLED;
 if(enabled===undefined||enabled===''||enabled==='false')return null;
 const secret=process.env.JOBMATCH_AI_PROFILE_SIGNING_SECRET;
 if(enabled!=='true'||!secret||!/^[a-f0-9]{64}$/.test(secret))throw new UserError('',503,'AI_PROFILE_ACCEPTANCE_UNAVAILABLE');
 const key=Buffer.from(secret,'hex');return {key,keyId:createHash('sha256').update(key).digest('hex')};
}
export function requiredProfileSigningConfig(){const config=optionalProfileSigningConfig();if(!config)throw new UserError('',503,'AI_PROFILE_ACCEPTANCE_UNAVAILABLE');return config;}
function mac(payload:string,config:ProfileSigningConfig){return createHmac('sha256',config.key).update(DOMAIN+payload).digest();}
/** Called only after authenticated source re-read. The key and user token never enter the receipt. */
export function issueProfileReceipt(profile:StructuredProfile,preview:AiProfilePreview,config:ProfileSigningConfig):ProfileReceipt{
 const source=profileReceiptSource(profile),validated=validateAiProfilePreview(preview,source.sourceOriginal),issuedAt=Math.floor(Date.now()/1000);
 const payload=JSON.stringify({format:'jobmatch-ai-profile-receipt-v1',id:randomUUID(),issuerKeyId:config.keyId,issuedAt,expiresAt:issuedAt+PROFILE_RECEIPT_TTL,source,preview:validated});
 if(new TextEncoder().encode(payload).length>128000)throw new UserError('',413,'REQUEST_TOO_LARGE');
 return ProfileReceiptSchema.parse({payload,signature:mac(payload,config).toString('hex')});
}
export function verifyProfileReceipt(value:unknown,ownerId:string,config:ProfileSigningConfig){
 try{
  const receipt=ProfileReceiptSchema.parse(value);
  if(!timingSafeEqual(mac(receipt.payload,config),Buffer.from(receipt.signature,'hex')))throw Error();
  const payload=decodeProfileReceipt(receipt),now=Math.floor(Date.now()/1000);
  if(payload.issuerKeyId!==config.keyId||payload.source.ownerId!==ownerId||payload.issuedAt>now+5||payload.expiresAt<=now)throw Error();
  return {receipt,payload};
 }catch{throw new UserError('',400,'AI_PROFILE_RECEIPT_INVALID');}
}
