# Проверка зависимостей текущего main — 1 ноября 2026

База: свежий main `a3a9ef0c69e1e760010fc391234d66cd4a747e3b`.
Это узкий main-only backport подходящих исправлений из ещё не объединённых
[#52](https://github.com/kredavto/JobMatch-AI/pull/52) и
[#53](https://github.com/kredavto/JobMatch-AI/pull/53). Он не переносит их большой
миграционный стек или ещё не объединённые #72/#73. Разрешение на исторические
#1/#2 не разрешает этот merge/релиз; production не менялся.

## Изменения и границы совместимости

| Пакет/потребитель | В main | Кандидат | Проверка |
| --- | --- | --- | --- |
| pdfjs-dist | 5.7.284, range ^5.4.624 | 6.2.108 exact | Первая указанная исправленная версия; реальный text-only PDF с OpenAction canary, types/build и импортные регрессии |
| yauzl | 3.2.0 | 3.2.1 exact | Минимальный patch, malformed NTFS timestamp boundaries и корректная дата |
| follow-redirects, dev через Chromium | 1.16.1 | 1.16.2, lock-only в прежнем range | Обычный и настоящий cross-realm sensitiveHeaders, два собственных loopback сервера |
| minimatch у estree 8.72.0 | 10.2.6 | 11.0.3, version-qualified override | Реальный parser/project service/type checker, allowlist/отказы, preprocessing bound, действующие lint rules |
| PDF optional canvas | 0.1.100 | 1.1.0 в объявленном ^1.0.0 | Необходимая native major миграция PDF 6; прямой canvas 0.1.80 не менялся; проверен Linux/Node24 |

Next/React/ESLint/TypeScript и callable minimatch 3.1.5 не обновляются массово.
Новый dev-only nonrecursive-glob-match 1.0.3 нужен minimatch 11. Общего major
minimatch override, shim, fork, отключения lint-правил и advisory waiver нет.
Registry latest на проверке: PDF 6.4.299/yauzl 3.4.0; здесь выбраны минимальные
подтверждённые patched версии. Их доступность и результат текущего feed проверены
реальным npm, старые отчёты не выдаются за текущий аудит.

PDF использует core getDocument/getTextContent, без viewer/scripting manager;
`useWorkerFetch:false` запрещает worker fetch. Параметры viewer `enableScripting`
не выдаются за поддерживаемый DocumentInitParameters API. Синтетический OpenAction
не исполнился, текст извлечён. Это регрессия пути приложения, не воспроизведение
viewer exploit. getLastModDate также не заявляется существующим путём приложения;
его границы проверены непосредственно у библиотеки. Cross-realm тест использует
только SYNTHETIC_ONLY заголовок и два собственных loopback endpoint, без реальных
учётных данных и сторонних серверов.

## Фактический аудит

| Scope | Before | After |
| --- | --- | --- |
| Runtime package records | 2 | 0 |
| Full package records | 19 (17 moderate, 2 high) | 15 moderate |
| Уникальные advisories, full | 4 | 1: GHSA-g3hv-75wg-m249 |
| Строгий `--require-all` | exit 1 | **exit 1** |
| Runtime command | findings | **exit 0** |

[Before snapshot](snapshots/main-20261101-before.json), lock SHA256
`e7b7930f8a87b6e97396be11e5e45c161ab8f921e6ca01211ed8d01be24c81cc`.
[After snapshot](snapshots/main-20261101-after.json), lock SHA256
`0809c0548ca1de5e5f20c4a8f20ace913995c094a1ea1eab4586448fe91a1ef5`.
Формат содержит публичные package names/версии/GHSA IDs, счётчики, наблюдаемое
время и checksum. Полные upstream titles, диагностика, пути node_modules,
персональные данные и ключи не публикуются.

Оставшиеся 15 строк — affected lint packages по одному advisory, не 15 CVE.
Maintainer описывает minimatch 10.2.6/optimizationLevel >=2; feed также помечает
legacy 3.1.5 и его consumers. Этот feed не переопределяется. Реальный estree caller
использует named minimatch с dot:true, а legacy callers требуют callable API и
makeRe, отсутствующие у 11. Нужна отдельная поддерживаемая миграция lint graph;
ESLint 9 end-of-support и полная security acceptance остаются открытыми.

CLI выполняет два настоящих npm audit (full/runtime), сверяет schema/counts,
версии и runtime/dev-классификацию с lock, ограничивает timeout/output и проверяет,
что lock не изменился. Недоступный/некорректный ответ даёт exit 2, не пустой успех.
Runtime gate отклоняет любую runtime находку. Отдельная полная команда продолжает
давать exit 1; CI явно выполняет и печатает её отказ как inventory. Зелёный runtime
workflow не разрешает объявить все зависимости безопасными или проект готовым.

## Выполненные проверки

- Чистые npm ci/install без lifecycle scripts; на поддерживаемом canvas 1.1.0 повторены
  623 unit/route tests (50 файлов), 20 Node security tests, lint/types/build — PASS.
- Полный Playwright: 114 PASS / 2 live-account SKIP. Это текущий main-only набор,
  не 140 сценариев отдельного UI PR #73. Provider/mail/HH/real-user data не вызывались.
- 28 Python tests PASS. Native SQL/restore не менялся; его CI регрессия запрошена.
- Новый workflow проверяет runtime gate и явно показывает strict full gate exit.
  Remote результаты зафиксированы ниже после фактического исполнения.

Метаданные PDF 6.2.108 требуют canvas ^1.0.0 и Node >=22.13.0 || >=24.
Временный pin прежнего canvas 0.1.100 оказался вне объявленного range и удалён.
Итоговый canvas 1.1.0 проверен на Linux/Node24; это необходимая native major миграция,
проверка других ОС/production runtime не заявляется. Локальная типизация также
отклонила неподдерживаемый DocumentInitParameters параметр; он удалён без cast или
ослабления проверки типов, оставлены поддерживаемые опции. Итоговый набор выше
проверяет финальный lock, не промежуточную установку.

## Первичные источники, проверенные заново

- [PDF.js maintainer advisory](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j), patched 6.2.108; core/package types установленной версии.
- [yauzl advisory](https://github.com/advisories/GHSA-gmq8-994r-jv83), patched 3.2.1, и установленный npm source.
- [follow-redirects maintainer advisory](https://github.com/follow-redirects/follow-redirects/security/advisories/GHSA-mrwp-f3q8-3g9p), patched 1.16.2.
- [minimatch maintainer advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249), фактический registry feed и shipped estree caller 8.72.0.

Независимая security-приёмка, parser isolation/OCR/quarantine, принятая модель и
semantic/held-out evaluation, SMTP/recovery, provider restore Supabase/RPO/RTO,
операторское решение о ПД и разрешения hh.ru/финальный релиз остаются открытыми.

## Фактические remote результаты PR #74

Executable `3a3336b5d4539ebe079e5e31b7ba105a6073b877`, tree
`db6fa282ec443edd249610352589578a62816464` совпадает с локальным.
[Application](https://github.com/kredavto/JobMatch-AI/actions/runs/41290605397/job/124800874187):
623 unit/114 browser PASS,2 live SKIP,lint/types/build PASS.
[Audit](https://github.com/kredavto/JobMatch-AI/actions/runs/41290605335/job/124800874163):
20 security PASS, runtime0/full15, strictFullGateExit1, lock0809c05…;
FULL_DEPENDENCY_GATE_FAILED явно показывает оставшиеся findings.
[Legacy PG17](https://github.com/kredavto/JobMatch-AI/actions/runs/41290605379/job/124800874096):
28 Python,13 populated table fingerprints,4 SQL suites/corruption detection PASS.
Эта проверка synthetic, provider backup не восстанавливался. Следующий коммит
меняет только Markdown; его CPU docs-only scope не считается новым inference.
