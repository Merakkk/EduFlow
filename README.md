# Panduan Menjalankan aplikasi di Visual Studio Code (Lokal)

Aplikasi ini dibangun menggunakan **React 19**, **Vite (v6)**, dan **Tailwind CSS v4**. Berikut adalah langkah-langkah lengkap untuk mengunduh, mengakses, mengubah, dan menjalankan proyek ini menggunakan **Visual Studio Code** di komputer lokal Anda.

---

## 1. Unduh atau Ekspor Proyek dari Google AI Studio

Untuk memindahkan kode dari platform AI Studio ke komputer Anda:
1. Pada antarmuka **Google AI Studio Build** di kanan atas layar, cari menu **Settings** atau tombol ekspor (biasanya berbentuk roda gigi atau ikon download/ekspor).
2. Anda memiliki 2 opsi utama:
   - **Download ZIP**: Mengunduh seluruh berkas proyek dalam bentuk arsip `.zip`. Ekstrak berkas ZIP tersebut ke folder baru di komputer lokal Anda.
   - **Export ke GitHub**: Menghubungkan akun GitHub Anda dan mendorong seluruh kode ini ke repositori baru. Setelah terdorong, Anda cukup melakukan `git clone <url-repositori>` di terminal komputer Anda.

---

## 2. Buka Proyek di Visual Studio Code

1. Jalankan aplikasi **Visual Studio Code** di komputer Anda.
2. Klik menu **File** > **Open Folder...** (atau **Open...** pada macOS).
3. Pilih folder proyek yang baru saja Anda ekstrak atau clone sebelumnya.
4. Anda sekarang dapat menjelajahi seluruh kode sumber aplikasi di panel sebelah kiri (Explorer).
   - Struktur utama berkas berada di folder `/src`.
   - Modul semester berada di `/src/components/Semester.tsx`.
   - Modul kalender dengan aksen warna tersinkronisasi berada di `/src/components/Kalender.tsx`.

---

## 3. Instalasi Node.js (Prasyarat)

Untuk mendownload modul tambahan dan menjalankan proyek ini, Anda membutuhkan **Node.js** terinstal di perangkat lokal Anda:
1. Unduh dan pasang versi LTS terbaru dari situs resmi [https://nodejs.org](https://nodejs.org).
2. Setelah terpasang, pastikan instalasi berhasil dengan membuka terminal di komputer Anda dan mengetik:
   ```bash
   node -v
   npm -v
   ```

---

## 4. Instalasi Dependensi Proyek

1. Buka terminal bawaan di VS Code dengan menekan tombol kombinasi `` Ctrl + ` `` (Backtick) atau pilih menu **Terminal** > **New Terminal**.
2. Jalankan perintah berikut untuk menginstal semua pustaka pendukung (seperti React, Vite, Motion, Lucide icons, dll.) yang terdaftar di `package.json`:
   ```bash
   npm install
   ```
   *Proses ini akan membuat folder `node_modules` di dalam direktori proyek Anda.*

---

## 5. Menjalankan Server Pengembangan Lokal

Guna melihat hasil perubahan kode secara real-time di browser Anda, jalankan perintah berikut di terminal VS Code:
```bash
npm run dev
```

Secara default, Vite akan memulai server lokal pada port `3000`. Anda akan melihat tautan di terminal mirip seperti ini:
```text
  VITE v6.2.3  ready in 450 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```
Tahan tombol `Ctrl` dan klik tautan `http://localhost:3000/` di terminal, atau buka browser favorit Anda dan masukkan alamat tersebut secara manual.

---

## 6. Mengubah Kode di VS Code

Sekarang proyek Anda sepenuhnya aktif secara lokal bersama fitur **Hot Module Replacement (HMR)** (pembaruan tampilan instan tanpa muat ulang halaman):
- **Mengubah Tampilan/Fungsi**: Buka berkas apa saja di dalam subfolder `/src/components` (contoh: `/src/components/Semester.tsx`), edit baris kodenya, dan tekan `Ctrl + S` (atau `Cmd + S` di Mac) untuk menyimpan.
- **Melihat Perubahan**: Perubahan akan langsung tercermin secara instan pada browser Anda.
- **Membangun Aplikasi Produksi**: Jika aplikasi Anda siap untuk dideploy, jalankan perintah `npm run build` untuk menghasilkan berkas statis siap pakai yang terletak di folder `/dist`.

Selamat mencoba dan mengembangkan aplikasi Anda lebih jauh lewat Visual Studio Code! 🚀
