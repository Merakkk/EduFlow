import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously 
} from 'firebase/auth';
import { 
  GraduationCap, 
  LogIn, 
  ShieldAlert, 
  Compass, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Sun,
  Moon
} from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess?: () => void;
  onLocalGuestLogin?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function Login({ onLoginSuccess, onLocalGuestLogin, darkMode = false, onToggleDarkMode }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Configure additional custom parameter to force account picker
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error("Google authentication error:", err);
      // Give readable translated errors
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Proses log masuk dibatalkan oleh pengguna.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Koneksi jaringan gagal. Periksa koneksi internet Anda.');
      } else if (err.code === 'auth/admin-restricted-operation') {
        setError(
          'ADMIN_RESTRICTED: Pendaftaran Pengguna Baru dinonaktifkan di Console Firebase Anda.\n\n' +
          'Silakan ikuti instruksi pemecahan masalah di bawah ini untuk mengaktifkannya.'
        );
      } else {
        setError(err.message || 'Gagal login melalui Google. Harap coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.warn("Anonymous authentication failed, falling back to local offline mode", err);
      if (onLocalGuestLogin) {
        onLocalGuestLogin();
      } else {
        if (err.code === 'auth/operation-not-allowed') {
          setError(
            'PROVIDER_DISABLED: Provider "Tamu / Anonymous" belum diaktifkan di Console Firebase Anda.\n\n' +
            'Silakan ikuti 3 langkah mudah ini:\n' +
            '1. Buka Console Firebase untuk proyek Anda.\n' +
            '2. Klik "Add new provider" / "Tambahkan penyedia baru" lalu pilih "Anonymous" (Tamu).\n' +
            '3. Aktifkan tombol Enable (Aktifkan) lalu tekan Save (Simpan).'
          );
        } else if (err.code === 'auth/admin-restricted-operation') {
          setError(
            'ADMIN_RESTRICTED: Pendaftaran Pengguna Baru dinonaktifkan di Console Firebase Anda.\n\n' +
            'Silakan ikuti instruksi pemecahan masalah di bawah ini untuk mengaktifkannya.'
          );
        } else {
          setError(err.message || 'Gagal masuk sebagai Tamu. Layanan otentikasi Firebase belum aktif.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200" id="login-layout">
      {/* Dark/Light Mode Switch (Floating Top Right) */}
      {onToggleDarkMode && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onToggleDarkMode}
            className="rounded-xl border p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center"
            title={darkMode ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
            id="login-dark-mode-toggle"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-amber-500" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-500" />
            )}
          </button>
        </div>
      )}

      {/* Decorative ambient spots */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-200/40 dark:bg-indigo-950/15 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-100/30 dark:bg-emerald-950/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-150 dark:shadow-none relative">
            <GraduationCap className="h-9 w-9 stroke-[2]" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          </div>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-display font-black text-slate-900 dark:text-slate-100 tracking-tight">
          EduFlow
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
          Urus kuliah, jadwal, serta indeks prestasi Anda secara aman.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10" id="login-form-container">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl space-y-6">
          
          <div className="text-center space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
              Data Anda disimpan secara personal di cloud database dan hanya Anda yang memiliki hak akses penuh membaca atau mengubahnya.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100/80 dark:border-rose-900/40 rounded-xl p-3.5 flex flex-col gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <div className="flex gap-2.5 items-start">
                <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Gagal Otentikasi</span>
                  <p className="font-medium text-rose-650 dark:text-rose-400 leading-relaxed whitespace-pre-wrap">
                    {error.includes('PROVIDER_DISABLED') || error.includes('ADMIN_RESTRICTED') ? error.split('\n\n')[0] : error}
                  </p>
                </div>
              </div>

              {error.includes('PROVIDER_DISABLED') && (
                <div className="mt-1 bg-white/60 dark:bg-slate-950/20 p-3 rounded-lg border border-rose-200/50 dark:border-rose-900/40 space-y-2 text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="font-extrabold text-rose-800 dark:text-rose-400 uppercase tracking-wide text-[10px]">Langkah Mudah Aktivasi:</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 font-medium select-text">
                    <li>Buka <span className="font-bold">Console Firebase</span></li>
                    <li>Klik <span className="font-bold">Add Provider</span> dan pilih <span className="font-bold">Anonymous</span></li>
                    <li>Aktifkan (Enable) & Simpan (Save)</li>
                  </ol>
                  <a
                    href="https://console.firebase.google.com/project/pelagic-brand-w53sn/authentication/providers"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex w-full items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-extrabold text-xs transition shadow-sm"
                  >
                    Buka Console Firebase <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {error.includes('ADMIN_RESTRICTED') && (
                <div className="mt-1 bg-white/60 dark:bg-slate-950/20 p-3 rounded-lg border border-rose-200/50 dark:border-rose-900/40 space-y-2 text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="font-extrabold text-rose-800 dark:text-rose-400 uppercase tracking-wide text-[10px]">Aktifkan Pembuatan Pengguna:</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 font-medium select-text">
                    <li>Buka <span className="font-bold">Console Firebase</span> proyek Anda</li>
                    <li>Klik tab <span className="font-bold">Settings</span> (di bagian atas) {`->`} <span className="font-bold">User actions</span> (di sebelah kiri)</li>
                    <li>Centang <span className="font-bold">"Enable user creation"</span> (Izinkan pendaftaran baru)</li>
                    <li>Klik <span className="font-bold">Save (Simpan)</span></li>
                  </ol>
                  <a
                    href="https://console.firebase.google.com/project/pelagic-brand-w53sn/authentication/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex w-full items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-extrabold text-xs transition shadow-sm"
                  >
                    Buka Pengaturan Auth <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Social Sign-In and Alternative options */}
          <div className="space-y-3.5">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold text-sm transition shadow-2xs hover:shadow-xs focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 disabled:opacity-60 cursor-pointer"
              id="google-login-btn"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-slate-400 border-t-indigo-650 rounded-full animate-spin"></div>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-1-5.74.81-6.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              )}
              <span className="truncate">Masuk dengan Akun Google</span>
            </button>

            <div className="relative flex py-1.5 items-center">
              <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">atau</span>
              <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
            </div>

            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-750 dark:text-indigo-400 hover:text-indigo-850 dark:hover:text-indigo-300 font-bold text-sm transition focus:outline-none focus:ring-4 focus:ring-indigo-50 dark:focus:ring-slate-800 disabled:opacity-60 cursor-pointer"
              id="guest-login-btn"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-slate-350 border-t-indigo-600 rounded-full animate-spin"></div>
              ) : (
                <Compass className="h-5 w-5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
              )}
              <span>Masuk sebagai Tamu</span>
            </button>
          </div>

          <div className="flex gap-2 items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium px-1">
            <UserCheck className="h-3.5 w-3.5 text-indigo-400 dark:text-indigo-500 shrink-0" />
            <span>Satu akun hanya mengontrol data sendiri tanpa ada pencampuran.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
