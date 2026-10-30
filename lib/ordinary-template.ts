import {z} from 'zod';
export const ORDINARY_TEMPLATE='ordinary-literal-v1';
export const ORDINARY_ENGLISH_TEMPLATE='ordinary-literal-en-v1';
export const OrdinaryTemplateSchema=z.enum([ORDINARY_TEMPLATE,ORDINARY_ENGLISH_TEMPLATE]);
export type OrdinaryTemplate=z.infer<typeof OrdinaryTemplateSchema>;
// Frozen labels. A new wording requires a new tag; source text is never translated.
export const ordinaryLabels=(template:OrdinaryTemplate)=>OrdinaryTemplateSchema.parse(template)===ORDINARY_ENGLISH_TEMPLATE
 ?{relevant:'RELEVANT EXPERIENCE',profile:'PROFILE'}:{relevant:'РЕЛЕВАНТНЫЙ ОПЫТ',profile:'ПРОФИЛЬ'};
