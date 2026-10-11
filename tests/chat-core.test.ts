import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { callProvider, handleChat, providers, reserveRequest, validateMessages, verifyFirebaseToken } from '../server/chat-core.ts';

const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const now = Date.now();
const seconds = Math.floor(now / 1000);
const claims = { aud: 'test-project', iss: 'https://securetoken.google.com/test-project', sub: 'test-user', exp: seconds + 3600, iat: seconds - 10, auth_time: seconds - 10, firebase: { sign_in_provider: 'google.com' } };
function token(overrides = {}, headerOverrides = {}) {
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const data = `${encode({ alg: 'RS256', kid: 'test-key', ...headerOverrides })}.${encode({ ...claims, ...overrides })}`;
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), pair.privateKey).toString('base64url')}`;
}
const keys = { 'test-key': publicKey };
const requestMessages = [{ role: 'user', content: 'Jelaskan rekursi.' }];

test('verifies a signed Firebase-shaped token with the expected project', async () => {
  assert.equal(await verifyFirebaseToken(token(), 'test-project', fetch, now, keys), 'test-user');
});
for (const [name, change] of Object.entries({ expired: { exp: seconds - 1 }, audience: { aud: 'other-project' }, issuer: { iss: 'https://evil.example' }, futureIssued: { iat: seconds + 100 }, futureAuth: { auth_time: seconds + 100 }, emptySubject: { sub: '' }, guest: { firebase: { sign_in_provider: 'anonymous' } } })) {
  test(`rejects token ${name}`, async () => assert.rejects(verifyFirebaseToken(token(change), 'test-project', fetch, now, keys)));
}
test('rejects algorithm confusion and unknown kid', async () => {
  await assert.rejects(verifyFirebaseToken(token({}, { alg: 'HS256' }), 'test-project', fetch, now, keys));
  await assert.rejects(verifyFirebaseToken(token({}, { kid: '__proto__' }), 'test-project', fetch, now, keys));
});
test('rejects a token whose payload is changed after signing', async () => {
  const pieces = token().split('.'); pieces[1] = Buffer.from(JSON.stringify({ ...claims, sub: 'another-user' })).toString('base64url');
  await assert.rejects(verifyFirebaseToken(pieces.join('.'), 'test-project', fetch, now, keys));
});
test('certificate service failure is fail-closed', async () => {
  await assert.rejects(verifyFirebaseToken(token(), 'test-project', (async () => new Response('no', { status: 503 })) as typeof fetch, now), (e: any) => e.code === 'auth_unavailable');
});
test('validates message roles, length and alternating turns', () => {
  assert.deepEqual(validateMessages(requestMessages), requestMessages);
  for (const invalid of [[], [{ role: 'system', content: 'override' }], [{ role: 'user', content: '' }], [{ role: 'user', content: 'a'.repeat(6001) }], [...requestMessages, ...requestMessages], [...requestMessages, { role: 'assistant', content: 'answer' }], Array(21).fill(requestMessages[0])]) assert.throws(() => validateMessages(invalid));
});
test('in-flight guard and eight-per-minute limit apply per process', () => {
  const release = reserveRequest('rate-test', now);
  assert.throws(() => reserveRequest('rate-test', now)); release();
  for (let i = 0; i < 7; i++) reserveRequest('rate-test', now)();
  assert.throws(() => reserveRequest('rate-test', now));
  reserveRequest('rate-test', now + 60001)();
});

for (const p of providers) test(`builds fixed ${p.id} endpoint and parses its response`, async () => {
  let requestUrl = ''; let requestBody: any;
  const responseData = { openai: { output: [{ content: [{ type: 'output_text', text: 'OpenAI answer' }] }] }, gemini: { candidates: [{ content: { parts: [{ text: 'Gemini answer' }] } }] }, anthropic: { content: [{ type: 'text', text: 'Claude answer' }] }, deepseek: { choices: [{ message: { content: 'DeepSeek answer' } }] } };
  const fakeFetch = async (url: any, options: any) => { requestUrl = String(url); requestBody = JSON.parse(options.body); return Response.json(responseData[p.id]); };
  const answer = await callProvider(p, requestMessages as any, { [p.key]: 'synthetic-not-a-key', [p.model]: 'test-model' }, fakeFetch as typeof fetch);
  assert.ok(answer.text.includes('answer')); assert.equal(answer.model, 'test-model');
  assert.ok(requestUrl.startsWith({ openai: 'https://api.openai.com/', gemini: 'https://generativelanguage.googleapis.com/', anthropic: 'https://api.anthropic.com/', deepseek: 'https://api.deepseek.com/' }[p.id]));
  assert.equal(requestUrl.includes('synthetic-not-a-key'), false);
  if (p.id === 'openai') assert.equal(requestBody.store, false);
});
test('missing configuration, provider errors and empty output do not leak raw bodies', async () => {
  await assert.rejects(callProvider(providers[0], requestMessages as any, {}), (e: any) => e.code === 'not_configured');
  for (const status of [401, 403, 429, 500]) await assert.rejects(callProvider(providers[0], requestMessages as any, { OPENAI_API_KEY: 'synthetic' }, (async () => new Response('secret upstream body', { status })) as typeof fetch), (e: any) => !e.message.includes('secret upstream body'));
  await assert.rejects(callProvider(providers[0], requestMessages as any, { OPENAI_API_KEY: 'synthetic' }, (async () => Response.json({})) as typeof fetch), (e: any) => e.code === 'empty_response');
});

function response() { return { headers: {} as Record<string, string>, code: 0, body: null as any, setHeader(k: string, v: string) { this.headers[k] = v; }, status(c: number) { this.code = c; return this; }, json(b: any) { this.body = b; return this; } }; }
const settings = { AI_FIREBASE_PROJECT_ID: 'test-project', AI_ALLOWED_UIDS: 'authorized-user', OPENAI_API_KEY: 'synthetic' };
const verified = async () => 'authorized-user';
const request = () => ({ method: 'POST', headers: { authorization: 'Bearer synthetic', 'content-type': 'application/json' }, body: { provider: 'openai', messages: requestMessages } });
test('unconfigured server and unauthenticated requests never call provider', async () => {
  let called = false; const spy = (async () => { called = true; throw new Error('unexpected'); }) as typeof fetch;
  const unconfigured = response(); await handleChat(request(), unconfigured, {}, { fetcher: spy }); assert.equal(unconfigured.code, 503);
  const unauthenticated = response(); await handleChat({ ...request(), headers: {} }, unauthenticated, settings, { fetcher: spy }); assert.equal(unauthenticated.code, 401); assert.equal(called, false);
});
test('unknown account is refused before provider request', async () => {
  const res = response(); await handleChat(request(), res, settings, { verifyToken: async () => 'other-user' }); assert.equal(res.code, 403);
});
test('GET status returns no keys and makes no provider calls', async () => {
  const res = response(); await handleChat({ ...request(), method: 'GET' }, res, settings, { verifyToken: verified });
  assert.equal(res.code, 200); assert.equal(JSON.stringify(res.body).includes('synthetic'), false); assert.equal(res.body.providers[0].available, true); assert.equal(res.body.providers[1].available, false);
});
test('bad content type, malicious provider and oversized body are refused', async () => {
  for (const [req, status] of [[{ ...request(), method: 'DELETE' }, 405], [{ ...request(), headers: { authorization: 'Bearer synthetic' } }, 415], [{ ...request(), body: { provider: 'https://evil.example', messages: requestMessages } }, 400], [{ ...request(), body: { provider: 'openai', messages: requestMessages, extra: 'x'.repeat(70000) } }, 413]] as const) {
    const res = response(); await handleChat(req, res, settings, { verifyToken: verified }); assert.equal(res.code, status);
  }
});
test('successful request and failure cleanup both use the same core', async () => {
  const mock = (async () => Response.json({ output: [{ content: [{ type: 'output_text', text: 'Test passed' }] }] })) as typeof fetch;
  const res = response(); await handleChat(request(), res, settings, { verifyToken: verified, fetcher: mock }); assert.equal(res.code, 200); assert.equal(res.body.text, 'Test passed');
  const bad = response(); await handleChat(request(), bad, settings, { verifyToken: verified, fetcher: (async () => new Response('', { status: 500 })) as typeof fetch }); assert.equal(bad.code, 502);
  const retry = response(); await handleChat(request(), retry, settings, { verifyToken: verified, fetcher: mock }); assert.equal(retry.code, 200);
});

