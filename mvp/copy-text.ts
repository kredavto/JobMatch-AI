/** User-triggered clipboard write only. Never read the clipboard or use HTML. */
export async function copyResultText(text:string,write?:((value:string)=>Promise<void>)){
 if(!text||text.length>120000)return 'unavailable' as const;
 if(!write)return 'manual' as const;
 try{await write(text);return 'copied' as const;}catch{return 'manual' as const;}
}
