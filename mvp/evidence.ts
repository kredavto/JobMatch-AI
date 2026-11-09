/** Prioritize evidence only inside an unambiguous, flat list of source bullets.
 * Never move a claim across an employer, date, paragraph or nested-list boundary.
 * Original wording, duplicate occurrences and all unselected facts are retained.
 */
export function prioritizeEvidence(source:string,selected:readonly string[]){
 const rows=source.split(/(\r\n|\r|\n)/);
 const lines=rows.filter((_,index)=>index%2===0);
 const bullet=(line:string)=>/^(\s*)[-*•]\s+\S/.exec(line);
 const chosen=new Set(selected.map(line=>line.trim()));
 let reorderedGroups=0;
 for(let start=0;start<lines.length;){
  const first=bullet(lines[start]);
  if(!first){start++;continue;}
  let end=start+1;
  while(end<lines.length&&bullet(lines[end]))end++;
  const group=lines.slice(start,end);
  // A following nonblank line may continue the preceding bullet. Do not split it.
  const flat=group.every(line=>bullet(line)![1]===first[1]);
  if(flat&&(end===lines.length||!lines[end].trim())){
   const ranked=[...group.filter(line=>chosen.has(line.trim())),...group.filter(line=>!chosen.has(line.trim()))];
   if(ranked.some((line,index)=>line!==group[index])){
    ranked.forEach((line,index)=>{rows[(start+index)*2]=line;});
    reorderedGroups++;
   }
  }
  start=end;
 }
 return {text:rows.join(''),reorderedGroups};
}
export function evidenceNote(groups:number){
 return groups
  ?`Релевантные пункты подняты внутри ${groups} списков. Исходные формулировки, работодатели, даты и остальные сведения сохранены. Это расстановка акцентов, не свободная переформулировка.`
  :'Название и письмо адаптированы. Тело резюме сохранено: нет однозначного списка, который можно безопасно переставить, либо релевантные пункты уже стоят первыми. Свободная переформулировка не выполнялась.';
}
