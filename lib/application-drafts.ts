export type NoteDraft={base:string;text:string};
export type NoteDrafts=Record<string,NoteDraft>;
/** Reconcile only an acknowledged note, never a different/newer editing context. */
export function acknowledgeNote(drafts:NoteDrafts,id:string,submitted:NoteDraft|undefined,requested:string,saved:string|undefined):NoteDrafts{
 if(!submitted||submitted.text!==requested||saved!==requested)return drafts;
 const current=drafts[id];if(!current||current.base!==submitted.base)return drafts;
 const next={...drafts};
 if(current.text===submitted.text)delete next[id];
 else next[id]={base:requested,text:current.text};
 return next;
}
