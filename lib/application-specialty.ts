import {z} from 'zod';
import type {Application} from './db';

/** User-entered labels only. No title/goal inference, case folding or Unicode normalization. */
export function validSpecialty(value:unknown):value is string {
 if(typeof value!=='string'||value.length>240||value!==value.trim()||/[\u0000-\u001f\u007f-\u009f]/u.test(value))return false;
 const characters=[...value];
 return characters.length<=120&&characters.every(c=>{const n=c.codePointAt(0)!;return n<0xd800||n>0xdfff;});
}
export const SpecialtySchema=z.string().refine(validSpecialty,'Invalid specialty label');
/** Unknown legacy metadata survives reads and unrelated writes but never becomes a classification. */
export function specialtyLabel(application:Application):string|null {
 return validSpecialty(application.specialty)&&application.specialty!==''?application.specialty:null;
}
export function specialtyKey(application:Application):string {
 const label=specialtyLabel(application);return label===null?'unclassified':'label:'+label;
}
export function specialtyOptions(applications:Application[]) {
 const labels=new Set<string>();let unclassified=false;
 for(const application of applications){const label=specialtyLabel(application);if(label===null)unclassified=true;else labels.add(label);}
 return {labels:[...labels].sort((a,b)=>a<b?-1:a>b?1:0),unclassified};
}
