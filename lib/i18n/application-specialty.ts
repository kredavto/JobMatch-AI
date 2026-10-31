export const specialtyCopy={
 ru:{
  label:'Специальность (ваша метка)',hint:'Необязательно. До 120 символов, без пробелов по краям и управляющих символов. Метки сравниваются дословно, с учётом регистра.',
  unset:'Без указанной специальности',legacy:'Старое значение метки не распознано. Оно сохранено без изменений и не используется для группировки. Новая метка заменит его только после сохранения.',
  unsaved:'Метка специальности не сохранена.',conflict:'Сохранённая метка изменилась. Сравните значения перед записью.',saved:'Сохранённая метка',
  invalid:'Введите корректную метку до 120 символов без пробелов по краям и управляющих символов.',save:'Сохранить специальность',cancel:'Отменить правку специальности',clear:'Подготовить сброс специальности',
  filter:'Специальность',all:'Все специальности',unavailable:'Выбранная метка больше недоступна',title:'Исходы по указанным специальностям',
  explanation:'Группы используют текущую метку, явно указанную пользователем. Текущие фильтры периода и версии применяются ко всей сводке. Смена метки перемещает отклик со всей его историей; историческая специальность на момент отправки не восстанавливается.',
  caution:'Название вакансии, текст резюме и цель поиска не определяют метку. Старые, пустые и нераспознанные значения входят в отдельную группу. Статусы вводятся вручную; один отклик считается один раз в каждой колонке. Поздний этап не доказывает прохождение предыдущих. Недавние отклики имели меньше времени получить ответ. Размер группы и различия долей не доказывают причинный эффект резюме или специальности.',
  empty:'Нет откликов для сводки по специальностям.',export:'Скачать сводку по специальностям CSV',exportError:'Не удалось завершить скачивание сводки. Повторите по желанию.',
  headers:['Специальность','Всего в выборке','Отправленные','Приглашены','С интервью / оффером','Офферы','С ответом','Ответы / отправленные (%)','Интервью или офферы / отправленные (%)'],
 },
 en:{
  label:'Specialty (your label)',hint:'Optional. Up to 120 characters, with no leading/trailing whitespace or control characters. Labels are compared verbatim and case-sensitively.',
  unset:'No specialty specified',legacy:'The legacy label value is not recognized. It is preserved and excluded from classification. A new label replaces it only when you save.',
  unsaved:'The specialty label is not saved.',conflict:'The saved label changed. Compare the values before saving.',saved:'Saved specialty label',
  invalid:'Enter a valid label of up to 120 characters without leading/trailing whitespace or control characters.',save:'Save specialty',cancel:'Cancel specialty edit',clear:'Prepare to clear specialty',
  filter:'Specialty',all:'All specialties',unavailable:'The selected label is no longer available',title:'Outcomes by specified specialty',
  explanation:'Groups use the current label explicitly entered by the user. Current date and version filters apply to the entire summary. Changing a label moves the application with its full history; no historical specialty at submission is reconstructed.',
  caution:'Vacancy titles, resume text and search goals do not determine labels. Legacy, empty and unrecognized values remain in a separate group. Statuses are entered manually; each application counts once per column. A later stage does not imply earlier stages occurred. Recent applications have had less time to receive responses. Group sizes and differences in rates do not establish a causal effect of resumes or specialties.',
  empty:'No applications for the specialty summary.',export:'Download specialty summary CSV',exportError:'The summary download could not be completed. You may try again.',
  headers:['Specialty','Total selected','Sent','Invited','With interview / offer','Offers','With response','Responses / sent (%)','Interviews or offers / sent (%)'],
 },
} as const;
