# Labelled source suggestions for structured records

Local labelled-source-v1 rules assist manually reviewed source-backed records. They are not a model or a general resume parser. The input is the saved structured-profile source snapshot, not unsaved import text or inferred facts. Generation, preview, closing and copying have no request, persistence, confirmation, Score change or accepted resume version.

## Flow and supported grammar

Open the structured profile and explicitly request suggestions. Review every literal quote, its half-open Unicode code-point range, proposed kind, dates and duplicates against the full saved source. Closing has no write. Copying fills an empty local draft and never silently replaces existing fields. Clear the draft explicitly if replacement is wanted.

The existing add command saves an unconfirmed record with owner/workspace/profile revisions and exact source validation. Confirmation is a separate user assertion about every field's meaning and accuracy. It is not independent verification. Immutable literal versions still require their own preview and acceptance.

| Kind | Exact section headings, case insensitive |
| --- | --- |
| employment | Employment, Work experience, Опыт работы |
| education | Education, Образование |
| certification | Certification, Certifications, Сертификат, Сертификаты |
| achievement | Achievement, Achievements, Достижение, Достижения |

A heading may have one to three Markdown hashes followed by whitespace and a trailing colon. Blank lines separate records while retaining a known section kind. Each field is a single labelled line with a colon, optionally preceded by a -, * or • bullet and whitespace. There is no multiline continuation or fuzzy classification.

| Field | Labels |
| --- | --- |
| title | Title, Position, Program, Название, Должность, Программа |
| organization | Organization, Company, Institution, Организация, Компания, Учебное заведение |
| start | Start, Start date, Issue date, Начало, Дата выдачи |
| end | End, End date, Окончание |
| description | Description, Achievement, Описание, Достижение |
| credential | Credential, Certificate number, Номер сертификата |

Titles are required except for achievements, which require a description. Credential is certification-only. Repeated aliases invalidate a block rather than overwriting a field. Unknown lines invalidate the current block and clear section context; a later title cannot inherit an unrelated old section kind. Only a recognized heading resumes extraction. Unsupported blocks and lines outside known sections have separate counts.

Example saved source:

    Опыт работы
    Должность: Инженер
    Организация: Орбита
    Начало: 2020-03
    Окончание: настоящее время

The end marker remains verbatim and receives a date-uninterpreted warning. Today's date and duration are not inferred. Unsupported/free-form resumes remain available for manual selection. An empty suggestion list does not mean the resume contains no work or qualifications.

## Exact ranges and bounds

Only edge whitespace is trimmed from values; the retained quote is an exact source slice. CRLF, CR, LF, U+2028/U+2029, emoji, ZWJ and combining marks retain their code-point positions. Values are not translated or Unicode-normalized.

Source: at most100,000 code points with a cheap200,000 UTF-16-unit guard, well formed, no unsupported C0/DEL controls (tab and supported line separators are allowed). Fields:1–500 code points, existing command schema. Conservative instruction/negation/intention screening rejects a whole block, without claiming semantic safety or competence. Nothing is repaired, shortened or filled from another source.

At most20 valid suggestions are shown. limitReached explicitly identifies additional omitted valid records; source is not truncated. The bounded full source is scanned for unsupported-block/outside-line counts. The persisted profile retains its50-record cap. Suggestion state is not a second storage mechanism.

## Date diagnostics

Only ASCII YYYY, YYYY-MM and YYYY-MM-DD are recognized for optional diagnostics. Calendar validity includes month lengths and Gregorian leap-year rules; year0000 is unsupported. These checks do not establish a real employment period, date meaning, issue date or truth.

Ambiguous separators, prose, present/current markers, unsupported digits, invalid dates or different precisions yield date-uninterpreted. Recognized dates with equal precision and a later start yield date-order. No values are corrected, converted to a timezone, normalized, expanded or used to calculate experience. Warnings remain preview annotations rather than stored semantic metadata.

## Context and failures

Suggestion state is keyed to exact in-memory source context plus validated profile/workspace/read generation. Refresh clears the old report; locale-only changes preserve it and translate copy without new requests. source_matches=false hides suggestions. Busy/blocked/mismatched/capped profiles disable adoption.

Draft fields, including manual selections, carry exact source context: owner, source workspace revision, original and ordered fact IDs. Replacing a still-matching loaded snapshot preserves draft fields for comparison but blocks capture/save until explicit clear. An outdated source keeps the existing manual editor closed; its source snapshot remains available for review/download. Context keys are not logged, persisted, transmitted or DOM attributes. Existing owner isolation and server source/session/revision validation remain authoritative.

After a lost write response the draft remains and commands stay blocked until an explicit read. No write is replayed or candidate automatically confirmed. Reading current data may reveal an already committed unconfirmed record; inspect it and duplicates before any new explicit save. Locale changes do not reset these guards.

## Compatibility and open acceptance

Entry/command/export/backup formats, SQL/RLS, source/session/CAS guards and immutable template versions are unchanged. Only selected literal fields enter the existing add command. Parser/model provenance is not invented as an accepted AI change; generative rewrite and accepted-model provenance requirements remain open.

General free-text/model extraction, semantic/date adjudication, real multi-account/provider acceptance, accepted self-hosted inference, independent held-out judgments and final operation acceptance are not closed. Native PostgreSQL restore checks are synthetic regression, not a restore of the provider's real copy.

## Verified candidate

Executable `806eb966a98e63bbb11a437b0ef6d2dd0de92f39`: все8 workflow SUCCESS — [English structured version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41104447052), [Consent receipt protocol (synthetic)](https://github.com/kredavto/JobMatch-AI/actions/runs/41104447104), [Isolated document parser](https://github.com/kredavto/JobMatch-AI/actions/runs/41104446884), [Operational telemetry (synthetic Next)](https://github.com/kredavto/JobMatch-AI/actions/runs/41104447218), [Pinned CPU model diagnostic (synthetic only)](https://github.com/kredavto/JobMatch-AI/actions/runs/41104446877), [Structured profile acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41104447043), [English ordinary version acceptance](https://github.com/kredavto/JobMatch-AI/actions/runs/41104447186), [Application checks](https://github.com/kredavto/JobMatch-AI/actions/runs/41104447416). 995 unit/84files (+54),28 Node evaluator/CPU,84 Python,245 browser (+12)/2 live-account SKIP,76 worker; lint/types/build/actual Next/SQL concurrency/21-table synthetic restore/parser/OCR/ClamAV PASS. Vercel runtime preview SUCCESS. Локально на1298a8c… реально прошли60 unit/2files (54new+6existing) после fresh clone/npm ci; завершение локальных lint/types не подтверждено из-за потери среды, local build/browser не заявляются.

All12 new RU/EN browser cases passed: preview/cancel/copy no writes, explicit unconfirmed save then separate confirmation, protection of existing manual fields, locale/no replay, source-only change with preserved blocked draft, lost-response/manual read and outdated source. Mobile axe/no-overflow checks and an actual synthetic English screenshot were reviewed. The initial four browser failures were test synchronization/label-selector mistakes, corrected without changing the implementation or weakening the resulting state/write assertions.
