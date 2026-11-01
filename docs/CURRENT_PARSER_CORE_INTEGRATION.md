# Parser и текущий compact core

Кандидат объединяет parser/OCR/scan из #78 и compact/source-profile/letters/commands из #87. Ни один PR или main этим не объединяется. Lockfile не изменён.

`IMPORT_PARSER_MODE=inline` сохраняет совместимость; `worker` требует HTTPS `/extract` и независимый gateway token. Нет автоматического fallback. OCR и scan opt-in; размещение/ресурсы и TLS edge согласует оператор. Исходное имя файла, cookie и JWT пользователя не отправляются parser. Извлечение возвращает редактируемый текст без сохранения и подтверждения фактов; сохранение мастер-профиля отдельно создаёт неподтверждённые факты.

CI parser-worker проверяет реальные контейнерные ограничения, OCR eng/rus и подписанную свежесть ClamAV. Новый parser-core-protocol создаёт только собственные UUID БД и Compose project: production import API -> настоящий TLS с доверенным тестовым CA -> настоящий bounded gateway/parser -> отдельная production import command -> native compact PG17. PostgreSQL Auth/HTTP bridge синтетический. TXT/DOCX/PDF, неверные байты, смена владельца, отказ gateway и отсутствие inline fallback проверяются отдельно. Fingerprints всех 16 не-quota таблиц не меняются при извлечении/отказе. Затем проверяются текущие ручной профиль, правила, письма и 17 заполненных таблиц native dump/restore. Это не копия провайдера, реальный Auth или hosted приёмка.

В UI синхронный epoch/abort перед программным обновлением workspace или владельца дополняет cleanup эффекта; поздний результат не заменяет изменённый черновик. React review: хуки без условных вызовов, AbortController не хранится в state, file input связан с label, ошибки/статус доступны, source-profile и saved-letter UI сохранены.

Результаты CI будут внесены после фактического выполнения. Модель, SMTP, провайдерская копия и эксплуатационная приёмка остаются открыты.
