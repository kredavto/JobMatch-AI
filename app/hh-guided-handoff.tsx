const HH_RESUMES='https://hh.ru/applicant/resumes/';
const HH_SEARCH='https://hh.ru/search/vacancy';

export function HHResumeSource(){
 return <div className="hh-handoff-guide">
  <p>Выбор резюме и вход в аккаунт доступны на hh.ru, не внутри JobMatch.</p>
  <a className="button secondary" href={HH_RESUMES} target="_blank" rel="noopener noreferrer">Открыть «Резюме и профиль» на hh.ru</a>
  <p>В новой вкладке войдите, если понадобится, выберите резюме и нажмите «Скачать». Скопируйте ссылку на нужную вакансию. Затем вернитесь в эту вкладку JobMatch, выберите скачанный файл и вставьте ссылку.</p>
 </div>;
}

export function HHVacancySearch(){
 return <a className="hh-handoff-search" href={HH_SEARCH} target="_blank" rel="noopener noreferrer">Найти вакансию на hh.ru (новая вкладка)</a>;
}

export function HHResultHandoff({vacancyUrl}:{vacancyUrl:string}){
 // The hh importer returns a canonical vacancy URL. Never turn arbitrary or
 // third-party links into an hh apply action.
 if(!/^https:\/\/hh\.ru\/vacancy\/\d{1,15}$/.test(vacancyUrl))return null;
 return <section className="hh-result-handoff" aria-labelledby="hh-result-handoff-heading">
  <h3 id="hh-result-handoff-heading">Сохранение и отклик на hh.ru</h3>
  <ol>
   <li>
    <a className="button secondary" href={HH_RESUMES} target="_blank" rel="noopener noreferrer">Перейти к сохранению на hh.ru</a>
    <p>В новой вкладке откройте меню исходного резюме и выберите «Дублировать». Укажите отличающееся название и проверьте видимость: дубль публикуется при сохранении и наследует видимость оригинала. Не меняйте оригинал: по прежним откликам работодатели видят последнюю версию приложенного резюме.</p>
    <p>Перенесите из JobMatch название и подтверждённые навыки в соответствующие поля дубликата. Нужные формулировки можно перенести в «Обо мне». Проверьте и сохраните изменения на hh.ru. Не правьте общий опыт работы и образование ради одного отклика: изменения затронут другие резюме, где эти сведения отображаются.</p>
   </li>
   <li>
    <a className="button secondary" href={vacancyUrl} target="_blank" rel="noopener noreferrer">Открыть эту вакансию на hh.ru</a>
    <p>Когда версия сохранена, откройте вакансию, нажмите «Откликнуться» и выберите адаптированное резюме, если появится список. Если резюме одно, выбора может не быть. Проверьте резюме до нажатия.</p>
    <p>Если появится поле письма, вставьте проверенный текст из JobMatch. Если поля не было, после отправки можно проверить, доступна ли кнопка «Приложить сопроводительное письмо».</p>
   </li>
  </ol>
  <p>JobMatch не передаёт текст по этим ссылкам, не сохраняет резюме на hh.ru и не отправляет отклик за вас. Результат останется в этой вкладке.</p>
  <p><a href="https://feedback.hh.ru/knowledge-base/article/1586" target="_blank" rel="noopener noreferrer">Как дублировать резюме</a> · <a href="https://feedback.hh.ru/knowledge-base/article/1618" target="_blank" rel="noopener noreferrer">Как откликнуться на hh.ru</a></p>
 </section>;
}
