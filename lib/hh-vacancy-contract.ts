import {z} from 'zod';
/** Parse identifiers, never a network destination. Query/fragment tracking is discarded. */
export function hhVacancyId(input:string):string{
 const value=input.trim();
 if(value.length>2048||/[\u0000-\u0020\\\u007f]/.test(value))throw new Error('INVALID_HH_LINK');
 if(/^\d{1,15}$/.test(value))return value;
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||
 !/^(?:[a-z0-9-]+\.)?hh\.ru$/.test(url.hostname)||!/^\/vacancy\/\d{1,15}\/?$/.test(url.pathname))throw new Error('INVALID_HH_LINK');
 return url.pathname.split('/')[2];
}
export const HHVacancyResult=z.object({ownerId:z.uuid(),id:z.string().regex(/^\d{1,15}$/),url:z.string(),text:z.string().min(1).max(30000),archived:z.boolean()}).strict().superRefine((value,ctx)=>{if(value.url!==`https://hh.ru/vacancy/${value.id}`)ctx.addIssue({code:'custom',message:'Invalid canonical URL'});});

/** A bounded observation, not a signature, storage authorization or an HH freshness SLA. */
export const HH_PREVIEW_TTL_MS=5*60*1000;
export const HHObservationSchema=z.object({
 format:z.literal('jobmatch-hh-observation-v1'),source:z.literal('hh-api'),
 vacancyId:z.string().regex(/^\d{1,15}$/),canonicalUrl:z.string(),
 fetchedAt:z.iso.datetime(),expiresAt:z.iso.datetime(),
 textSha256:z.string().regex(/^[a-f0-9]{64}$/),authority:z.literal('unsigned-observation'),
 retention:z.literal('memory-only'),usage:z.literal('preview-only')
}).strict().superRefine((value,ctx)=>{
 if(value.canonicalUrl!==`https://hh.ru/vacancy/${value.vacancyId}`||Date.parse(value.expiresAt)-Date.parse(value.fetchedAt)!==HH_PREVIEW_TTL_MS)ctx.addIssue({code:'custom',message:'Invalid observation boundary'});
});
export const HHVacancyPreview=HHVacancyResult.safeExtend({archived:z.literal(false),previewOnly:z.literal(true),provenance:HHObservationSchema}).superRefine((value,ctx)=>{
 if(value.provenance.vacancyId!==value.id||value.provenance.canonicalUrl!==value.url)ctx.addIssue({code:'custom',message:'Observation source mismatch'});
});
export type HHPreview=z.infer<typeof HHVacancyPreview>;
export async function validateHHPreview(value:unknown,ownerId:string,id:string,now=Date.now()):Promise<HHPreview>{
 const preview=HHVacancyPreview.parse(value),fetched=Date.parse(preview.provenance.fetchedAt),expires=Date.parse(preview.provenance.expiresAt);
 if(preview.ownerId!==ownerId||preview.id!==id||!Number.isFinite(now)||fetched>now+30000||expires<=now)throw new Error('Stale or foreign HH observation');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(preview.text))),byte=>byte.toString(16).padStart(2,'0')).join('');
 if(hash!==preview.provenance.textSha256)throw new Error('HH text hash mismatch');
 return preview;
}
