import type {Version} from './db';
export type DiffLine={kind:'same'|'removed'|'added';text:string};
/** Exact line comparison; line endings normalize, whitespace and repeated lines do not. */
export function compareText(before:string,after:string):{lines:DiffLine[];simplified:boolean}{
 const a=before.replace(/\r\n?/g,'\n').split('\n'),b=after.replace(/\r\n?/g,'\n').split('\n');
 if(a.length===b.length&&a.every((line,index)=>line===b[index]))return {lines:a.map(text=>({kind:'same',text})),simplified:false};
 if((a.length+1)*(b.length+1)>500000)return {lines:[...a.map(text=>({kind:'removed' as const,text})),...b.map(text=>({kind:'added' as const,text}))],simplified:true};
 const width=b.length+1,table=new Uint32Array((a.length+1)*width);
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i*width+j]=a[i]===b[j]?1+table[(i+1)*width+j+1]:Math.max(table[(i+1)*width+j],table[i*width+j+1]);
 const lines:DiffLine[]=[];let i=0,j=0;
 while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){lines.push({kind:'same',text:a[i++]});j++;}else if(i<a.length&&(j===b.length||table[(i+1)*width+j]>=table[i*width+j+1]))lines.push({kind:'removed',text:a[i++]});else lines.push({kind:'added',text:b[j++]});}
 return {lines,simplified:false};
}
export function scoresComparable(a:Version,b:Version):boolean{
 const x=a.match_metadata,y=b.match_metadata;
 return !!x&&!!y&&!!a.engine_version&&a.engine_version===b.engine_version&&a.vacancy===b.vacancy&&x.rules_revision===y.rules_revision&&Object.keys(x.weights).every(key=>x.weights[key as keyof typeof x.weights]===y.weights[key as keyof typeof y.weights])&&Object.keys(x.contributions).every(key=>x.contributions[key as keyof typeof x.contributions]===y.contributions[key as keyof typeof y.contributions]);
}
