import {z} from 'zod';
export const ORDINARY_TEMPLATE='ordinary-literal-v1';
export const ORDINARY_ENGLISH_TEMPLATE='ordinary-literal-en-v1';
export const OrdinaryTemplateSchema=z.enum([ORDINARY_TEMPLATE,ORDINARY_ENGLISH_TEMPLATE]);
export type OrdinaryTemplate=z.infer<typeof OrdinaryTemplateSchema>;
// Frozen labels. A new wording requires a new tag; source text is never translated.
export const ordinaryLabels=(template:OrdinaryTemplate)=>OrdinaryTemplateSchema.parse(template)===ORDINARY_ENGLISH_TEMPLATE
 ?{relevant:'RELEVANT EXPERIENCE',profile:'PROFILE'}:{relevant:'РЕЛЕВАНТНЫЙ ОПЫТ',profile:'ПРОФИЛЬ'};

/** Framing-language hints only; never declare the language of literal user text. */
export function ordinaryDocxFraming(version:{text:string;template_version?:unknown;evidence_ids:string[];evidence_snapshot?:{id:string;text:string;verified:boolean}[]}):{headerLines:number[]}|undefined{
 if(!Object.hasOwn(version,'template_version')||version.template_version===ORDINARY_TEMPLATE)return undefined;
 if(version.template_version!==ORDINARY_ENGLISH_TEMPLATE)return {headerLines:[]};
 const ids=version.evidence_ids,snapshot=version.evidence_snapshot;
 if(!Array.isArray(snapshot)||new Set(ids).size!==ids.length||snapshot.length!==ids.length||new Set(snapshot.map(f=>f.id)).size!==ids.length||snapshot.some(f=>!f.verified||!ids.includes(f.id)))throw Error('ORDINARY_ENGLISH_RECORD');
 if(!ids.length)return {headerLines:[]};
 const prefix='RELEVANT EXPERIENCE\n'+ids.map(id=>snapshot.find(f=>f.id===id)!.text).join('\n')+'\n\nPROFILE\n';
 if(!version.text.startsWith(prefix))throw Error('ORDINARY_ENGLISH_RECORD');
 return {headerLines:[0,prefix.replace(/\r\n?/g,'\n').split('\n').length-2]};
}
