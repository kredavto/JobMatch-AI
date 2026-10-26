# Восстановление пароля

Реализовано: `/recover` и POST `/api/recovery`, PKCE S256, отдельные HttpOnly-cookie на 10 минут, проверка same-origin, ограниченное тело запроса и локальная квота. Code обменивается только по явному нажатию. После смены пароля выполняется global logout; его ошибка показывается отдельно, не маскируется под ошибку смены пароля. Обычные application cookies не дают доступ к recovery endpoint.

## Настройка
1. В Vercel Production установить `APP_URL=https://jobmatch-ai-digagency.vercel.app` (задано 26 октября 2026). Без APP_URL запрос письма возвращает 503.
2. В Supabase Authentication → URL Configuration добавить точный Redirect URL `https://jobmatch-ai-digagency.vercel.app/recover`. Не добавлять wildcard домены. Site URL должен указывать на приложение.
3. Использовать стандартный Reset Password email с `{{ .ConfirmationURL }}`. Кастомный шаблон должен сохранять PKCE redirect flow. Убедиться, что SMTP включен; пользователь сообщил о сохранении SMTP, доставка пока не проверена.
4. Запросить восстановление для собственного тестового аккаунта и открыть последнюю ссылку в том же браузере и на том же домене. Cookie verifier не переносится между браузерами/доменами. Повторный запрос заменяет verifier.
5. Проверить смену пароля, отказ входа со старым паролем, вход с новым и завершение старых сессий. Проверить истекшую и повторно использованную ссылку.

Не выводить passwords, auth codes, JWT, cookies или полные ссылки из писем в логи/скриншоты. Приложение не логирует их; настройки хранения URL на ingress/провайдере требуют отдельной проверки. Query code убирается из адресной строки после загрузки. Страница динамическая, service worker её не кеширует. Пароли очищаются из формы после запроса. После неопределенного сетевого результата сначала попробовать вход с новым паролем, не повторять запись автоматически.

## Проверка и ограничения
Unit route tests используют mock Supabase. Browser tests используют mock recovery endpoint, поэтому не доказывают SMTP delivery, provider PKCE exchange или global revocation. Живая приемка этого нового сценария ещё не выполнена. Квоты процесса не заменяют централизованный anti-abuse/WAF. Дополнительная конфигурация CAPTCHA/MFA может требовать расширения UI.

Источники: https://supabase.com/docs/guides/auth/passwords ; https://supabase.com/docs/guides/auth/sessions/pkce-flow ; https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts . Проверены 26 октября 2026. Changelog: переход от устаревших TLS ciphers с 10 ноября не требует смены Node 24; self-hosted API_EXTERNAL_URL не применяется к hosted проекту. Email template changes требуют проверки фактического шаблона перед приемкой.
