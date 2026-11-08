import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ENDPOINT, MODEL, evaluate, requestBody, runProbe} from './groq-synthetic-smoke.mjs';

const envelope = (indices = [0, 1, 2, 3], finish_reason = 'stop') => ({choices: [{finish_reason, message: {content: JSON.stringify({indices})}}]});
const noFetch = () => {throw new Error('Unexpected network request');};

test('default dry run, free-tier gate and missing-key gate make no request', async () => {
  assert.equal((await runProbe({fetchImpl: noFetch})).state, 'prepared_not_run');
  assert.equal((await runProbe({live: true, token: 'synthetic', fetchImpl: noFetch})).reason, 'verify_free_tier_in_console_first');
  assert.equal((await runProbe({live: true, freeTierConfirmed: true, fetchImpl: noFetch})).reason, 'missing_existing_groq_api_key');
});

test('payload is small, pinned, structured and has no tools', () => {
  const body = requestBody();
  assert.equal(body.model, MODEL);
  assert.equal(body.max_completion_tokens, 1024);
  assert.equal(body.stream, false);
  assert.equal(body.response_format.json_schema.strict, true);
  assert.ok(Buffer.byteLength(JSON.stringify(body)) < 8000);
  assert.equal('tools' in body, false);
});

test('renders only literal relevant evidence and checks unsafe selections', () => {
  const good = evaluate(envelope());
  assert.equal(good.passed, true);
  assert.match(good.adaptedExcerpt, /FastAPI/);
  assert.doesNotMatch(good.coverLetter, /AWS|Kubernetes|Docker/);
  for (const indices of [[0, 1, 2, 4], [0, 1, 2, 5], [0, 1, 2, 6], [0, 1, 2, 7], [0, 0, 1, 2], []]) {
    const bad = evaluate(envelope(indices));
    assert.equal(bad.passed, false);
    assert.equal('adaptedExcerpt' in bad, false);
  }
  assert.throws(() => evaluate(envelope([999])));
  assert.throws(() => evaluate(envelope([0, 1, 2], 'length')));
  assert.throws(() => evaluate({choices: [{finish_reason: 'stop', message: {content: '{"indices":[0],"newFact":"fiction"}'}}]}));
});

test('makes one bounded request only to Groq and does not return token', async () => {
  const calls = [];
  const result = await runProbe({live: true, freeTierConfirmed: true, token: 'synthetic-not-a-secret', fetchImpl: async (...args) => {
    calls.push(args); return Response.json(envelope());
  }});
  assert.equal(result.state, 'passed');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], ENDPOINT);
  assert.equal(calls[0][1].redirect, 'error');
  assert.equal(calls[0][1].cache, 'no-store');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer synthetic-not-a-secret');
  assert.doesNotMatch(JSON.stringify(result), /synthetic-not-a-secret/);
});

test('HTTP, malformed, oversized and uncertain failures never retry', async () => {
  for (const fetchResult of [() => Response.json({secret: 'hidden'}, {status: 429}), () => Response.json(envelope([999])), () => new Response('x'.repeat(32769)), () => {throw new Error('hidden');}]) {
    let calls = 0;
    const result = await runProbe({live: true, freeTierConfirmed: true, token: 'synthetic', fetchImpl: async () => {calls++; return fetchResult();}});
    assert.equal(result.state, 'failed');
    assert.equal(calls, 1);
    assert.doesNotMatch(JSON.stringify(result), /hidden/);
  }
});
