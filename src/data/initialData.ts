import { Course, Task } from '../types';

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    code: 'IF-301',
    name: 'Rekayasa Perangkat Lunak',
    lecturer: 'Dr. Ir. Hermawan, M.T.',
    room: 'Ruang 402, Gedung Baru',
    day: 'Senin',
    days: ['Senin'],
    timeStart: '08:00',
    timeEnd: '09:40',
    color: 'blue'
  },
  {
    id: 'c2',
    code: 'IF-302',
    name: 'Desain & Analisis Algoritma',
    lecturer: 'Prof. Supriadi, Ph.D.',
    room: 'Lab Komputasi A',
    day: 'Selasa',
    days: ['Selasa'],
    timeStart: '10:00',
    timeEnd: '11:40',
    color: 'purple'
  },
  {
    id: 'c3',
    code: 'IF-303',
    name: 'Sistem Basis Data',
    lecturer: 'Amalia Lestari, S.Kom., M.I.T.',
    room: 'Lab Database 2',
    day: 'Rabu',
    days: ['Rabu'],
    timeStart: '13:00',
    timeEnd: '14:40',
    color: 'emerald'
  },
  {
    id: 'c4',
    code: 'IF-304',
    name: 'Pemrograman Web',
    lecturer: 'Riza Fauzi, M.Cs.',
    room: 'Ruang 104, Gedung Teknik',
    day: 'Kamis',
    days: ['Kamis'],
    timeStart: '08:00',
    timeEnd: '10:30',
    color: 'amber'
  },
  {
    id: 'c5',
    code: 'IF-305',
    name: 'Kecerdasan Buatan',
    lecturer: 'Dr. Eng. Yanuardi, S.T.',
    room: 'Ruang Seminar Utama',
    day: 'Jumat',
    days: ['Jumat'],
    timeStart: '09:00',
    timeEnd: '11:30',
    color: 'rose'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    courseId: 'c1',
    title: 'Analisis Kebutuhan Sistem CRM',
    description: 'Membuat dokumen SRS (Software Requirements Specification) untuk rancangan sistem Customer Relationship Management (CRM) ritel.',
    deadline: '2026-06-14', // H-1 dari 2026-06-13
    priority: 'Tinggi',
    status: 'Proses'
  },
  {
    id: 't2',
    courseId: 'c2',
    title: 'Implementasi Algoritma Prim',
    description: 'Menulis kode program pencarian Minimum Spanning Tree menggunakan algoritma Prim dalam bahasa Python, lengkap dengan analisis kompleksitas.',
    deadline: '2026-06-16', // H-3 dari 2026-06-13
    priority: 'Tinggi',
    status: 'Belum Mulai'
  },
  {
    id: 't3',
    courseId: 'c3',
    title: 'Perancangan ERD Database Toko Online',
    description: 'Membuat rancangan ER Diagram lengkap dengan relasi, kardinalitas, dan konversi ke model relasional fisik.',
    deadline: '2026-06-20', // H-7 dari 2026-06-13
    priority: 'Sedang',
    status: 'Belum Mulai'
  },
  {
    id: 't4',
    courseId: 'c4',
    title: 'Slicing HTML/CSS Landing Page',
    description: 'Melakukan slicing desain Figma ke dalam kode HTML dan CSS responsive menggunakan Tailwind CSS.',
    deadline: '2026-06-25', // Masa depan
    priority: 'Rendah',
    status: 'Selesai'
  },
  {
    id: 't5',
    courseId: 'c5',
    title: 'Tugas Logika Fuzzy Mamdani',
    description: 'Mengerjakan studi kasus perhitungan manual logika fuzzy metode Mamdani untuk penilaian kelayakan kredit.',
    deadline: '2026-06-19', // Lainnya
    priority: 'Sedang',
    status: 'Proses'
  }
];

export const DAYS_OF_WEEK = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu'
];

export interface ColorPreset {
  id: string;
  name: string;
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  dot: string;
  rawHex: string;
}

export const COLOR_PRESETS: Record<string, ColorPreset> = {
  blue: {
    id: 'blue',
    name: 'Biru',
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
    rawHex: '#3b82f6'
  },
  purple: {
    id: 'purple',
    name: 'Ungu',
    bg: 'bg-purple-50/70',
    border: 'border-purple-200',
    text: 'text-purple-700',
    badgeBg: 'bg-purple-100 text-purple-800',
    dot: 'bg-purple-500',
    rawHex: '#a855f7'
  },
  emerald: {
    id: 'emerald',
    name: 'Hijau',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
    rawHex: '#10b981'
  },
  amber: {
    id: 'amber',
    name: 'Kuning',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
    rawHex: '#f59e0b'
  },
  rose: {
    id: 'rose',
    name: 'Merah',
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    text: 'text-rose-700',
    badgeBg: 'bg-rose-100 text-rose-800',
    dot: 'bg-rose-500',
    rawHex: '#f43f5e'
  },
  teal: {
    id: 'teal',
    name: 'Teal',
    bg: 'bg-teal-50/70',
    border: 'border-teal-200',
    text: 'text-teal-700',
    badgeBg: 'bg-teal-100 text-teal-800',
    dot: 'bg-teal-500',
    rawHex: '#14b8a6'
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    dot: 'bg-indigo-500',
    rawHex: '#6366f1'
  }
};
