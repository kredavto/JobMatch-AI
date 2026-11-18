/** Conservative lexical eligibility, not semantic verification of a person's facts.
 * Excluded material is retained in the original resume, but never promoted into
 * a qualification, cover-letter quotation, or highlighted evidence.
 */
const negative=/(?:^|[^\p{L}\p{N}])(?:no|not|never|without|learning|studying|would|wish|planned|planning|не|нет|без|никогда|изучаю|изучить|планирую|планируется|хочу|хотел|хотела|намерен|намерена)(?=$|[^\p{L}\p{N}])/iu;
const contact=/(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|(?:^|\s)(?:телефон|тел\.|email|e-mail|почта|адрес|паспорт|снилс|инн|phone|address)\s*:|(?:\+\d[\d ()-]{7,}\d))/iu;
const instruction=/(?:ignore\s+(?:all\s+)?(?:previous|prior)|system\s*(?:prompt|message)|return\s+(?:json|indices)|(?:игнорируй|игнорировать)\s+(?:все\s+)?(?:инструкции|предыдущ)|системн\p{L}*\s+(?:промпт|сообщение)|(?:добавь|выдумай|придумай)\s+(?:опыт|навыки)|<(?:script|system)\b)/iu;
const excludedHeading=/^(?:желаемые навыки|навыки для изучения|планы|требования вакансии|требования к кандидату|desired skills|learning goals|job requirements|requirements)(?:\s*[:：].*|\s*)$/iu;
const targetHeading=/^(?:цель|желаемая должность|career objective|desired position)\s*[:：]?$/iu;
const targetField=/^(?:цель|желаемая должность|career objective|desired position)\s*[:：]\s*\S/iu;
const resumeHeading=/^(?:опыт(?: работы)?|профессиональный опыт|навыки|ключевые навыки|образование|сертификаты|достижения|проекты|experience|work experience|skills|education|certifications|achievements|projects)\s*[:：]?$/iu;
export function eligibleEvidence(source:string):Set<string>{
 const eligible=new Set<string>();let excludedSection=false,skipTarget=false;
 for(const raw of source.replace(/\r\n?/g,'\n').split('\n')){
  const line=raw.trim(),normalized=line.normalize('NFKC').replaceAll('ё','е');
  if(targetField.test(normalized))continue;
  if(targetHeading.test(normalized)){skipTarget=true;continue;}
  if(skipTarget&&line){skipTarget=false;continue;}
  if(excludedHeading.test(normalized)){excludedSection=true;continue;}
  if(resumeHeading.test(normalized)){excludedSection=false;continue;}
  if(!line||excludedSection||negative.test(normalized)||contact.test(normalized)||instruction.test(normalized))continue;
  eligible.add(line);
 }
 return eligible;
}
