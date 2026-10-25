# Архитектура

## Текущая реализация
Next.js 16 App Router + TypeScript + React, CSS без UI-фреймворка, Zod. Vercel Node 24, регион функций Frankfurt. PostgreSQL в отдельном Supabase-проекте. Auth и RLS — Supabase. Сервис обращается к REST API с токеном конкретного пользователя и publishable key; service_role ключ не используется.

Browser → Next /api/service → Supabase Auth / PostgREST → PostgreSQL (RLS).
Browser → /api/import → извлечение текста в памяти → проверка пользователем → сохранение.

lib/engine.ts: чистые правила, evidence gate, оценка, предложения и версии.
lib/db.ts: адаптер PostgreSQL REST, типы Workspace/Version/Application.
lib/http.ts: origin, session verification, ограничения частоты, ошибки.
lib/hh.ts: строго отключенный HHProvider, подготовка ручного переноса.

Модель LLM не подключена. Весь анализ выполняется правилами в приложении; никакой внешний inference. Интерфейс AIProvider обозначает направление расширения, но не реализует self-hosted модель.

## Согласованность
save_workspace — транзакционный RPC: блокировка по auth.uid, проверка revision, изменение JSONB и audit в одной транзакции. Повторный запрос со старой revision = 409. Restore создает новую версию. Токены хранятся только HttpOnly cookie. Мастер-профиль не меняется при создании версии.

## Отличия от целевого стека
Prisma, Tailwind/shadcn и Redis не внедрены. SQLite был заменен до публикации: Vercel не использует локальные файлы для хранения резюме. Нормализованная целевая модель описана в DATA_MODEL.md; текущие данные сгруппированы в JSONB владельца.

## Развертывание
npm ci; npm run lint; npm run typecheck; npm test; npm run build.
Переменные SUPABASE_URL и SUPABASE_PUBLISHABLE_KEY — на сервере. Схема в supabase/schema.sql, примененная миграция отражена в supabase/migrations.
Настройка Supabase Site URL и собственного SMTP требуется для полноценной публичной регистрации. При стандартном email-подтверждении пользователь возвращается в приложение и входит после подтверждения адреса.
