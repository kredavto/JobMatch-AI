# Проверка — 25 октября 2026

- 39 unit-тестов: PASS (engine, evidence gate, SSRF, CSRF, HH disabled fallback, rate limiter).
- ESLint: PASS. TypeScript: PASS. Next production build: PASS.
- API smoke на реальной Supabase PostgreSQL: PASS — два аккаунта, import/demo, подтверждение, анализ, версия, экспорт, optimistic conflict, IDOR/RLS, CSRF.
- Playwright: мобильный landing без горизонтального overflow — PASS; полный workflow (вход → профиль → подтверждение фактов → анализ → сохранение версии → скачивание TXT) — PASS. Итого 2/2 E2E.
- Screenshot dashboard проверен вручную; исправлен overflow sidebar на невысоком экране.
- Supabase RLS: включен на всех бизнес-таблицах. Прямой запрос пользователя B к workspace A возвращает [].
- Supabase security advisor: нет предупреждений по таблицам/RLS; есть предупреждение Leaked Password Protection Disabled. Настройка: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Не проверены нагрузка, pentest, полноценный WCAG AA, восстановление резервной копии, генеративный AI, HH OAuth/write. Эти функции не объявляются production-ready. SMTP и legal/localization review остаются блокерами массового запуска.

## Итерация 0.2 — 25 октября 2026
- 77 unit/route/provider-тестов: PASS. ESLint, TypeScript, production build: PASS.
- Реальная PostgreSQL: 11 конкурентных вызовов import quota → 10 true, 1 false. Изоляция пользователей, отказ anon и неизвестного bucket: PASS.
- Привилегии счетчиков: authenticated SELECT=false, UPDATE=false; public RPC доступен только authenticated. Схема private, RLS deny-all — намеренная защита.
- Архивные тесты: повреждение ZIP, отсутствующая DOCX-структура, шифрование, макрос, traversal, завышенная/ложная распаковка, избыток записей.
- Проверены отказ на неподтвержденную/чужую версию, сохранность evidence после переимпорта, provenance восстановления, 409, 429, ошибки провайдера без утечки деталей.
- Расширенный Playwright workflow: evidence snapshot + связь отклика с версией — PASS. Мобильный landing — PASS. Итого 2/2 E2E (2,6 минуты через тестовый прокси).
- Лимит browser suite увеличен до 240с из-за последовательных запросов к реальному Supabase через тестовый прокси; timeout каждого upstream запроса остается 15с.

## Итерация 0.2.1 — 25 октября 2026
- 85 unit/route/provider/client-тестов: PASS; ESLint, TypeScript и чистая production-сборка: PASS.
- 4 новых Playwright-сценария с управляемыми HTTP-ответами: PASS — начальный 503 и повтор, 409 без потери черновика, обрыв ответа без автоматического повторения записи, конфликт двух вкладок с явным повторным сохранением на новой ревизии.
- Это UI-тесты с mock API, не повторная проверка настоящей PostgreSQL. Полный сценарий с настоящим аккаунтом в этой итерации не перезапускался; результаты предыдущей итерации приведены выше.
- Первый браузерный прогон обнаружил устаревшие артефакты локальной Next-сборки. После удаления только генерируемой .next и чистой сборки все 4 сценария прошли (2,5с).
- Черновики находятся только в React state открытой вкладки; перезагрузка/закрытие уничтожает их. Автослияния и offline persistence нет. После синхронизации анализ сбрасывается, пользователь сравнивает текст перед сохранением.

## Итерация 0.3 — 25 октября 2026
- 95 unit/route/provider/client-тестов: PASS. Проверены курсоры, owner filter, аутентификация, смена схемы ответа, потоковый экспорт нескольких страниц и маркер ошибки без раскрытия внутренних деталей.
- Реальная PostgreSQL, `supabase/tests/fact_history.sql`: PASS. Неизменность старого снимка, отсутствие лишней записи при неизмененных фактах, запрет клиентских INSERT/UPDATE/DELETE, атомарность при конфликте, изоляция пользователей, отзыв сессии, каскадное удаление, отказ anon. Все тестовые изменения откатились транзакцией.
- Security advisor: только ранее известное INFO для private.request_quotas (намеренный deny-all без клиентских политик). Для новой таблицы замечаний нет.
- Миграция 20261025105930_fact_history применена к выделенному проекту JobMatch-AI. Никакие исторические даты подтверждения не реконструированы.
- ESLint, TypeScript и production build: PASS. 5 Playwright-сценариев с mock API: PASS (история, пагинация, скачивание, четыре регрессии восстановления синхронизации), 3,1с. Первый прогон не увидел новую кнопку; после пересборки и запуска на отдельном порту все сценарии прошли. Полный workflow с реальным входом в этой итерации не перезапускался.

## Итерация 0.4 — 25 октября 2026
- 98 unit/route/provider/client-тестов: PASS. ESLint, TypeScript, production build: PASS.
- Реальная PostgreSQL: `supabase/tests/normalized_entities.sql` и повторная `supabase/tests/fact_history.sql` — PASS. Сохранены исходный JSON-контракт, порядок, optional/null поля, даты и evidence; проверены реляционные FK, чужие версии, отсутствие прямых прав записи, откат вместе с ревизией/историей, удаление событий, отзыв сессии и каскадное удаление аккаунта.
- Миграция 20261025113815_normalized_entities применена. Первое обращение сервиса миграций вернуло invalid_request_state; проверка каталога подтвердила отсутствие изменений, затем повторное применение прошло успешно.
- На момент переноса существующих workspace было 0; совместимость старого формата проверена на синтетической заполненной записи, а не на реальных данных пользователей.
- Security advisor не показал новых замечаний; остается намеренный deny-all INFO для private.request_quotas.
- Совместимый JSON write-path сохранен. Удаление дублирующих массивов требует отдельного этапа; полная миграция команд записи еще не объявляется завершенной.
- 7/7 Playwright: PASS (2,9 минуты). Пять сценариев с mock API; мобильный landing и полный workflow с настоящим Supabase Auth/PostgreSQL. Полный workflow включает импорт, подтверждение, анализ, сохранение/скачивание, привязку отклика, перезагрузку и загрузку истории фактов. Первый прогон остановился на неполном тестовом Auth fixture; после добавления instance_id/identity повторный прогон прошел без изменения рабочего кода авторизации.


## Итерация 0.5 — 25 октября 2026
- 99 unit/route/provider/client-тестов: PASS; ESLint, TypeScript, production build: PASS.
- PostgreSQL: fact_history.sql, normalized_entities.sql, write_gates.sql — PASS. Проверены запрещенный прямой DML, неизвестные действия, изменение чужих полей операции, подмена факта при verify, импорт verified факта, неизвестное/неподтвержденное evidence, ложный snapshot, подмена текста версии, старая ревизия, изменение сохраненной версии, восстановление и переписывание прошлого события.
- SQL-тест выявил ошибку приоритета операторов JSON при verify; исправлена отдельной миграцией fix_fact_comparison, после чего тесты повторно прошли.
- Миграция разбита на внутренние валидаторы и переключение границы записи. Запросы, завершившиеся invalid_request_state, не изменили каталог; это проверялось перед повтором. От удаления старых write policies отказались: отзыва DML grants достаточно, данные/политики не удалялись.
- Advisor: INFO private.request_quotas (намеренный deny-all) и WARN Leaked Password Protection Disabled (не исправлено, ссылка в SECURITY.md).
- 7/7 Playwright: PASS (3,3 минуты): mock-сценарии истории/ошибок/конфликтов и полный workflow с настоящими Auth/PostgreSQL, включая подтверждение фактов, версию, связь отклика, повторную загрузку и историю.
- Отдельная проверка trim_fact_line: обычное слово value не меняется; vertical tab и NBSP обрабатываются как в JavaScript.


## Итерация 0.6 — 25 октября 2026
- 111 unit/route/provider/client/worker-тестов: PASS. Включая allowlist публичного кеша, credentials omit, исключение API/POST/чужого origin, отсутствие кеширования документов, очистку только своего кеша и fallback после eviction.
- Браузерный offline-тест использует настоящий service worker и отключение сети; API профиля подменен синтетическим ответом. Проверены Cache Storage (ровно четыре публичных файла, без маркера профиля), сохранность открытого черновика, отсутствие автоматических writes, offline navigation, API failure и возврат онлайн.
- Мобильный offline-скриншот 390×844 проверен визуально: нет горизонтального overflow, читаемая кнопка и текст. Физические устройства/iOS install flow и полноценный WCAG AA не проверены.
- Полный authenticated workflow с реальной базой в этой итерации пропущен (тестовый аккаунт не создавался); backend/схема базы не менялись.
- Итоговый прогон: ESLint, TypeScript, build — PASS; Playwright 7 passed / 1 skipped (реальный authenticated workflow), 4,0с. Тесты повторены после добавления fallback при удалении кеша.

## Итерация 0.7 — 25 октября 2026
- ESLint, TypeScript и production build: PASS. 111 unit/route/provider/client/worker-тестов: PASS.
- Playwright: 10 passed / 1 skipped. Новый axe аудит с тегами wcag2a/wcag2aa/wcag21aa проверяет вход, восемь разделов и заполненный результат анализа на ширинах 1280 и 390 px; используются вымышленные API fixtures, включая факты, версию и отклик.
- Найдены и исправлены недостаточный контраст hero eyebrow (4,16:1) и номеров шагов (2,15:1), недоступная клавиатуре горизонтальная прокрутка таблицы на мобильном экране.
- Проверены skip link, активация разделов Enter, фокус заголовка после перехода и реальное изменение scrollLeft по ArrowRight. Добавлена подпись таблицы, scope для колонок, скрытие декоративных nav-значков, видимый фокус select/таблицы.
- Скриншот мобильного редактора проверен визуально. Полный аудит со скринридерами, увеличение текста и физические устройства остаются в roadmap; отсутствие нарушений axe не доказывает полное соответствие WCAG AA.
- Реальный authenticated workflow пропущен: в этой итерации тестовый аккаунт не создавался; backend и схема БД не менялись.

## Итерация 0.8 — 25 октября 2026
- 111 unit/route/provider/client/worker-тестов: PASS; ESLint, TypeScript, production build: PASS.
- Playwright: 11 passed / 1 skipped (12,4с). Повторно проверены восемь разделов, вход, фокус, axe на desktop/mobile, offline и конфликты.
- Новый regression test: после конфликта/перезагрузки и успешного сохранения цели сравнение с сервером остается доступным, двуязычный черновик не заменяется. Убрана привязка отображения к префиксу русской строки уведомления.
- RU/EN имеют общий тип Messages; идентификаторы навигации TabId независимы от подписей. Включен только RU; английская версия всего приложения не заявляется.
- Backend/БД не менялись. Реальный authenticated workflow пропущен; тестовые учетные записи не создавались.
- Ручная проверка NVDA/VoiceOver/TalkBack не выполнялась. Область и дальнейшие условия локализации описаны в lib/i18n/README.md.

## Итерация 0.9 — 25 октября 2026
- ESLint, TypeScript и production build: PASS; 118 unit/route/provider/client/worker-тестов: PASS.
- 7 новых unit-тестов аналитики: уникальность откликов, просмотр не является ответом, первая дата события/UTC, исход после конца когорты, запланированные вакансии, пустой знаменатель, некорректные даты, равные периоды через високосный день, версии и CSV formula injection.
- Playwright: 12 passed / 1 skipped (12,2с). Новый мобильный сценарий проверяет 100%/0% по соседним когортам, выбор версии, пустую выборку, обратные даты, сброс и содержание скачанного CSV. axe для заполненной аналитики не нашел нарушений заданных WCAG 2/2.1 A/AA правил.
- В ходе проверки исправлена явная связь подписи с select; тест ошибки уточнен, чтобы отличать сообщение формы от служебного live region Next.js. Итоговый прогон завершился успешно.
- Мобильный экран проверен визуально; таблицы прокручиваются горизонтально и доступны фокусу.
- Backend, схема БД и доступ к hh.ru не менялись. Реальный authenticated workflow пропущен, тестовые аккаунты не создавались.
- Полный EN интерфейс и ручной скринридер-аудит не заявляются.

## Итерация 0.10 — 25 октября 2026
- ESLint, TypeScript, production build: PASS. 130 unit/route/provider/client/worker/schema-тестов: PASS.
- Проверена вложенная схема: неверный тип текста/verified, дубликаты ID, отсутствующие обязательные поля, недопустимый score, некорректные даты, сохранение неизвестных полей и исторического evidence независимо от текущего профиля.
- Provider mock проверяет generic 502 для поврежденных реляционных сущностей без утечки содержимого.
- Playwright: 17 passed / 1 skipped (14,2с). Новые сценарии: явный 403/429 без автоматического повтора, ошибка вложенного read с кнопкой retry, неизвестный результат write с блокировкой повторов до reload, поврежденный import без потери черновика и без записи мастер-профиля.
- Существующие offline, accessibility, analytics, история и конфликтные сценарии также прошли.
- Реальный authenticated workflow пропущен: аккаунт для этой итерации не создавался. Изменение read validation проверено на mock-ответах; схема БД и SQL write gates не менялись. Активной интеграции hh.ru нет.

## Итерация 0.11 — 25 октября 2026
- ESLint, TypeScript, production build: PASS. 144 unit/route/provider/client/worker/schema-теста: PASS.
- Новые проверки целостности rules-v1: выдуманный текст, неизвестное и неподтвержденное evidence, завышенный балл, удаленный blocker, измененная цитата/confidence, дубли/пропуски правок, устаревшие факты/вакансия и поврежденная структура.
- Текст вакансии с инструкциями остается данными; тест проверяет отсутствие неподтвержденной правки.
- Playwright: 20 passed / 1 skipped (17,2с). Три новых сценария начинают с принятого корректного анализа, получают поврежденный ответ, проверяют сброс предыдущего результата и отсутствие кнопки сохранения, затем восстанавливаются через reload. Автоматические записи отсутствуют.
- Реальный authenticated workflow пропущен. Использованы синтетические ответы API; backend/БД не менялись. Это не независимая семантическая проверка движка и не гарантия ATS-score.

## Итерация 0.12 — 25 октября 2026
- ESLint, TypeScript, production build: PASS; 154 unit/route/provider/client/worker/schema-теста: PASS.
- 10 новых export-тестов: короткие страницы, owner/token binding, отсутствие токена в файле, изменение ревизии, неправильный порядок/дубликаты/схема журнала, курсор без продвижения, прерванное чтение, поврежденное согласие, лимит большого журнала.
- Playwright: 22 passed / 1 skipped (16,9с). Проверено содержимое реально скачанного JSON, отдельная инструкция истории, отсутствие download при complete=false/поврежденной схеме и успешное восстановление.
- Начальная ошибка типов в параметризованном тесте исправлена до запуска итогового прогона.
- Реальный authenticated workflow пропущен. Постраничные ответы проверены на mock-провайдере; схема БД/права не менялись. Полная история фактов по-прежнему экспортируется отдельно.

## Итерация 0.13 — 25 октября 2026
- ESLint, TypeScript, production build: PASS; 163 unit/route/provider/client/stream/schema-теста: PASS.
- Проверены порядок/дубли ID, cursor bounds, поврежденные facts/timestamp, короткие страницы до empty termination, повтор провайдером страницы, terminal complete:false при ошибке/лимите, отсутствие утечки деталей, отмена до следующей страницы и при уже запущенном чтении.
- Полный export с before возвращает 400 до запроса данных.
- Playwright: 23 passed / 1 skipped (19,3с). Новый сценарий: поврежденная следующая страница оставляет один исходный снимок, повтор после исправления корректно завершает пагинацию. Существующий history-тест обновлен под завершение на пустой странице.
- Реальный authenticated workflow пропущен; ответы провайдера и отмена потока проверены на mocks. Схема БД и права не менялись.

## Итерация 0.14 — 25 октября 2026
- ESLint, TypeScript, production build: PASS; 181 unit/route/provider/client/stream/schema-тест: PASS.
- Auth contracts: missing token при login/refresh, signup user vs malformed data, invalid refresh token/expiry/type, cookie-control characters, acknowledgment discriminator проверены.
- Route tests проверяют отсутствие Set-Cookie при ошибке, HttpOnly/Secure/SameSite=strict и expiry при успехе, локальный logout после AUTH и отсутствие ложного успеха при outage.
- Playwright: 26 passed / 1 skipped. Новые сценарии: malformed refresh с последующим retry, malformed logout без потери черновика, confirmation response при login не считается входом.
- Ошибка инициализации mock в расширении logout-тестов исправлена до итогового прогона.
- Реальный authenticated workflow пропущен. Протокол проверен на mocks и официальном исходном signup handler; живые SMTP/межустройственные сессии не проверены. Схема БД и настройки Auth не менялись.

## Итерация 0.15 — 25 октября 2026
- ESLint, TypeScript, production build: PASS; 185 unit/route/provider/client/stream/schema-тестов: PASS.
- Route tests: проверка expectedOwnerId по новой сессии до Set-Cookie, отказ другому владельцу, отклонение записи из устаревшей вкладки, logout без глобального отзыва чужого аккаунта.
- Playwright: 31 passed / 1 skipped (20,2с). Проверены восстановление с сохранением текста на мобильном viewport, отказ другому аккаунту, отсутствие автоматической записи, сравнение с серверным текстом, очистка пароля после попытки, смена владельца при reload, очистка дополнительных черновиков после обычного logout, 401 при импорте и истории.
- axe на форме повторного входа не нашел нарушений заданных WCAG 2/2.1 A/AA правил.
- Реальный authenticated workflow пропущен. Новые auth/owner сценарии проверены на mock-провайдере и браузерных fixtures; живой межустройственный отзыв не проверен. Схема БД и настройки SMTP/Auth не менялись.

## Итерация 0.16 — 25 октября 2026
- ESLint, TypeScript и production build: PASS; 190 unit/route/provider/client/stream/schema тестов: PASS.
- История, NDJSON и импорт отклоняют несовпадающего владельца до чтения БД/файла; проверены malformed, повторные и конфликтующие hints, совместимость старых клиентов.
- Playwright: 33 passed / 1 skipped (22,3с). Новые сценарии проверяют owner header, 409 при истории/импорте, сохранение текста, повторный вход и привязку ссылки NDJSON.
- Реальный authenticated workflow пропущен; новые сценарии используют mocks, не физические устройства или живую смену аккаунтов. Схема БД и настройки Auth не менялись.

## Итерация 0.17 — 25 октября 2026
- ESLint, TypeScript, чистая production build: PASS; 197 unit/route/provider/client/schema/stream тестов: PASS.
- Coach: подтвержденные evidence, неизвестные/частичные требования, приоритет обязательных пробелов, пустой ввод, цитата с prompt injection, TXT без выдуманных результатов, неизменность фактов.
- Playwright: 34 passed / 1 skipped (22,0с). Новый мобильный сценарий проверяет фильтры, учебное задание Python, TXT выбранной группы, evidence, переход в профиль и отсутствие записи. axe заданного блока: PASS.
- Первый прогон браузера получил старые сборочные артефакты; после переноса .next и чистой сборки отдельный и полный прогоны прошли. Первоначальный unit-тест выявил пропуск пометки учебного контекста в конкретном задании; пометка добавлена для всех упражнений.
- Реальный authenticated workflow остается пропущенным. Coach детерминированный, без LLM; качество генеративного AI не тестировалось. БД и SMTP не менялись.

## Итерация 0.18 — 25 октября 2026
- Чистая установка `npm ci --ignore-scripts --offline`: PASS (451 пакет). Исправлены версии @humanfs/types и type-check в lock-файле в соответствии с неизмененными resolved tarball/integrity; версия приложения меняется только в корневых полях.
- После установки: ESLint, TypeScript, 210 unit/route/provider/client/schema/stream тестов и production build: PASS.
- Письма: четыре стиля, дословность фактов, отказ неподтвержденным/отозванным/несуществующим/повторным evidence, пустой вакансии, неподтвержденным обещаниям из входного текста; неизменность профиля.
- Playwright: 35 passed / 1 skipped (22,8с). Новый мобильный сценарий: выбор evidence, редактирование, сброс подтверждения, точный TXT, восстановление шаблона, смена стиля, отсутствие записи; axe блока письма PASS.
- Первичная ошибка типизации параметризованного теста исправлена до успешных прогонов. Реальный authenticated workflow остается пропущенным. Письма шаблонные, без LLM и автоматической отправки; ручной текст не проходит семантическую проверку и явно помечается.

## Итерация 0.19 — 25 октября 2026
- ESLint, TypeScript, чистая production build: PASS; 235 unit/route/provider/client/schema/stream тестов: PASS.
- Отдельная матрица RU/EN отрицаний, будущего обучения, отрицания с апострофом, положительных формулировок, противоречащих фактов, несвязанных навыков и отрицательных требований. Проверены match, propose, gate и letterEvidence.
- Playwright: 36 passed / 1 skipped (23,0с). Новый мобильный сценарий: противоречие дает unknown, причина доступна, письмо из конфликтующих фактов недоступно, переход в профиль сохраняет оригинал, автоматической записи нет. axe нового блока PASS.
- Реальный authenticated workflow пропущен. Новая проверка эвристическая и не гарантирует понимание всех отрицаний/контекстов. Схема БД не изменялась; семантические правила исполняются приложением, SQL gate остается проверкой структурной целостности.

## Итерация 0.20 — 25 октября 2026
- После восстановления рабочей среды подтверждена сохранность изменений; повторно пройдены ESLint, TypeScript, 239 unit/route/provider/client/schema/stream тестов и production build.
- Playwright завершился до отключения среды: 37 passed / 1 skipped (28,3с), результат проверен по сохраненному журналу. Новый сценарий проверяет мобильную историю, сохраненную редакцию/счетчики, точный JSON и отсутствие выдуманных метаданных у старых версий.
- Unit/route проверки: независимость снимка от текущей конфигурации, корректность суммы счетчиков/весов, сохранение метаданных при переимпорте и restore, игнорирование подставленных клиентом score/metadata.
- SQL normalization хранит extra без потери полей; restore сравнивает весь исходный объект кроме id/created/restored_from. Это проверено чтением действующего SQL-кода, не новым живым прогоном БД. Миграция не требуется.
- Реальный authenticated workflow по-прежнему пропущен. Метаданные — сводка расчета, а не полный снимок анализа или криптографическое подтверждение; семантику SQL не пересчитывает.

## Итерация 0.21 — 25 октября 2026
- ESLint, TypeScript, production build: PASS; 244 unit/route/provider/client/schema/stream теста: PASS.
- Помесячные группы: UTC-граница месяца, поздние результаты, повторные события, отсутствие выведенных по предположению этапов, фильтр версии/периода, сортировка, пустые и некорректные даты, CSV.
- Playwright: 38 passed / 1 skipped (27,1с). Новая мобильная проверка: две группы, фильтрация, rates со знаменателями, CSV только выбранного месяца, пустое состояние/disabled export; axe страницы PASS.
- Реальный authenticated workflow по-прежнему пропущен. Статусы ручные; временные группы не являются доказательством причинного эффекта резюме. БД, авторизация и внешние интеграции не менялись.

## Итерация 0.22 — 25 октября 2026
- ESLint, TypeScript, production build: PASS; 249 unit/route/provider/client/schema/stream тестов: PASS.
- ICS: UTC время и длительность, UID, optional DISPLAY alarm, escaping/injection, UTF-8 folding <=75 октетов и обратное восстановление текста, некорректные дата/UID/длительность, проверка местного времени.
- Playwright: 39 passed / 1 skipped (25,8с). Московское 10:30 экспортируется как 07:30 UTC; проверены файл, исключение заметок/резюме, отсутствие изменения статуса/API-записи и сообщение о необходимости импорта. axe страницы PASS.
- Спецификация проверена по RFC 5545. Импорт в реальные Google/Apple/Outlook календари, уведомления и повторный импорт не проверялись; гарантия доставки не заявляется. Реальный authenticated workflow по-прежнему пропущен. Миграций/серверных задач нет.

## Итерация 0.23 — 25 октября 2026
- ESLint, TypeScript, production build: PASS; 259 unit/route/provider/client/schema/stream тестов: PASS.
- Провайдер: документированные коды завершения refresh/session, ограничение refresh-кодов нужным endpoint, 500/502/503 с HTML, 429 с HTML, обрыв чтения тела без утечки деталей.
- Playwright: 41 passed / 1 skipped (26,9с). Новые сценарии: outage при refresh → ручной retry → форма входа после завершенной сессии; expectedOwnerId при refresh черновика → 409 → повторный вход с сохранением текста, без автоматической записи.
- Источник кодов: официальная документация Supabase Auth, ссылки в SECURITY.md. Новые провайдерские сценарии проверены на mocks; живой authenticated workflow остается пропущенным. Схема БД, SMTP и настройки Auth не менялись.

## Итерация 0.24 — 25 октября 2026
- Закрыт ранее повторявшийся пропуск authenticated workflow: полный Playwright-прогон 43 passed (6,8 мин), без skipped. Из них два live-сценария работали через локальную production-сборку с действующим Supabase Auth/PostgreSQL; остальные используют прежние fixtures/mocks.
- Live isolation/revocation/delete: PASS (3,1 мин). Live profile → verified facts → analysis → immutable version → TXT → tracker → reload → history: PASS (3,2 мин).
- SQL дополнительно подтвердил сохранение match_metadata в реальной resume_versions.extra. После очистки по точным UUID: users/sessions/refresh_tokens/identities/workspaces/profile_facts/resume_versions/applications/application_events/fact_history/audit_log/consent_records/request_quotas = 0 для двух fixtures. Управляемые инфраструктурные журналы провайдера не очищались; их retention не менялся.
- Fixtures: два случайных UUID и временный случайный пароль; только синтетические данные, без отправки писем. Создание через административный seed после проверки схемы, удаление второго через приложение и финальная административная очистка оставшихся тестовых сессий/аккаунтов. Временный файл учетных данных удален; в git секретов нет.
- Защита тестового harness от реальных адресов покрыта unit-тестом. Общий test timeout live-сценариев увеличен до 15 минут из-за внешней задержки в среде; HTTP-таймауты приложения не менялись.
- Ограничения: браузерный localhost с production-сборкой, не полный authenticated прогон на домене Vercel; второй независимый клиент проверен через APIRequestContext, не физическое устройство. Регистрация с email, SMTP/password recovery, импорт реальных персональных файлов и доставка календарных уведомлений не тестировались.
- Финальные проверки: ESLint, TypeScript, 260 unit/route/provider/client/schema/stream/harness тестов и production build PASS. Security advisors: прежние INFO о deny-all private.request_quotas и WARN об отключенной leaked password protection; новых schema/RLS изменений не было. Настройка защиты паролей остается эксплуатационной задачей.

## Итоговая приемка 0.32 — 26 октября 2026
- 54 Playwright PASS без skipped (7,5 мин), включая два живых сценария Supabase Auth/PostgreSQL через локальную production-сборку.
- Изоляция, отзыв сессии, удаление профиля, подтверждения фактов, анализ, версия, TXT/DOCX с обратным чтением Mammoth, отклик, reload и история прошли.
- 312 Vitest PASS; lint/typecheck/build PASS. Прочие браузерные сценарии используют mocks.
- Временные сессии и аккаунты удалены; SQL подтвердил 0 оставшихся auth.users для двух точных fixture UUID. Файл пароля удален. Инфраструктурные журналы не очищались.
- SMTP/recovery, полный authenticated сценарий на домене Vercel и восстановление резервной копии не проверены. Эти пункты не объявляются завершенными.

## 0.33 — восстановление пароля (26 октября 2026)
- 322 unit tests passed; lint, typecheck and production build passed.
- New recovery route tests cover origin/PKCE cookie/config checks, malformed grants, token redaction, update and separate logout failure.
- Browser recovery tests use mocks; real SMTP delivery, PKCE exchange and new-password login remain pending. Previous 0.32 live acceptance does not cover recovery.
- Targeted browser checks: 8 passed (3 password recovery + 5 existing auth failures); no actual email sent.

## Подготовка резервного восстановления — 28 октября 2026
- Живой read-only запрос к каталогу JobMatch-AI: на 8 таблицах public и private.request_quotas включён RLS; anon SELECT и authenticated прямой INSERT/UPDATE/DELETE отсутствуют. Пользовательские строки не читались, схема и данные не менялись.
- Security advisor: INFO deny-all private.request_quotas без политик (ожидаемо); WARN Leaked Password Protection Disabled остаётся открытым. Настройка не изменялась.
- 11 Python-тестов инструмента manifest PASS: сравнение содержимого, полнота 13 таблиц, потоковый протокол, отказ при сбое/неполном выводе, атомарный файл 0600, сохранность эталона, очистка временных файлов и процесса. psql в тестах подменён; это не живой restore.
- Инструмент фиксирует UTF-8, DateStyle/UTC и bytea_output; читает в read-only repeatable-read транзакции, требует маркер успешного завершения после COMMIT. Полные строки не сохраняются в manifest.
- PRODUCT_SPEC актуализирован: шаблонные письма, coach, ICS и DOCX уже реализованы; генеративный AI/HH write остаются вне MVP.
- Регистрация/SMTP/recovery и реальный restore в этом прогоне не проверялись; прежние 9/11 пунктов приёмки не изменены. Lint/typecheck/build приложения повторно не запускались: runtime приложения не менялся.

## Автоматизация синтетического restore — продолжение 28 октября 2026
- Подготовлен workflow с отдельным PostgreSQL 17, реальными pg_dump/pg_restore и 13 заполненными таблицами, тремя SQL-suite и отрицательной проверкой изменения содержимого.
- Локально повторно пройдены 11 Python-тестов. Защитный отказ drill без явного разрешения и loopback-хоста проверен. Полный PostgreSQL-прогон в текущем окружении недоступен: установка системного сервера ограничена окружением; результат CI фиксируется отдельно после запуска.
- Supabase Auth заменён минимальным SQL fixture только в тестовой базе. Рабочая база, SMTP и настройки провайдера не изменяются.

### Результат реального CI PostgreSQL 17
- GitHub Actions run 40645763293: SUCCESS (28 октября 2026), https://github.com/kredavto/JobMatch-AI/actions/runs/40645763293 . Проверен commit 28e1126bddbe176761c095faa71bc52c39f224a5.
- 11 Python-тестов PASS. Реальные pg_dump/pg_restore, совпадение 13 непустых таблиц, fact_history.sql / normalized_entities.sql / write_gates.sql на восстановленной базе и обнаружение намеренно изменённой строки PASS. Созданные базы удалены; service-контейнеры остановлены.
- Первый CI run 40645561652 остановился при установке отсутствующего в Ubuntu пакета клиента 17, до запуска тестов. Исправлено использованием официального PostgreSQL 17 job-контейнера с подходящими клиентами; повторный полный прогон прошёл.
- Это подтверждает синтетический restore прикладной схемы и инструментов. Эксплуатационное восстановление Supabase с настоящей схемой Auth, SMTP и реальными настройками провайдера не выполнялось; пункты MVP остаются открытыми.

## 0.34 — необязательный self-hosted AI-разбор (28 октября 2026)
- 359 Vitest PASS, ESLint/typecheck/production build PASS. Нет новых зависимостей; package и lock согласованы на 0.34.0.
- Полный Playwright-прогон: 61 passed / 2 skipped (1,4 мин). Два пропуска — живые Supabase accounts (нет fixture credentials). Это не повторная живая эксплуатационная приёмка.
- Шесть новых браузерных сценариев: согласие, цитаты и отсутствие workspace writes; отказ выдуманным цитатам и явный retry; отключённый сервис; чужой owner; старая revision; реальный route 401 без сессии. AI response в UI подменён. Автоматический axe нового блока на mobile PASS; screenshot 390 px просмотрен.
- Provider tests: реальный локальный HTTP fixture плюс mocks подтверждают JSON schema, фильтрацию входных фактов, точные цитаты/IDs, лимиты, ошибки/усечение ответа и safe errors. Это не живой запуск LLM и не оценка семантической релевантности.
- В production inference требует HTTPS собственного endpoint, отдельной operator opt-in конфигурации и bearer token шлюза; отключён по умолчанию. URL не приходит от пользователя, redirects запрещены, таймаут 20с, без retry. Внешняя модель не вызывалась, данные рабочей базы не читались/не менялись.
- Клиент проверяет owner/revision и результат, backend читает сохранённый snapshot с текущей сессией и analysis quota; AI не меняет score/профиль/версии.
- Первый build остановился из-за внешнего symlink node_modules, после локального копирования зависимостей чистая сборка прошла. Первый browser run не увидел отдельный процесс сервера; запуск сервера и тестов в одном процессе окружения устранил отказ соединения, затем полный набор прошёл.
- Полный план завершения сохранён в COMPLETION_PLAN.md. Проект в целом ещё не завершён: реальные SMTP/restore, условия размещения, self-hosted модель/evaluation и HH permissions остаются открытыми.

## Команды записи после 0.34 — 28 октября 2026 (не опубликованы)
- Свежий origin/main: b05c45d0b77fd1b25916892611ccc622d4b4b128; открытых PR перед началом работы нет. PR #1/#2 уже объединены по разрешению владельца; исправлена устаревшая запись в COMPLETION_PLAN.
- 384 Vitest PASS, production build PASS. Новые проверки покрывают компактный RPC payload без snapshot, три команды в route, owner/origin/quota, схемы/дубликаты/лимиты, атомарный ответ с revision+1, отсутствие повторов и fallback на save_workspace.
- SQL-suite добавлен в синтетический PostgreSQL restore CI: commands ↔ legacy revisions, unknown/foreign IDs, отзыв сессии, grants, отсутствие частичных записей, история и проекция. Результат реального CI будет дописан после запуска. Локального PostgreSQL нет; mocks не выдаются за SQL-проверку.
- UI и внешние сервисы не менялись. Рабочая БД не мигрировалась; SMTP, реальная модель, restore Supabase, разрешения hh.ru и решение о данных не проверены. Новый релиз и объединение PR не выполнялись.

## Кандидат 0.35 — почта и честный статус регистрации (29 октября 2026)
- Исходный main: `38117e007909d13cc87a73e3efe488a6c134aba9`. Lint/typecheck и 402 Vitest-проверки (38 файлов) прошли; production build прошёл.
- Чистая production-сборка и полный Playwright: 65 passed / 2 skipped, 37,8 с. Пропуски — живые Supabase accounts, fixture credentials отсутствуют. SMTP/реальные пароли не использовались и письма этими тестами не отправлялись.
- Новые проверки: origin и APP_URL до provider access; strict resend input, запрет произвольного redirect/type, quota, no-store, отсутствие cookies/утечки текста провайдера; мобильная форма, axe WCAG AA tags, cooldown, ручной retry, непрозрачный статус повторной регистрации. Дополнена проверка recovery с другого origin.
- Первый финальный E2E увидел старый текст в ранее собранном frontend bundle и не прошёл новый тест. После переноса `.next` и одной чистой сборки полный прогон прошёл; выше указан именно результат чистой сборки.
- Новый application CI: Node 24, npm ci, lint, types, unit, build, browser без production secrets; реальная доставка почты им не проверяется. Результат GitHub CI фиксируется отдельно после выполнения.
- Read-only проверки production: Vercel deployment `dpl_G6XSXvaskLfuxKsN4WiyrCN8fUyg` READY для baseline main, `/` HTTP 200, `/api/service` без сессии HTTP 401; `apply_workspace_command(integer,jsonb)` существует. Новый код ещё не выпущен.
- В Auth найден уже подтверждённый Gmail-аккаунт. Точный адрес пользователя пока неизвестен, поэтому это не доказательство доставки его нового письма. Свежие записи Auth имеют path `/`; отсутствие строк по фильтру `/signup` не доказывает отсутствие попытки. Последний полученный error_code — `invalid_credentials`, без привязки к запрошенному пользователем адресу.
- Кандидат не закрывает live email acceptance, restore копии провайдера, решение оператора о данных и полный живой сценарий финального Vercel-релиза. 100% публичную готовность не заявляем.

- Первый application CI run 40837901259 прошёл lint/types/402 unit/build, но остановился до browser tests: ubuntu-latest разрешился в Ubuntu 26.04, не поддерживаемую установленным Playwright 1.58.2. Runner закреплён на ubuntu-24.04; результат повторного прогона смотреть в checks PR #15. Это ошибка окружения CI, не успешный браузерный прогон.

- Дополнение к PR #15 после скриншота входа: известный код `invalid_credentials` при password grant получает фиксированную подсказку о пароле JobMatch AI и восстановлении, без SMTP-диагноза, наличия аккаунта или raw сообщения провайдера. Тестируются оба поля кода GoTrue (`error_code`/`code`). Предыдущий CI run 40838154826 успешен для d47613f; актуальные checks — в PR.

## Exact-main adaptation diagnostic — 31 October 2026

Actual executable head `b835de8f549acf7f4afcdbf58ba7bf7abb54f9c4`, tree
`743afc0467112449525e3106e3d245b6f23c0d6e`;
[run41247954513/job124675216380](https://github.com/kredavto/JobMatch-AI/actions/runs/41247954513/job/124675216380).
16/16 actual positive-token stop responses, 1,074 tokens; 0/16 gold passes,
14 provenance failures and 2 graded mismatches. Runtime success is not acceptance.
[Complete unchanged original report](evaluation/adaptation/results/20261031-exact-main.md)
contains source/corpus/payload/image/binary/model/license hashes and raw synthetic
outputs. Local source hashes and frozen corpus were checked against the report.
Model remains NOT ACCEPTED; no production gates or SQL/DB changed, no true rewriting
or independent semantic/held-out acceptance established. This archival change is
Markdown-only; executable tree content remains identical and inference is not rerun.

## 1 ноября 2026 — main-only backend протокол версий писем, локальный этап
- База: свежий main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`; четыре документа и 61 открытый PR прочитаны. Непринятые результаты #66–#69 не повторялись и не стали модельной приёмкой.
- Локально: 699/699 unit/route tests (52 файла; 77 новых), 30 Python tests, lint/types и production build PASS. 11/11 локальных browser scenarios (экспорт/owner-bound ссылка/повторный вход, mock API) PASS. Golden local snapshot v1 и тексты четырёх RU шаблонов сохранены. Новые тесты проверяют подпись/TTL/source/owner/revision, отказ подмены, unknown-result без повтора, frozen history и неполный/отменённый поток.
- Native PG17 full/incremental/RLS/concurrency/15-table dump-restore workflow добавлен, **результата ещё нет**; конфигурация теста не выдаётся за успешное исполнение. Default legacy restore остаётся 13-table и не покрывает новый key/receipt scope.
- Обычные SQL source edits: Supabase CLI не запускался после прежнего auto-review отказа из-за исходящей PostHog telemetry; CLI generation/advisors и provider применение отсутствуют. Нет production SQL, ключа, SMTP, HH write, платного provisioning, merge/release. Default-off и контракт/пределы описаны в [SAVED_LETTER_PROTOCOL.md](docs/SAVED_LETTER_PROTOCOL.md). UI серверного сохранения — следующий отдельный блок; модель/семантика, SMTP/recovery, реальная копия Supabase/RPO/RTO и решение оператора о ПД остаются открыты.
