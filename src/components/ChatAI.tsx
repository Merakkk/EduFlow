import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Plus, RefreshCw } from 'lucide-react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

type Provider = { id: string; label: string; available: boolean };
type Message = { role: 'user' | 'assistant'; content: string };
const initialProviders: Provider[] = [
  { id: 'openai', label: 'GPT · OpenAI', available: false },
  { id: 'gemini', label: 'Gemini', available: false },
  { id: 'anthropic', label: 'Claude', available: false },
  { id: 'deepseek', label: 'DeepSeek', available: false },
];

export default function ChatAI() {
  const [providers, setProviders] = useState(initialProviders);
  const [provider, setProvider] = useState('openai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const generation = useRef(0);
  const operation = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const scroll = useRef<HTMLDivElement | null>(null);

  async function checkConnection() {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) { setError('Masuk dengan akun terdaftar untuk menggunakan Chat AI. Mode tamu/offline tidak memakai API berbayar.'); return; }
    if (busy.current) return;
    busy.current = true;
    setChecking(true); setError('');
    const id = generation.current;
    const controller = new AbortController(); operation.current = controller;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/chat', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Pemeriksaan koneksi gagal.');
      if (generation.current !== id) return;
      setProviders(result.providers);
      const first = result.providers.find((p: Provider) => p.available);
      if (first) setProvider(first.id);
      else setError('Belum ada penyedia AI yang dikonfigurasi di server.');
    } catch (err) {
      if (generation.current === id && !controller.signal.aborted) setError(err instanceof Error ? err.message : 'Pemeriksaan koneksi gagal.');
    } finally { if (generation.current === id) { busy.current = false; setChecking(false); operation.current = null; } }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      generation.current++; operation.current?.abort(); busy.current = false;
      setMessages([]); setPending(''); setInput(''); setChecking(false); setProviders(initialProviders);
      setAccount(user && !user.isAnonymous ? user.uid : null);
      void checkConnection();
    });
    return () => { generation.current++; operation.current?.abort(); unsubscribe(); };
  }, []);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [messages, pending]);

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    const user = auth.currentUser;
    if (!text || busy.current || !user || user.isAnonymous || !providers.find(p => p.id === provider)?.available || messages.length >= 18) return;
    if (text.length > 6000 || messages.reduce((n, m) => n + m.content.length, 0) + text.length > 24000) { setError('Percakapan terlalu panjang. Mulai percakapan baru atau ringkas pesan.'); return; }
    const id = generation.current;
    const controller = new AbortController(); operation.current = controller;
    busy.current = true; setPending(text); setError('');
    const outgoing: Message[] = [...messages, { role: 'user', content: text }];
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ provider, messages: outgoing }), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Pesan belum berhasil diproses.');
      if (generation.current !== id) return;
      if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('Jawaban AI kosong.');
      setMessages([...outgoing, { role: 'assistant', content: result.text }]); setInput('');
    } catch (err) {
      if (generation.current === id && !controller.signal.aborted) setError(err instanceof Error ? err.message : 'Koneksi chat gagal. Pesan tidak dikirim ulang otomatis.');
    } finally { if (generation.current === id) { busy.current = false; setPending(''); operation.current = null; } }
  }
  const available = providers.find(p => p.id === provider)?.available;
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden" aria-label="Chat AI EduFlow">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
        <div><h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><MessageSquare size={20} className="text-indigo-500" />Chat AI</h2><p className="text-xs text-slate-500 mt-1">Ruang untuk belajar dan merapikan ide.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Penyedia AI" value={provider} disabled={!!pending || checking} onChange={e => { setProvider(e.target.value); setMessages([]); setError(''); }} className="text-xs rounded-lg border border-slate-200 p-2 dark:bg-slate-800">
            {providers.map(p => <option key={p.id} value={p.id} disabled={!p.available}>{p.label}{p.available ? '' : ' · Belum tersedia'}</option>)}
          </select>
          <button type="button" onClick={() => void checkConnection()} disabled={!!pending || checking} aria-label="Periksa koneksi AI" className="p-2 rounded-lg border border-slate-200 disabled:opacity-40"><RefreshCw size={16} /></button>
          <button type="button" disabled={!!pending || checking} onClick={() => { setMessages([]); setInput(''); setError(''); }} className="flex items-center gap-1 p-2 text-xs rounded-lg border border-slate-200 disabled:opacity-40"><Plus size={16} />Baru</button>
        </div>
      </div>
      <div ref={scroll} className="h-[45vh] min-h-64 overflow-y-auto p-4 sm:p-6 space-y-4" role="log" aria-label="Percakapan" aria-live="polite">
        {!messages.length && !pending && <div className="py-10 text-center text-slate-500"><MessageSquare size={34} className="mx-auto mb-4 text-indigo-400" /><p className="font-semibold">Mulai dari pertanyaan kecil.</p><p className="text-xs mt-2">Misalnya: jelaskan rekursi dengan contoh sederhana.</p></div>}
        {[...messages, ...(pending ? [{ role: 'user' as const, content: pending }] : [])].map((m, i) => <article key={i} className={`max-w-[92%] sm:max-w-[85%] rounded-xl p-3 ${m.role === 'user' ? 'ml-auto bg-indigo-50 dark:bg-indigo-950/40' : 'bg-slate-50 dark:bg-slate-800'}`}><p className="text-[10px] font-semibold text-slate-500 mb-1">{m.role === 'user' ? 'Anda' : providers.find(p => p.id === provider)?.label}</p><p className="text-sm whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200">{m.content}</p></article>)}
        {!!pending && <p className="text-xs text-slate-500" role="status">Menunggu jawaban AI…</p>}
      </div>
      <form onSubmit={send} className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-2">
        {error && <p role="alert" className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3">{error}</p>}
        {messages.length >= 18 && <p className="text-xs text-slate-500">Batas percakapan tercapai. Pilih Baru untuk melanjutkan.</p>}
        <div className="flex gap-2 items-end"><textarea aria-label="Pesan untuk AI" value={input} onChange={e => setInput(e.target.value)} maxLength={6000} rows={3} placeholder="Tulis pertanyaan Anda…" disabled={!!pending || checking || !account} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} className="min-w-0 flex-1 resize-y rounded-xl border border-slate-200 p-3 text-sm dark:bg-slate-800 disabled:opacity-50" /><button aria-label="Kirim pesan AI" disabled={!input.trim() || !!pending || checking || !account || !available || messages.length >= 18} className="p-3 rounded-xl bg-indigo-600 text-white disabled:opacity-40"><Send size={18} /></button></div>
        <p className="text-[10px] leading-relaxed text-slate-500">Enter untuk kirim · Shift+Enter untuk baris baru. Pesan dikirim ke penyedia yang dipilih dan dapat memakai saldo API pengelola. Chat hanya tersimpan dalam sesi ini; tidak membaca jadwal atau tugas Anda. Jawaban AI bisa keliru. Jangan kirim password, API key, atau informasi pribadi.</p>
      </form>
    </section>
  );
}

