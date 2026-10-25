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
