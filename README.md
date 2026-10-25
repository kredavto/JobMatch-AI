# JobMatch AI

Рабочая ранняя версия сервиса адаптации резюме с доказательствами. **Не production-ready коммерческий релиз.** Реализована консервативная оптимизация порядка подтвержденных фактов, а не генеративная перепись.

## Запуск
Node.js 24; PostgreSQL в Supabase.

```sh
npm ci
cp .env.example .env.local
# Настройте SUPABASE_URL и SUPABASE_PUBLISHABLE_KEY
npm run dev
```

В новой базе примените `supabase/schema.sql`. Для существующей установки — только непримененные миграции из `supabase/migrations`, после проверки текущей схемы. Включите email/password Auth; настройте Site URL и собственный SMTP. Подтверждение почты сохраняется включенным. После письма вернитесь в приложение и войдите. Не используйте пароль hh.ru.

## Проверки
```sh
npm run lint
npm run typecheck
npm test
npm run build
# Для browser E2E: установите Chromium и отдельную тестовую учетную запись
npx playwright install chromium
npm run test:e2e
```

## Первый сценарий
Создайте аккаунт → демо-профиль → подтвердите факты → выберите демо-вакансию → сохраните текст → анализ → выберите правки → подтвердите отдельную версию → скачайте TXT/JSON.

Внешний AI и HH API отключены. Публикация в hh.ru только вручную. Match Score — внутренняя эвристика; перестановка фактов не увеличивает оценку.

## Документы
[Спецификация](PRODUCT_SPEC.md) · [Архитектура](ARCHITECTURE.md) · [Возможности HH](HH_API_CAPABILITIES.md) · [Модель](DATA_MODEL.md) · [Безопасность](SECURITY.md) · [Roadmap](ROADMAP.md).

Текущая инфраструктура находится вне РФ: соответствие требованиям локализации персональных данных не подтверждено. До реального массового использования нужны юридическая/эксплуатационная приемка, SMTP и distributed anti-abuse. Подробнее SECURITY.md.

## Обновление 0.2 — надежность
Добавлены централизованные квоты, защита импорта, снимки доказательств в версиях и привязка откликов к версиям. Применяйте миграции по порядку, перед новым деплоем; `schema.sql` — сводная схема только для пустой базы. Прямые API-доступы владельца через Supabase RLS не заменяются лимитами приложения. Нормализация таблиц, SMTP и изолированный parser worker остаются в roadmap.

### История фактов (0.3)
В «Мой профиль» нажмите «Обновить историю фактов». Каждый снимок содержит исходный текст фактов, evidence_id, источник и состояние подтверждения. Повторный импорт дает новые идентификаторы и требует нового подтверждения. В «Настройки» скачайте JSON профиля и отдельный NDJSON истории; полный экспорт истории заканчивается записью `{"complete":true}`. История доступна только владельцу и удаляется с аккаунтом.


### Хранилище 0.4
Приложение читает факты, версии и отклики из отдельных PostgreSQL-таблиц через read_workspace RPC. Старый формат записи сохраняется для совместимости; синхронизация и история атомарны. Миграции применяйте по порядку. SQL-интеграционные проверки: supabase/tests/fact_history.sql и supabase/tests/normalized_entities.sql (синтетические данные, ROLLBACK). Полная документация перехода и отката — ARCHITECTURE.md.


### Запись 0.5
Все изменения через приложение и разрешенные save_workspace операции. Прямое изменение workspace, audit и consent через Data API запрещено. Дополнительная проверка в PostgreSQL блокирует переписывание версий и подмену доказательств. SQL-тест write_gates.sql дополняет две существующие интеграционные проверки. Полный отказ от совместимого JSON-контракта еще в roadmap.


### PWA 0.6
Откройте приложение онлайн, затем используйте «Установить»/«На экран Домой» в меню поддерживаемого браузера. Без сети показывается справочный экран; резюме и история не кешируются. Черновик в уже открытой вкладке остается в памяти, но пропадет после ее закрытия/перезагрузки. Проверка: production build + Playwright tests/e2e/offline.spec.ts. Для локального HTTP service worker разрешен на localhost; dev-режим worker не регистрирует.

## Карьерный помощник (0.17)
В редакторе после анализа доступен план развития и подготовки к интервью. Локальный модуль `career-coach` повторно сопоставляет сохраненные факты и вакансию, показывает evidence, приоритеты и учебные задания, экспортирует выбранную группу в TXT. План не сохраняется автоматически и не изменяет профиль/балл. Сложные требования остаются неподтвержденными; отсутствие свидетельств не означает отсутствие компетенции. Генеративный AI не подключен.

## Сопроводительное письмо (0.18)
После анализа в редакторе доступен локальный шаблон четырех стилей. `composeLetter` принимает только 1–5 уникальных правок из текущего `propose`, повторно проверяет `gate` и переносит факты дословно. Вакансия не вставляется в письмо как инструкция. Вводные фразы о намерениях требуют проверки пользователем. После ручных изменений подтверждение экспорта сбрасывается, новые формулировки не объявляются подтвержденными. TXT содержит ровно отредактированный текст; отправки, серверного хранения и обновления профиля нет. Ориентир 100–170 слов не достигается искусственным добавлением опыта; краткий стиль может быть короче, длинные факты не обрезаются.

## Проверки с реальной авторизацией
`TEST_EMAIL` / `TEST_PASSWORD` включают workflow-тест. Дополнительный `TEST_EMAIL_B` включает изоляцию, отзыв сессий и удаление второго аккаунта (используется тот же тестовый пароль). Разрешены только разные вымышленные адреса `jobmatch-qa-<UUID v4>@example.test`, подтвержденные заранее администратором. Эти тесты изменяют профили; второй аккаунт удаляется при успешном прогоне. Нельзя передавать реальные учетные записи. После любого прогона администратор должен удалить оставшиеся fixture-аккаунты по точным UUID, проверить каскадное удаление и убрать временный файл учетных данных. Секреты не хранить в git, логах, скриншотах или trace. В отсутствие fixture-переменных live-тесты явно пропускаются; mocks продолжают работать. Лимит 15 минут относится к тестовому сценарию, а не к HTTP-таймаутам приложения.

### 0.25 — DOCX export
Saved versions offer **Скачать DOCX**. The authenticated, quota-limited `/api/resume-export?id=…&expectedOwnerId=…` reads only the active owner's workspace; unknown/foreign version IDs return 404 and stale owner hints return 409. Files are never cached. Export contains the saved version text only (not current profile, vacancy, evidence or score), A4, Arial 11pt, 20mm margins. CRLF/CR normalize to paragraph breaks; tabs and spaces are preserved. XML-invalid characters and text over 200,000 UTF-16 units are rejected without silent edits; TXT remains available. No hyperlinks, macros, remote resources or author metadata are generated. JSZip 3.10.2 is now an explicit dependency (previously transitive via Mammoth).

Structure follows [Microsoft's WordprocessingML documentation](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document). Automated validation reads exported text back with Mammoth and checks package contents, owner boundaries and browser download. Visual rendering in Microsoft Word / LibreOffice and original resume layout reproduction are not certified. Download errors currently open a JSON error response; return to the app and sign in/reload as appropriate.
