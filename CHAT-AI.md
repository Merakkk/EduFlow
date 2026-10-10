# Chat AI EduFlow — source kandidat, belum diterapkan

Dasar: source repositori Merakkk/EduFlow, diambil 11 Oktober 2026. Commit dasar: 631450f27b5efa9ad5678b76b6cc0868830c74a8. Perubahan disiapkan pada branch codex/eduflow-ai-chat untuk draft PR; main dan instalasi SEB tidak diubah. Source ini belum merupakan rilis teruji di Vercel.

## Perubahan

- src/components/ChatAI.tsx: halaman chat dengan pilihan GPT/OpenAI, Gemini, Claude, DeepSeek; status penyedia dari server; Enter/Shift+Enter; indikator menunggu; pesan error; percakapan baru; respons ditampilkan sebagai teks React.
- src/App.tsx dan src/types.ts: menu Chat AI desktop/ponsel. Komponen dipertahankan ketika berpindah tab dan membersihkan percakapan ketika akun berubah. Tidak membaca data jadwal atau tugas.
- server/chat-core.ts: inti autentikasi dan adapter empat penyedia. Endpoint tetap, model dipilih pengelola melalui env, bukan URL bebas dari pengguna. Token Firebase diverifikasi menggunakan RS256, kid, aud, iss, exp, iat, auth_time dan UID. Mode anonymous/tamu ditolak. Daftar UID server wajib; tidak ada akses AI bila konfigurasi kosong.
- api/chat.ts dan server.ts: Vercel serta development lokal memakai inti yang sama.
- .env.example: hanya nama variabel/pengaturan contoh; tidak ada key AI sungguhan.
- tests/chat-core.test.ts: pengujian sintetis tanpa API/credential sungguhan.

## Mengaktifkan pada Vercel setelah build dan preview lulus

1. Tetapkan AI_FIREBASE_PROJECT_ID ke project Firebase yang sama dengan login aplikasi.
2. Tetapkan AI_ALLOWED_UIDS ke UID Firebase akun yang boleh menggunakan chat, dipisahkan koma. UID bukan email dan bukan password. Jangan gunakan wildcard. Periksa Firebase Authentication > Users.
3. Tambahkan OPENAI_API_KEY sebagai secret server di environment Vercel. Key lokal yang sebelumnya dibuat berada di proyek demo terpisah; key itu belum dipindahkan atau diunggah ke Vercel. Jangan menambahkan prefix VITE_ pada key AI. OPENAI_MODEL default gpt-5-mini; ketersediaan/billing harus diuji pada akun yang digunakan.
4. Untuk penyedia lain, isi secret dan model yang tersedia pada akun terkait: GEMINI_API_KEY + GEMINI_CHAT_MODEL; ANTHROPIC_API_KEY + ANTHROPIC_MODEL; DEEPSEEK_API_KEY + DEEPSEEK_MODEL. Tidak menganggap satu key bekerja untuk semua penyedia. Model selain OpenAI sengaja tidak dipin ke nama yang belum diuji; pastikan nama model saat aktivasi.
5. Gunakan Preview environment terlebih dahulu. Jangan mengubah env produksi sebelum perubahan disetujui. Jangan mengunggah file .env ke Git, ZIP distribusi, atau frontend.
6. Jalankan npm ci, npm run lint, npm run build, lalu uji preview dengan login Firebase. Jalankan tes inti: node --test tests/chat-core.test.ts (Node 24; memakai dukungan TypeScript Node).

## Bukti dan batas pemeriksaan

Pengujian inti dijalankan melalui Node.js lokal: 23 test, 23 pass, 0 fail. Mencakup JWT bertanda tangan sintetis, token rusak/kedaluwarsa/project salah/anonymous/algoritma salah, kegagalan layanan sertifikat, batas panjang dan urutan pesan, permintaan bersamaan, batas laju, adapter empat penyedia dengan fetch tiruan, error upstream tanpa membocorkan body, daftar akun, status tanpa key, dan cleanup setelah gagal.

Build frontend, typecheck penuh, browser QA, Vercel Preview dan API sungguhan BELUM dilakukan. Instalasi dependensi sebelumnya tertahan: automatic approval review gagal karena usage limit, bukan karena penilaian tidak aman. Tidak menggunakan jalur lain untuk melewati pemeriksaan itu. Branch draft memuat source kandidat; belum ada merge, deploy manual, atau panggilan API berbayar. Vercel mungkin otomatis membuat Preview dari branch/PR sesuai pengaturan repositori; statusnya perlu diperiksa sebelum digunakan. Test adapter membuktikan penyusunan/parsing respons tiruan, bukan kompatibilitas runtime provider.

Batas laju 8 permintaan/menit dan satu permintaan aktif berlaku PER PROSES; bukan kuota terdistribusi atau batas biaya global. Vercel dapat memiliki banyak instance. Sebelum pemakaian luas, tambahkan limiter terdistribusi dan atur billing limit penyedia. Allowlist UID wajib mengurangi akses ke akun yang ditentukan.

Verifikasi token tidak memeriksa pencabutan sesi/akun disabled secara realtime; token sah dapat tetap diterima hingga kedaluwarsa. Untuk jaminan revocation gunakan Firebase Admin SDK/service account dengan checkRevoked atau mekanisme server yang didukung. Tidak menjanjikan keamanan hanya dari test sintetis.

Chat tidak disimpan di Firestore/localStorage, tetapi pesan/riwayat percakapan yang dikirim akan diteruskan ke penyedia AI. OpenAI memakai store:false; ini bukan klaim zero data retention. Provider dapat menerapkan kebijakan retensinya sendiri. Tidak ada retry/fallback otomatis yang menggandakan permintaan biaya. Refresh/logout menghapus chat lokal; request upstream yang sudah dikirim dapat tetap dikenai biaya ketika browser berhenti.

Fungsi parse-schedule dan konfigurasi Firebase lama dipertahankan; tidak termasuk audit lengkap terhadap aplikasi yang sudah ada.

## Rencana uji Preview

- Desktop/ponsel, mode gelap, menu/tab lain, Enter/Shift+Enter/IME, teks markup, pergantian penyedia, percakapan baru.
- Tamu/offline, akun biasa di luar allowlist, akun di allowlist, token expired, logout saat respons berlangsung.
- Provider tanpa key/model, key tidak valid, saldo habis, timeout, respons kosong/terbatas; tidak ada retry otomatis.
- Satu percakapan nyata dan multi-turn per provider setelah key/saldo tersedia; cek key tidak ada pada assets frontend/network response.
- Permintaan bersamaan, batas panjang pesan, navigasi saat menunggu, refresh, cold start, beberapa instance Vercel.
- Build/lint aplikasi asli dan kandidat agar error yang sudah ada dapat dibedakan dari perubahan chat.

## Sumber

- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://developers.openai.com/api/docs/guides/text
- https://developers.openai.com/api/docs/guides/migrate-to-responses
- https://developers.openai.com/api/docs/models/gpt-5-mini
- https://ai.google.dev/api/generate-content
- https://platform.claude.com/docs/en/api/messages/create
- https://api-docs.deepseek.com/api/create-chat-completion/

Tidak ada mekanisme untuk memodifikasi atau melewati aturan SEB.

