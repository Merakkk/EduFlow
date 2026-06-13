export type Priority = 'Tinggi' | 'Sedang' | 'Rendah';
export type TaskStatus = 'Belum Mulai' | 'Proses' | 'Selesai';

export interface Course {
  id: string;
  code: string;
  name: string;
  lecturer: string;
  room: string;
  day: string; // 'Senin', 'Selasa', etc.
  timeStart: string; // '08:00'
  timeEnd: string; // '09:40'
  color: string; // 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo'
  sks?: number; // sks, e.g. 2, 3, 4
  semester?: number; // semester took, e.g. 1 - 8
  grade?: string; // grade letter, e.g. 'A', 'B', etc.
}

export interface Task {
  id: string;
  courseId: string;
  title: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  priority: Priority;
  status: TaskStatus;
}

export type ActiveTab = 'dashboard' | 'courses' | 'tasks' | 'calendar' | 'semester';
