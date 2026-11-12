/**
 * Public inputs (including saved workspace text) have no trusted provenance.
 * Client URLs, source labels, consent, and provider approval environment variables
 * cannot establish a right to send HH service data to a third party.
 * Keep every public AI entrypoint closed until provenance and rights are enforced
 * server-side. There is deliberately no environment or request override.
 * https://dev.hh.ru/admin/developer_agreement (clause 4.6)
 */
export const LOCAL_ADAPTATION_DESCRIPTION='Доступна автоматическая адаптация на сервере JobMatch без отправки резюме и вакансии внешним ИИ-сервисам. Внешний ИИ отключён: условия API hh.ru запрещают передачу данных сервиса третьим лицам, а происхождение загруженного текста пока не подтверждается.';
export const PUBLIC_AI_CAPABILITY={state:'local_only',mode:'automatic',reason:'unverified_data_provenance',description:LOCAL_ADAPTATION_DESCRIPTION} as const;
