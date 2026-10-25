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
