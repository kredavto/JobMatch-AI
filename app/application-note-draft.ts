export type NoteDraft={base:string;text:string};
/** Start from the currently displayed saved text when the existing draft is clean. */
export function editNoteDraft(current:NoteDraft|undefined,saved:string,text:string):NoteDraft{return{base:current&&current.text!==saved?current.base:saved,text};}
/** Never revive a cancelled draft or overwrite an independently changed editing base. */
export function acknowledgeNoteDraft(current:NoteDraft|undefined,base:string,acknowledged:string,unchanged:boolean){
 if(!current||current.base!==base)return current;
 return unchanged&&current.text===acknowledged?null:{...current,base:acknowledged};
}
