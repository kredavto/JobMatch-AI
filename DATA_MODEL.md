# Данные

## Физическая модель MVP
- auth.users: учетная запись Supabase Auth.
- auth.sessions: сессии провайдера.
- public.workspaces: user_id (FK ON DELETE CASCADE), revision, payload JSONB, updated_at.
- public.audit_log: id, user_id FK cascade, action, created; без текстов резюме и токенов.
- public.consent_records: user_id FK cascade, version, created.

JSONB: original, facts[], vacancy, versions[], applications[], goal. Fact: id/evidence_id, text, source, verified. Version: id, created, text, vacancy, evidence_ids, score. Application: id, title, status, note, created, events[].
Факты не являются независимой проверкой квалификаций. Импорт создает unverified строки. Старые версии — снимки; отзыв подтверждения факта не переписывает исторический снимок.

RLS ограничивает чтение и изменения auth.uid(). Save RPC сериализует изменения одного владельца и проверяет revision. Удаление auth.users каскадно удаляет бизнес-данные. Резервные копии провайдера и ранее скачанные файлы требуют отдельной политики удаления.

## Целевая нормализованная модель
| Сущность | Ключевые связи |
|---|---|
| User | владелец всех персональных ресурсов |
| ProviderConnection | User, provider, encrypted tokens, scopes, expires_at |
| MasterProfile | User, revision, employment/education/preferences |
| VerifiedFact | MasterProfile, immutable evidence id, source, status, confirmation event |
| Resume | User, source, original |
| ResumeVersion | Resume, Vacancy, parent version, immutable snapshot |
| Vacancy | User, provenance, original, retention/expires_at |
| VacancyRequirement | Vacancy, quote, importance, category |
| MatchAnalysis | Profile revision, Vacancy revision, engine/config version |
| SuggestedEdit | Analysis, before/after, evidence ids, decision |
| ConsentRecord | User, policy version, timestamp, scope |
| Application | User, Vacancy, ResumeVersion |
| ApplicationEvent | Application, status, occurred_at, provenance |
| AuditLog | User, action, entity id, timestamp; redacted |

Эта нормализация не объявляется реализованной. Ее миграция должна сохранить владельцев, снимки и revision.

## Дополнения 0.2
ResumeVersion: evidence_snapshot (копии выбранных подтвержденных фактов), profile_revision (revision workspace в момент сохранения), engine_version; restored_from при восстановлении. Старым версиям доказательства задним числом не приписываются. Application.resumeVersionId связывает с версией этого же workspace; сервер проверяет наличие, UI допускает «Без привязки». Это еще не нормализованный SQL foreign key. private.request_quotas хранит по три фиксированных счетчика на auth.users с ON DELETE CASCADE.


## История фактов (0.3)
`public.fact_history` хранит id, user_id (FK auth.users, ON DELETE CASCADE), workspace_revision, kind (baseline/change), facts JSONB, captured_at. Это независимая таблица снимков; текущая модель workspace пока не полностью нормализована. AFTER-триггер в private использует узкое SECURITY DEFINER для append-only записи, проверяет auth.uid и активную сессию. История создается атомарно при изменении массива facts; неизмененные факты не дают лишнего снимка. RLS позволяет только SELECT владельцу с активной сессией; клиентские INSERT/UPDATE/DELETE запрещены grants. Администратор БД по-прежнему обладает привилегиями — это не криптографический журнал.

Начальные записи baseline означают дату фиксации состояния, не время подтверждения. `/api/fact-history` читает по 20 снимков с курсором id; `?export=1` передает NDJSON по страницам. Последняя запись `{"complete":true}` подтверждает полное завершение; при прерывании/таймауте файл нужно скачать повторно. JSON-экспорт профиля содержит ссылку на отдельный экспорт истории. Для полного архива нужны оба файла. История хранится до удаления аккаунта; автоматического сокращения срока хранения пока нет. На время экспорта новые снимки после начала не включаются.


## Реляционные сущности (0.4)
| Таблица | Данные | Ключ и связи |
| --- | --- | --- |
| profile_facts | text, source, verified, position | PK user_id + id; FK workspace |
| resume_versions | text, vacancy, score, created, evidence_ids, position | PK user_id + id; FK workspace |
| applications | title, status, note, created, resume_version_id, position | PK user_id + id; FK workspace; составной FK версии |
| application_events | status, date, position | PK user_id + application_id + position; FK отклика |

ID имеют тип text для совместимости с ранними ev-N и UUID. Даты сохраняются дословно в text, без преобразования часового пояса. Поле extra JSONB сохраняет необязательные поля старых/новых версий (например evidence_snapshot, restored_from) и неизвестные расширения. Отсутствующий resumeVersionId отличается от явного null через version_link_present. Снимки evidence не связаны FK с текущими фактами: повторный импорт не должен удалять старые доказательства.

`read_workspace()` — SECURITY INVOKER, без входного user_id, один SQL-запрос со стабильным снимком и RLS. Он реконструирует прежний контракт API из реляционных таблиц и верхних полей workspace. Запись пока проходит через прежний save_workspace с optimistic revision и атомарный триггер. JSON payload остается совместимым представлением записи, не независимым вторым писателем; прямой клиентский INSERT/UPDATE/DELETE нормализованных таблиц запрещен. Это expand-фаза миграции, не окончательный отказ от JSON.


## Допустимые изменения (0.5)
Действия записи: import/demo (original,facts,vacancy), fact (append неподтвержденного факта и исходного текста), verify (только flags), goal, vacancy, version/restore (append неизменяемой версии), application (одна запись с append-only событиями). Другие поля должны совпадать с текущим состоянием. Ревизия, owner и журнал формируются базой. Нормализованные таблицы и история обновляются прежними атомарными триггерами. Внешний JSON-контракт сохранен.

## Метаданные оценки (0.20)
Optional `ResumeVersion.match_metadata` содержит `rules_revision`, `weights`, `contributions`, `requirements`, `outcomes`. Используется существующий JSONB `resume_versions.extra`, без миграции. Сервер формирует сводку из того же результата match, что и score; клиент не задает ее при сохранении. WorkspaceSchema проверяет типы, диапазоны, сумму весов и счетчиков. Старые версии без поля допустимы; restore сохраняет метаданные оригинала. `rules-v1` остается протоколом, `rules_revision` обозначает редакцию поведения и конфигурации (ее необходимо менять при будущих изменениях правил). Для полного воспроизведения не хватает полного снимка исходных фактов/строк сопоставления; эти сведения не выдумываются для истории.
