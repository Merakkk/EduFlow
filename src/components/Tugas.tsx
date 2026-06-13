import React, { useState } from 'react';
import { Course, Task, Priority, TaskStatus } from '../types';
import { COLOR_PRESETS } from '../data/initialData';
import { formatIndonesianDate, getDeadlineAlert, getDayDifference } from '../utils/dateHelpers';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Edit, 
  Trash2, 
  X, 
  BookOpen, 
  ChevronDown 
} from 'lucide-react';

interface TugasProps {
  courses: Course[];
  tasks: Task[];
  todayStr: string;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onEditTask: (id: string, updated: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onImportQuickTask: boolean;
  onToggleQuickTaskDone: () => void;
}

export default function Tugas({
  courses,
  tasks,
  todayStr,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onImportQuickTask,
  onToggleQuickTaskDone
}: TugasProps) {
  const [isModalOpen, setIsModalOpen] = useState(onImportQuickTask);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'deadlineAsc' | 'deadlineDesc' | 'priorityHigh' | 'title'>('deadlineAsc');

  // Form states
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(todayStr);
  const [priority, setPriority] = useState<Priority>('Sedang');
  const [status, setStatus] = useState<TaskStatus>('Belum Mulai');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (onImportQuickTask) {
      openAddModal();
      onToggleQuickTaskDone();
    }
  }, [onImportQuickTask]);

  const openAddModal = () => {
    setEditingTask(null);
    setCourseId(courses[0]?.id || '');
    setTitle('');
    setDescription('');
    setDeadline(todayStr);
    setPriority('Sedang');
    setStatus('Belum Mulai');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Task) => {
    setEditingTask(t);
    setCourseId(t.courseId);
    setTitle(t.title);
    setDescription(t.description);
    setDeadline(t.deadline);
    setPriority(t.priority);
    setStatus(t.status);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId) {
      setError('Judul tugas dan Mata Kuliah wajib diisi!');
      return;
    }
    if (!deadline) {
      setError('Tanggal deadline wajib ditentukan!');
      return;
    }

    const taskData = {
      courseId,
      title: title.trim(),
      description: description.trim(),
      deadline,
      priority,
      status
    };

    if (editingTask) {
      onEditTask(editingTask.id, taskData);
    } else {
      onAddTask(taskData);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, titleName: string) => {
    setTaskToDelete({ id, title: titleName });
  };

  // Helper styles for priority & status
  const getPriorityStyle = (p: Priority) => {
    switch (p) {
      case 'Tinggi':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Sedang':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Rendah':
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getStatusStyle = (s: TaskStatus) => {
    switch (s) {
      case 'Belum Mulai':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Proses':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Selesai':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  // Filter & Sort Logic
  const filteredTasks = tasks
    .filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCourse = filterCourse === 'all' || t.courseId === filterCourse;
      const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;

      return matchSearch && matchCourse && matchPriority && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'deadlineAsc') {
        return a.deadline.localeCompare(b.deadline);
      }
      if (sortBy === 'deadlineDesc') {
        return b.deadline.localeCompare(a.deadline);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'priorityHigh') {
        const priorityScore = { 'Tinggi': 3, 'Sedang': 2, 'Rendah': 1 };
        return priorityScore[b.priority] - priorityScore[a.priority];
      }
      return 0;
    });

  return (
    <div className="space-y-6" id="tasks-manager-panel">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" /> Daftar Tugas & Pengumpulan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau semua tugas akademik, atur tanggal pengumpulan, tingkat prioritas, status kerja beserta notifikasi alarmnya.
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={courses.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer leading-none shrink-0"
          id="btn-add-task-main"
        >
          <Plus className="h-4.5 w-4.5" /> Tambah Tugas Baru
        </button>
      </div>

      {courses.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-850 rounded-xl text-xs flex items-center gap-2.5 font-bold">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-550" />
          <span>Silakan <strong className="text-amber-900">tambahkan minimal satu Mata Kuliah terlebih dahulu</strong> sebelum mendata atau membuat daftar tugas baru.</span>
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-3xs" id="filters-container">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-405 font-bold" />
            <input
              type="text"
              placeholder="Cari tugas berdasarkan judul atau rangkuman deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs font-semibold focus:bg-white focus:border-indigo-505 hover:border-slate-300 focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 hover:bg-slate-50 transition cursor-pointer"
            >
              <option value="deadlineAsc">🗓️ Deadline Terdekat</option>
              <option value="deadlineDesc">🗓️ Deadline Terjauh</option>
              <option value="priorityHigh">🔥 Prioritas Tertinggi</option>
              <option value="title">🔤 Abjad Judul</option>
            </select>
          </div>
        </div>

        {/* Faceted Filters Accordion */}
        <div className="flex flex-wrap gap-2.5 items-center justify-start border-t border-slate-100 pt-3.5 text-xs">
          <span className="flex items-center gap-1 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <Filter className="h-3 w-3 text-slate-450" /> Filter:
          </span>

          {/* Course filter */}
          <div>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none hover:bg-slate-50 cursor-pointer transition-all"
            >
              <option value="all">Mata Kuliah (Semua)</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none hover:bg-slate-50 cursor-pointer transition-all"
            >
              <option value="all">Semua Prioritas</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Sedang">Sedang</option>
              <option value="Rendah">Rendah</option>
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none hover:bg-slate-50 cursor-pointer transition-all"
            >
              <option value="all">Semua Status</option>
              <option value="Belum Mulai">Belum Mulai</option>
              <option value="Proses">Dalam Proses</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          {/* Clear Filters helper */}
          {(filterCourse !== 'all' || filterPriority !== 'all' || filterStatus !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setFilterCourse('all');
                setFilterPriority('all');
                setFilterStatus('all');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-850 font-bold ml-auto transition-colors cursor-pointer"
            >
              Atur Ulang Filter
            </button>
          )}
        </div>
      </div>

      {/* Task Count Label */}
      <p className="text-xs text-slate-400 font-bold">
        Memperlihatkan {filteredTasks.length} dari total {tasks.length} tugas akademik.
      </p>

      {/* Tasks Render List */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="tasks-cards-layout">
          {filteredTasks.map((t) => {
            const course = courses.find((c) => c.id === t.courseId);
            const colorPreset = course ? COLOR_PRESETS[course.color] : COLOR_PRESETS.blue;
            const alert = getDeadlineAlert(t.deadline, todayStr, t.status);

            // Determine alarm color borders
            let cardBorderX = 'border-l-slate-300';
            if (t.status === 'Selesai') {
              cardBorderX = 'border-l-emerald-500';
            } else if (alert?.type === 'danger') {
              cardBorderX = 'border-l-rose-500';
            } else if (alert?.type === 'warning') {
              cardBorderX = 'border-l-amber-500';
            } else if (course) {
              cardBorderX = 'border-l-indigo-500';
            }

            return (
              <div
                key={t.id}
                className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between gap-4 border-l-4 ${cardBorderX}`}
                id={`task-card-${t.id}`}
              >
                <div className="space-y-3">
                  {/* Card Badges */}
                  <div className="flex items-start justify-between gap-25">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-[85%]">
                      {course ? (
                        <span className={`inline-block text-[9px] uppercase font-bold tracking-tight px-2 py-0.5 rounded border ${colorPreset?.border} ${colorPreset?.bg} ${colorPreset?.text}`}>
                          {course.name}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                          MK Terhapus
                        </span>
                      )}

                      {/* Priority pill */}
                      <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wide ${getPriorityStyle(t.priority)}`}>
                        {t.priority}
                      </span>
                    </div>

                    {/* Action panel */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => openEditModal(t)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition cursor-pointer"
                        title="Sunting Tugas"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.title)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h3 className={`font-display text-sm sm:text-base font-bold text-slate-900 leading-snug ${t.status === 'Selesai' ? 'line-through text-slate-400 font-medium' : ''}`}>
                      {t.title}
                    </h3>
                    <p className={`text-xs leading-relaxed text-slate-550 ${t.status === 'Selesai' ? 'text-slate-400' : ''}`}>
                      {t.description || <em className="text-slate-400">Tidak ada rincian deskripsi tambahan.</em>}
                    </p>
                  </div>
                </div>

                {/* Footer section */}
                <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Deadline date */}
                  <div className="space-y-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100/60 flex-1">
                    <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px]">
                      <Calendar className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span>{formatIndonesianDate(t.deadline)}</span>
                    </div>

                    {/* Alarm Remaining Time warning */}
                    {t.status !== 'Selesai' && alert && (
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border justify-center ${
                        alert.type === 'danger' ? 'text-rose-705 border-rose-200 bg-rose-50 animate-pulse' : 
                        alert.type === 'warning' ? 'text-amber-705 border-amber-200 bg-amber-50' : 
                        'text-indigo-705 border-indigo-200 bg-indigo-50'
                      }`}>
                        🔔 {alert.text}
                      </span>
                    )}
                  </div>

                  {/* Status pills / Action list toggle */}
                  <div className="flex items-center gap-1.5 justify-between sm:justify-start">
                    <span className={`inline-block text-[9px] uppercase tracking-wide font-extrabold px-2.5 py-1 rounded-full border ${getStatusStyle(t.status)}`}>
                      {t.status}
                    </span>

                    {t.status !== 'Selesai' ? (
                      <button
                        onClick={() => onEditTask(t.id, { status: 'Selesai' })}
                        className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition px-2.5 py-1.5 shadow-3xs border border-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        Selesaikan ✅
                      </button>
                    ) : (
                      <button
                        onClick={() => onEditTask(t.id, { status: 'Belum Mulai' })}
                        className="rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-350 hover:text-slate-900 transition px-2.5 py-1.5 shadow-3xs border border-slate-205 text-[10px] font-bold cursor-pointer"
                      >
                        Buka Kembali
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200" id="empty-tasks">
          <div className="rounded-full bg-indigo-50 p-4 text-indigo-505 mb-3">
            <ClipboardList className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-base">Tugas Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
            {tasks.length > 0
              ? 'Tidak ada tugas yang sesuai dengan pencarian atau kriteria filter Anda saat ini.'
              : 'Anda belum mendaftarkan tugas akademik. Mulailah mencatat tugas mandiri Anda untuk memicu alarm jadwal pengerjaan!'}
          </p>
          {tasks.length > 0 ? (
            <button
              onClick={() => {
                setFilterCourse('all');
                setFilterPriority('all');
                setFilterStatus('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Reset Semua Filter
            </button>
          ) : (
            <button
              onClick={openAddModal}
              disabled={courses.length === 0}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Tambah Tugas Baru
            </button>
          )}
        </div>
      )}

      {/* CRUD Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="task-modal">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-50 border-b border-slate-100 px-6 py-4">
              <h2 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                {editingTask ? 'Sunting Tugas Akademik ✍️' : 'Tambah Tugas Akademik Baru 📝'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 text-xs font-bold animate-pulse">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Course Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Afiliasi Mata Kuliah <span className="text-red-500">*</span></label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-bold transition-all bg-white cursor-pointer"
                >
                  <option value="" disabled>--- Pilih Mata Kuliah Terdaftar ---</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Judul Tugas / Pekerjaan <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Membuat Rangkuman Bab 3, Proyek Akhir"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-medium transition-all"
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Instruksi / Rincian Deskripsi</label>
                <textarea
                  placeholder="Contoh: Lampirkan berkas dalam tipe PDF, minimal 10 halaman, menggunakan referensi IEEE..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-505 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-medium resize-none transition-all"
                  maxLength={300}
                />
              </div>

              {/* Deadline */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Tanggal Pengumpulan (Deadline) <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={deadline}
                  min="2020-01-01"
                  max="2035-12-31"
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-medium bg-white font-mono transition-all"
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  Sistem otomatis mengalkulasi alarm untuk H-1, H-3, dan H-7 berdasarkan pilihan tanggal kumpul ini.
                </p>
              </div>

              {/* Priority & Status Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Tingkat Prioritas <span className="text-red-500">*</span></label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-bold transition-all bg-white cursor-pointer"
                  >
                    <option value="Tinggi">🔴 Tinggi</option>
                    <option value="Sedang">🟡 Sedang</option>
                    <option value="Rendah">🔵 Rendah</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Status Pengerjaan <span className="text-red-500">*</span></label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-bold transition-all bg-white cursor-pointer"
                  >
                    <option value="Belum Mulai">⚪ Belum Mulai</option>
                    <option value="Proses">🔵 Sedang Proses</option>
                    <option value="Selesai">🟢 Selesai</option>
                  </select>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
                >
                  {editingTask ? 'Simpan Perubahan' : 'Rekam Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">Hapus Tugas</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hapus tugas <strong>{taskToDelete.title}</strong> dari daftar perkuliahan Anda?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(taskToDelete.id);
                  setTaskToDelete(null);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition cursor-pointer animate-in zoom-in-50 duration-75"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
