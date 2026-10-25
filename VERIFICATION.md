# Проверка — 25 октября 2026

- 39 unit-тестов: PASS (engine, evidence gate, SSRF, CSRF, HH disabled fallback, rate limiter).
- ESLint: PASS. TypeScript: PASS. Next production build: PASS.
- API smoke на реальной Supabase PostgreSQL: PASS — два аккаунта, import/demo, подтверждение, анализ, версия, экспорт, optimistic conflict, IDOR/RLS, CSRF.
- Playwright: мобильный landing без горизонтального overflow — PASS; полный workflow (вход → профиль → подтверждение фактов → анализ → сохранение версии → скачивание TXT) — PASS. Итого 2/2 E2E.
- Screenshot dashboard проверен вручную; исправлен overflow sidebar на невысоком экране.
- Supabase RLS: включен на всех бизнес-таблицах. Прямой запрос пользователя B к workspace A возвращает [].
- Supabase security advisor: нет предупреждений по таблицам/RLS; есть предупреждение Leaked Password Protection Disabled. Настройка: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Не проверены нагрузка, pentest, полноценный WCAG AA, восстановление резервной копии, генеративный AI, HH OAuth/write. Эти функции не объявляются production-ready. SMTP и legal/localization review остаются блокерами массового запуска.
