import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with size limits for screenshot uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Gemini AI
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API endpoint for parsing schedule from screenshots
  app.post('/api/parse-schedule', async (req, res) => {
    try {
      const { image, mimeType } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Data gambar screenshot tidak ditemukan.' });
      }

      if (!apiKey) {
        return res.status(500).json({ 
          error: 'Kunci API Gemini tidak terkonfigurasi pada server. Silakan atur GEMINI_API_KEY di panel Secrets.' 
        });
      }

      // Prepare parts for Gemini
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
      const imagePart = {
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: cleanBase64,
        },
      };

      const promptPart = {
        text: `Analisis gambar screenshot jadwal kuliah ini dan ekstrak seluruh mata kuliah (mata pelajaran kuliah) secara lengkap dan akurat. 
        Pastikan untuk membaca nama mata kuliah, kode mata kuliah, dosen, hari, jam perkuliahan, dan ruangan.
        
        Keluarkan data dalam format JSON array yang valid, sesuai dengan skema ini.
        Hari dalam jadwal/kuliah hanya boleh bernilai salah satu dari: "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu".
        Jika kode mata kuliah tidak ditemukan, buatlah singkatan pendek yang ramah (misal "ALGO" untuk Algoritma, "STRUK-DAT" untuk Struktur Data, dst).
        Semua jam perkuliahan harus dalam format HH:MM padat (misal "08:15", "10:30").`,
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [imagePart, promptPart],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Daftar mata kuliah yang berhasil diekstrak dari gambar screenshot jadwal.',
            items: {
              type: Type.OBJECT,
              properties: {
                code: { type: Type.STRING, description: 'Kode mata kuliah (misal: IF-101, atau buat singkatan jika tidak ada)' },
                name: { type: Type.STRING, description: 'Nama mata kuliah secara lengkap' },
                lecturer: { type: Type.STRING, description: 'Nama dosen pengampu mata kuliah' },
                room: { type: Type.STRING, description: 'Ruangan kelas (misal: Ruang 402, Lab Komputasi A)' },
                day: { type: Type.STRING, description: 'Hari pelaksanaan kuliah (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, atau Minggu)' },
                timeStart: { type: Type.STRING, description: 'Waktu mulai kuliah format HH:MM (misal: 08:00)' },
                timeEnd: { type: Type.STRING, description: 'Waktu selesai kuliah format HH:MM (misal: 09:40)' },
                sks: { type: Type.INTEGER, description: 'Perkiraan jumlah SKS (misal: 2, 3, 4, default jika tidak terbaca: 3)' },
                semester: { type: Type.INTEGER, description: 'Semester pelaksanaan kuliah (misal: 1, 2, 3, 4, 5, atau silakan tebak yang rasional)' }
              },
              required: ['name', 'day', 'timeStart', 'timeEnd'],
            },
          },
        },
      });

      const resultText = response.text || '[]';
      const coursesData = JSON.parse(resultText);

      return res.json({ courses: coursesData });
    } catch (error: any) {
      console.error('Error on /api/parse-schedule:', error);
      return res.status(500).json({ 
        error: error.message || 'Gagal menganalisis gambar jadwal kuliah menggunakan AI.' 
      });
    }
  });

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  });
}

startServer();
