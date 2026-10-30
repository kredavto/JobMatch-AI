import {z} from 'zod';
const instant=z.iso.datetime({offset:true});
/** Normalize supported explicit ISO offsets for calculation/display only; never rewrite stored values. */
export function explicitInstant(value:string):string|null{
 const canonical=value.replace(/([+-]\d{2})(\d{2})$/,'$1:$2').replace(/z$/,'Z').replace(/(T\d{2}:\d{2})(Z|[+-]\d{2}:\d{2})$/,'$1:00$2');
 return instant.safeParse(canonical).success&&Number.isFinite(Date.parse(canonical))?canonical:null;
}
