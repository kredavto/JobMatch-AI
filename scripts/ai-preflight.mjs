/** Read-only diagnostic. Never calls a model, creates credentials or changes billing. */
const prefix = 'JOBMATCH_AI_PREFLIGHT ';
const emit = data => console.log(prefix + JSON.stringify(data));
const minimumCredit = 0.01; // Conservative reserve for the separately authorized tiny synthetic test.
async function main() {
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (!token) return emit({state: 'blocked', reason: 'missing_build_oidc', modelRequests: 0});
  const response = await fetch('https://ai-gateway.vercel.sh/v1/credits', {
    method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: {Authorization: `Bearer ${token}`},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const candidate = body?.error?.type || body?.error?.code || body?.code;
    const code = typeof candidate === 'string' && /^[a-z][a-z0-9_]{1,79}$/.test(candidate) ? candidate : 'unknown';
    return emit({state: 'blocked', reason: 'credits_access_failed', httpStatus: response.status, code, modelRequests: 0});
  }
  const credits = await response.json();
  const balance = Number(credits.balance);
  // Never publish the team's balance, tokens, headers, or raw provider response in build logs.
  emit({state: Number.isFinite(balance) && balance >= minimumCredit ? 'balance_available' : 'blocked',
    reason: Number.isFinite(balance) ? (balance >= minimumCredit ? 'existing_credits_cover_test_reserve' : 'insufficient_existing_credits') : 'unknown_credits_format',
    reserveUsd: minimumCredit, modelRequests: 0});
}
main().catch(() => emit({state: 'blocked', reason: 'read_check_failed', modelRequests: 0}));
