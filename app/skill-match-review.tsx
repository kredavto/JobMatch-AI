import React from 'react';
/** Review only: never adds unconfirmed requirements to the resume or calls a model. */
export default function SkillMatchReview({matchedSkills,missingSkills}:{matchedSkills:readonly string[];missingSkills:readonly string[]}){
 return <section aria-label="Сопоставление навыков">
  <h3>Сопоставление с вакансией</h3>
  <p>Это поиск упоминаний в исходном резюме, не оценка квалификации и не проверка фактов.</p>
  <h4>Найдены в исходном резюме</h4>
  {matchedSkills.length?<ul>{matchedSkills.map(skill=><li key={skill}>{skill}</li>)}</ul>:<p>Явных совпадений не найдено.</p>}
  <h4>Требуют проверки</h4>
  {missingSkills.length?<><ul>{missingSkills.map(skill=><li key={skill}>{skill}</li>)}</ul><p>Эти требования не подтверждены подходящими строками резюме. Это не означает, что у вас нет таких навыков: формулировка могла отличаться или не пройти осторожный фильтр. Они не добавлены в результат.</p></>:<p>Среди распознанных навыков неподтверждённых требований нет. Это не гарантирует полного соответствия вакансии.</p>}
  <p>Перед откликом проверьте исходные сведения и письмо. Новые навыки или достижения автоматически не добавляются.</p>
 </section>;
}
