/** Live suites mutate profiles and delete a fixture account. Never accept real mailboxes. */
export function assertDisposableAccounts(emails:string[]){
 if(!emails.length||new Set(emails).size!==emails.length||emails.some(email=>!/^jobmatch-qa-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}@example\.test$/.test(email)))throw new Error('Live tests require distinct disposable jobmatch-qa UUID accounts at example.test');
}
