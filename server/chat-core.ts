import { verify as verifySignature } from 'node:crypto';

type Environment = Record<string, string | undefined>;
type Message = { role: 'user' | 'assistant'; content: string };
type Provider = { id: string; label: string; key: string; model: string; fallback?: string };
export const providers: Provider[] = [
  { id: 'openai', label: 'GPT · OpenAI', key: 'OPENAI_API_KEY', model: 'OPENAI_MODEL', fallback: 'gpt-5-mini' },
  { id: 'gemini', label: 'Gemini', key: 'GEMINI_API_KEY', model: 'GEMINI_CHAT_MODEL' },
  { id: 'anthropic', label: 'Claude', key: 'ANTHROPIC_API_KEY', model: 'ANTHROPIC_MODEL' },
  { id: 'deepseek', label: 'DeepSeek', key: 'DEEPSEEK_API_KEY', model: 'DEEPSEEK_MODEL' },
];
export class ChatError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
const unavailable = () => new ChatError(503, 'not_configured', 'Chat AI belum diaktifkan oleh pengelola.');
const unauthorized = () => new ChatError(401, 'unauthorized', 'Masuk kembali dengan akun Firebase untuk memakai Chat AI.');
const system = 'Anda asisten belajar EduFlow. Jawab dalam bahasa pengguna, jelaskan dengan ringkas dan jujur. Jangan mengaku telah melakukan tindakan di aplikasi. Anda tidak mempunyai akses ke data jadwal, tugas, file, atau akun pengguna. Jangan meminta password, API key, atau token.';
let certificates: { values: Record<string, string>; expires: number } | null = null;
const requests = new Map<string, { count: number; until: number; busy: boolean }>();

export function validateMessages(value: unknown): Message[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) throw new ChatError(400, 'invalid_messages', 'Kirim 1–20 pesan per percakapan. Mulai percakapan baru jika sudah penuh.');
  let total = 0;
  const result = value.map((item, index) => {
    if (!item || typeof item !== 'object' || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || !item.content.trim() || item.content.length > 6000 || item.role !== (index % 2 === 0 ? 'user' : 'assistant')) throw new ChatError(400, 'invalid_messages', 'Format pesan tidak valid; pesan harus bergantian antara pengguna dan AI.');
    total += item.content.length;
    return { role: item.role, content: item.content } as Message;
  });
  if (total > 24000 || result.at(-1)?.role !== 'user') throw new ChatError(400, 'invalid_messages', 'Percakapan terlalu panjang atau tidak diakhiri pesan pengguna. Mulai percakapan baru.');
  return result;
}

export async function verifyFirebaseToken(token: string, project: string, fetcher: typeof fetch = fetch, now = Date.now(), keys?: Record<string, string>) {
  if (token.length > 8192) throw unauthorized();
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw unauthorized();
  let header: any, payload: any;
  try { header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()); } catch { throw unauthorized(); }
  const seconds = Math.floor(now / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || payload.aud !== project || payload.iss !== `https://securetoken.google.com/${project}` || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128 || !Number.isInteger(payload.exp) || payload.exp <= seconds || !Number.isInteger(payload.iat) || payload.iat > seconds || !Number.isInteger(payload.auth_time) || payload.auth_time > seconds) throw unauthorized();
  if (!keys) {
    if (!certificates || certificates.expires <= now) {
      let response: Response;
      try { response = await fetcher('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', { signal: AbortSignal.timeout(10000) }); } catch { throw new ChatError(503, 'auth_unavailable', 'Pemeriksaan login sementara tidak tersedia.'); }
      if (!response.ok) throw new ChatError(503, 'auth_unavailable', 'Pemeriksaan login sementara tidak tersedia.');
      const values = await response.json() as Record<string, string>;
      const lifetime = Math.min(3600, Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 60));
      certificates = { values, expires: now + lifetime * 1000 };
    }
    keys = certificates.values;
  }
  const key = Object.hasOwn(keys, header.kid) ? keys[header.kid] : undefined;
  if (!key || typeof key !== 'string') throw unauthorized();
  try { if (!verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'))) throw unauthorized(); } catch { throw unauthorized(); }
  if (!payload.firebase || payload.firebase.sign_in_provider === 'anonymous') throw new ChatError(403, 'guest_not_allowed', 'Mode tamu tidak dapat memakai API AI berbayar. Masuk dengan akun yang diizinkan.');
  return payload.sub as string;
}

export function reserveRequest(uid: string, now = Date.now()) {
  for (const [key, value] of requests) if (value.until <= now && !value.busy) requests.delete(key);
  const state = requests.get(uid) || { count: 0, until: now + 60000, busy: false };
  if (state.busy || state.count >= 8 || requests.size >= 256 && !requests.has(uid)) throw new ChatError(429, 'rate_limit', 'Tunggu sebentar sebelum mengirim pesan berikutnya.');
  state.count++; state.busy = true; requests.set(uid, state);
  return () => { state.busy = false; };
}

export async function callProvider(provider: Provider, messages: Message[], env: Environment, fetcher: typeof fetch = fetch) {
  const model = env[provider.model]?.trim() || provider.fallback;
  const key = env[provider.key]?.trim();
  if (!key || !model || !/^[A-Za-z0-9._-]{1,100}$/.test(model)) throw unavailable();
  let url: string, body: unknown;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.id === 'openai') {
    url = 'https://api.openai.com/v1/responses'; headers.Authorization = `Bearer ${key}`;
    body = { model, instructions: system, input: messages, store: false, max_output_tokens: 1600 };
  } else if (provider.id === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`; headers['x-goog-api-key'] = key;
    body = { systemInstruction: { parts: [{ text: system }] }, contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 1600 } };
  } else if (provider.id === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages'; headers['x-api-key'] = key; headers['anthropic-version'] = '2023-06-01';
    body = { model, system, messages, max_tokens: 1600 };
  } else {
    url = 'https://api.deepseek.com/chat/completions'; headers.Authorization = `Bearer ${key}`;
    body = { model, messages: [{ role: 'system', content: system }, ...messages], max_tokens: 1600, stream: false };
  }
  let response: Response;
  try { response = await fetcher(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) }); } catch { throw new ChatError(504, 'provider_timeout', 'Layanan AI tidak merespons tepat waktu. Tidak ada pengiriman ulang otomatis.'); }
  if (!response.ok) {
    // Never return provider response bodies, credentials or request contents.
    if (response.status === 429 || response.status === 402) throw new ChatError(429, 'provider_quota', 'Kuota/saldo atau batas pemakaian penyedia AI belum mencukupi. Periksa akun API penyedia.');
    if (response.status === 401 || response.status === 403) throw new ChatError(502, 'provider_auth', 'Kredensial atau izin model AI perlu diperiksa oleh pengelola.');
    throw new ChatError(502, 'provider_error', 'Penyedia AI menolak permintaan. Periksa nama model dan status layanan.');
  }
  let data: any;
  try { data = await response.json(); } catch { throw new ChatError(502, 'invalid_response', 'Respons AI tidak dapat dibaca.'); }
  let text: string = '';
  if (provider.id === 'openai') text = (data.output || []).flatMap((item: any) => item.content || []).filter((item: any) => item.type === 'output_text' || item.type === 'refusal').map((item: any) => item.text || item.refusal || '').join('\n');
  if (provider.id === 'gemini') text = (data.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('\n');
  if (provider.id === 'anthropic') text = (data.content || []).filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('\n');
  if (provider.id === 'deepseek') text = data.choices?.[0]?.message?.content || '';
  if (typeof text !== 'string' || !text.trim()) throw new ChatError(502, 'empty_response', 'Tidak ada jawaban teks yang diterima. Penyedia mungkin membatasi respons atau mencapai batas token.');
  return { text: text.slice(0, 24000), provider: provider.id, model };
}

export async function handleChat(req: any, res: any, env: Environment = process.env, deps: { fetcher?: typeof fetch; verifyToken?: typeof verifyFirebaseToken } = {}) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  let release: (() => void) | undefined;
  try {
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); throw new ChatError(405, 'method', 'Metode tidak didukung.'); }
    const project = env.AI_FIREBASE_PROJECT_ID?.trim();
    const allowed = (env.AI_ALLOWED_UIDS || '').split(',').map(v => v.trim()).filter(Boolean);
    if (!project || !allowed.length) throw unavailable();
    const bearer = typeof req.headers?.authorization === 'string' ? req.headers.authorization.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1] : undefined;
    if (!bearer) throw unauthorized();
    const uid = await (deps.verifyToken || verifyFirebaseToken)(bearer, project, deps.fetcher || fetch);
    if (!allowed.includes(uid)) throw new ChatError(403, 'not_allowed', 'Akun ini belum diizinkan memakai Chat AI. Hubungi pengelola.');
    if (req.method === 'GET') return res.status(200).json({ providers: providers.map(p => ({ id: p.id, label: p.label, available: !!env[p.key]?.trim() && !!(env[p.model]?.trim() || p.fallback) })) });
    if (!String(req.headers?.['content-type'] || '').toLowerCase().includes('application/json')) throw new ChatError(415, 'content_type', 'Gunakan permintaan JSON.');
    const serialized = JSON.stringify(req.body);
    if (!serialized || Buffer.byteLength(serialized) > 65536) throw new ChatError(413, 'too_large', 'Ukuran pesan terlalu besar.');
    const provider = providers.find(p => p.id === req.body?.provider);
    if (!provider) throw new ChatError(400, 'provider', 'Penyedia AI tidak dikenal.');
    const messages = validateMessages(req.body?.messages);
    release = reserveRequest(uid);
    const result = await callProvider(provider, messages, env, deps.fetcher || fetch);
    return res.status(200).json(result);
  } catch (error) {
    const known = error instanceof ChatError ? error : new ChatError(500, 'internal', 'Permintaan chat gagal. Silakan periksa konfigurasi server.');
    return res.status(known.status).json({ error: known.message, code: known.code });
  } finally { release?.(); }
}

