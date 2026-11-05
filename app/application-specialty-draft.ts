import type {Application} from '../lib/db';
import {sameJson} from '../lib/application-write-response';
import {validSpecialty} from '../lib/application-specialty';
export type SpecialtyBasis={present:boolean;value?:unknown};
export type SpecialtyDraft={ownerId:string;base:SpecialtyBasis;text:string};
export type SpecialtyDrafts=Record<string,SpecialtyDraft>;
/** Property absence is distinct from explicit clear and unknown legacy metadata. */
export function specialtyBasis(row:Application):SpecialtyBasis{return Object.hasOwn(row,'specialty')?{present:true,value:row.specialty}:{present:false};}
export function sameSpecialtyBasis(a:SpecialtyBasis,b:SpecialtyBasis){return sameJson(a,b);}
export function specialtyText(row:Application){return validSpecialty(row.specialty)?row.specialty:'';}
/** A cancelled/reopened draft belongs to a new editing session and cannot be revived by an ACK. */
export function acknowledgeSpecialtyDraft(current:SpecialtyDraft|undefined,submitted:SpecialtyDraft,unchanged:boolean){
 if(!current||current.ownerId!==submitted.ownerId||!sameSpecialtyBasis(current.base,submitted.base))return current;
 if(unchanged&&current.text===submitted.text)return null;
 return {...current,base:{present:true,value:submitted.text}};
}
