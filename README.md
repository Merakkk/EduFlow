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

---

## 7. Solusi Eror `auth/unauthorized-domain` & Peringatan Keamanan GitHub

Jika mendeploy aplikasi ini ke hosting sendiri (seperti Vercel, Netlify, Cloud Run, dll.) dan mendapatkan pesan **unauthorized-domain** atau peringatan peringatan keamanan dari GitHub (peringatan eksposur Google API Key), silakan ikuti panduan berikut:

### Bagian A: Menghilangkan Peringatan Keamanan GitHub
Sistem deteksi GitHub otomatis mendeteksi kode API Key Firebase jika ditulis secara terbuka di berkas `/src/firebase.ts`.
1. **Solusi Baru Kami**: Kami telah memodifikasi `/src/firebase.ts` untuk menghapus semua kredensial hardcoded. Sekarang aplikasi akan membaca konfigurasi Firebase dari **Environment Variables** (Vite Env).
2. Setelah Anda melakukan `git pull` perubahan terbaru ini dan melakukan `git push` kembali ke repositori Anda, peringatan dari GitHub akan otomatis ditandai sebagai **Resolved (Selesai/Aman)**!

---

### Bagian B: Cara Mengatur Environment Variables di Dashboard Vercel (Supaya Login Bisa Berjalan)
Agar rilis Vercel Anda tahu credential Firebase yang harus digunakan, Anda wajib memasukkannya ke panel kontrol Vercel:
1. Buka dashboard proyek Anda di **[Vercel](https://vercel.com/)**.
2. Masuk ke **Settings** > **Environment Variables**.
3. Tambahkan 6 pasang Key & Value berikut sesuai dengan konfigurasi proyek Firebase Anda (`eduflow-83411`):
   
   | Key (Nama Variabel) | Contoh Value (Nilai) |
   | :--- | :--- |
   | `VITE_FIREBASE_PROJECT_ID` | `eduflow-83411` |
   | `VITE_FIREBASE_APP_ID` | `1:231062152838:web:17c7a48077029cab9e5307` |
   | `VITE_FIREBASE_API_KEY` | `AIzaSyDDLVrxLBeNbIL-zxRcVFOt6qwRxMhHbeE` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `eduflow-83411.firebaseapp.com` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `eduflow-83411.firebasestorage.app` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `231062152838` |
   | `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | `(default)` |

4. Setelah ditambahkan, lakukan pembentukan ulang (Redeploy) di Vercel agar perubahan variabel lingkungan ini aktif!

---

### Bagian C: Mengatasi Masalah "⚠️ Mode Offline" Setelah Login Berhasil

Jika Anda sudah bisa masuk (login berhasil) namun di panel atas bertuliskan **"⚠️ Mode Offline"** (tidak tersinkronisasi), ini artinya **autentikasi telah berhasil, tetapi koneksi ke basis data Cloud Firestore diblokir**.

Saat menyimpan aturan di Firebase Console, jika Anda mendapatkan pesan:
`Error saving rules – Line 1: Parse error.`

Ini memiliki dua kemungkinan penyebab utama:
1. **Salah Tempat (Sangat Sering Terjadi)**: Anda kemungkinan menempelkan aturan ini di tab aturan **Realtime Database** (yang menggunakan format JSON `{ "rules": ... }`). Aturan ini **wajib** dipasang di halaman **Firestore Database**!
2. **Karakter Terbawa**: Pastikan Anda hanya menyalin kode di bawah ini tanpa menyertakan tanda petik tiga (```) atau judul bahasa di atasnya.

Berikut langkah penyelesaian langkah-demi-langkah yang benar:

1. **Aktifkan Cloud Firestore Database**:
   - Di panel navigasi sebelah kiri Firebase Console, cari dan klik **Firestore Database** (bukan *Realtime Database*).
   - Klik **Create Database** (Buat Basis Data) jika tombolnya muncul.
   - Pilih wilayah/lokasi terdekat (misal: `asia-southeast1` untuk Singapura / Indonesia).
   - Pada halaman pemilihan mode aturan awal, pilih **Start in test mode**, lalu klik **Next** dan **Done**.

2. **Terapkan Aturan Keamanan (Firestore Rules)**:
   - Setelah halaman Firestore terbuka, pilih tab **Rules** (Aturan) di bagian atas halaman.
   - Hapus seluruh isi teks yang ada di dalam kotak editor bawaan tersebut.
   - Salin seluruh kode di bawah ini secara utuh, dan tempelkan (paste) ke kotak editor yang sudah dikosongkan tadi:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Global safety net catches all undefined paths.
    match /{document=**} {
      allow read, write: if false;
    }

    // Helper functions
    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    function incoming() {
      return request.resource.data;
    }

    // Workspace shape validation helper
    function isValidWorkspace(data) {
      return data.keys().hasAll(['currentSemester', 'semesterGPAs', 'simulationDate'])
        && data.keys().size() <= 6
        && data.currentSemester is int
        && data.currentSemester >= 1
        && data.currentSemester <= 14
        && data.semesterGPAs is map
        && data.simulationDate is string
        && data.simulationDate.size() <= 20;
    }

    // Course shape validation helper
    function isValidCourse(data) {
      return data.keys().hasAll(['code', 'name', 'lecturer', 'room', 'day', 'timeStart', 'timeEnd', 'color'])
        && data.code is string && data.code.size() <= 20
        && data.name is string && data.name.size() <= 100
        && data.lecturer is string && data.lecturer.size() <= 100
        && data.room is string && data.room.size() <= 100
        && data.day is string && data.day.size() <= 20
        && data.timeStart is string && data.timeStart.size() <= 10
        && data.timeEnd is string && data.timeEnd.size() <= 10
        && data.color is string && data.color.size() <= 20;
    }

    // Task shape validation helper
    function isValidTask(data) {
      return data.keys().hasAll(['courseId', 'title', 'description', 'deadline', 'priority', 'status'])
        && data.courseId is string && data.courseId.size() <= 50
        && data.title is string && data.title.size() <= 200
        && data.description is string && data.description.size() <= 1000
        && data.deadline is string && data.deadline.size() <= 20
        && data.priority is string && (data.priority == 'Tinggi' || data.priority == 'Sedang' || data.priority == 'Rendah')
        && data.status is string && (data.status == 'Belum Mulai' || data.status == 'Proses' || data.status == 'Selesai');
    }

    // Match rules
    match /workspaces/{workspaceId} {
      allow get: if request.auth != null && request.auth.uid == workspaceId;
      allow create: if request.auth != null && request.auth.uid == workspaceId && isValidWorkspace(incoming());
      allow update: if request.auth != null && request.auth.uid == workspaceId && isValidWorkspace(incoming());
      allow delete: if false; // prevent total deletion from client

      match /courses/{courseId} {
        allow list, get: if request.auth != null && request.auth.uid == workspaceId;
        allow create: if request.auth != null && request.auth.uid == workspaceId && isValidId(courseId) && isValidCourse(incoming());
        allow update: if request.auth != null && request.auth.uid == workspaceId && isValidId(courseId) && isValidCourse(incoming());
        allow delete: if request.auth != null && request.auth.uid == workspaceId && isValidId(courseId);
      }

      match /tasks/{taskId} {
        allow list, get: if request.auth != null && request.auth.uid == workspaceId;
        allow create: if request.auth != null && request.auth.uid == workspaceId && isValidId(taskId) && isValidTask(incoming());
        allow update: if request.auth != null && request.auth.uid == workspaceId && isValidId(taskId) && isValidTask(incoming());
        allow delete: if request.auth != null && request.auth.uid == workspaceId && isValidId(taskId);
      }
    }
  }
}
```

   - Klik tombol **Publish** (Terbitkan) di pojok kanan atas setelah menempelkan aturan ini. Aturan ini akan aktif secara instan!

3. **Buka / Muat Ulang Aplikasi Anda**:
   - Segera buka kembali tab tautan aplikasi Vercel Anda (`https://eduflow13.vercel.app/`).
   - Lakukan refresh, dan status di header Anda akan langsung berubah dan menampilkan ikon bulat hijau **"● Terhubung Live"**.
   - Sekarang, seluruh data mata kuliah, jadwal kuliah, kalender, dan daftar tugas tersinkronisasi 100% secara real-time dan aman dari perangkat mobile mana pun maupun desktop!

Selamat menyelesaikan dan mengembangkan aplikasi EduFlow Anda! 🚀
