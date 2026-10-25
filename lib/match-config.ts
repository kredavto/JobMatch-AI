import {z} from 'zod';
export const categories=['mandatory','experience','skills','context','clarity'] as const;
export type Category=typeof categories[number];
export const RULES_REVISION='rules-2026-10-25.1';
export const weights:Readonly<Record<Category,number>>=Object.freeze({mandatory:35,experience:25,skills:20,context:10,clarity:10});
export const contributions=Object.freeze({matched:1,partial:0.5,missing:0,unknown:0});
const count=z.number().int().nonnegative().max(30000);
export const MatchMetadataSchema=z.object({
 rules_revision:z.string().min(1).max(100),
 weights:z.object({mandatory:z.number().min(0).max(100),experience:z.number().min(0).max(100),skills:z.number().min(0).max(100),context:z.number().min(0).max(100),clarity:z.number().min(0).max(100)}),
 contributions:z.object({matched:z.number().min(0).max(1),partial:z.number().min(0).max(1),missing:z.number().min(0).max(1),unknown:z.number().min(0).max(1)}),
 requirements:count,outcomes:z.object({matched:count,partial:count,missing:count,unknown:count})
}).refine(m=>Object.values(m.outcomes).reduce((a,b)=>a+b,0)===m.requirements,'Inconsistent requirement counts').refine(m=>Object.values(m.weights).reduce((a,b)=>a+b,0)===100,'Invalid weight total');
export type MatchMetadata=z.infer<typeof MatchMetadataSchema>;
export function matchMetadata(rows:{status:keyof typeof contributions}[]):MatchMetadata{
 const outcomes={matched:0,partial:0,missing:0,unknown:0};for(const row of rows)outcomes[row.status]++;
 return {rules_revision:RULES_REVISION,weights:{...weights},contributions:{...contributions},requirements:rows.length,outcomes};
}
