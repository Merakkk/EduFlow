// Local visual harness only: no login, provider key or API response is mocked.
import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatAI from '../src/components/ChatAI';
import '../src/index.css';

createRoot(document.getElementById('root')!).render(<div className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="max-w-5xl mx-auto space-y-4"><h1 className="text-xl font-bold text-slate-900">EduFlow · Chat AI</h1><p className="text-xs text-slate-500">Pemeriksaan lokal · belum login · API belum diaktifkan</p><ChatAI /></div></div>);

