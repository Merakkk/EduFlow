import React, { useState } from 'react';
import { Course, Task } from '../types';
import { DAYS_OF_WEEK, COLOR_PRESETS } from '../data/initialData';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  MapPin, 
  Clock, 
  Calendar, 
  X, 
  CheckSquare, 
  AlertCircle 
} from 'lucide-react';

interface MataKuliahProps {
  courses: Course[];
  tasks: Task[];
  onAddCourse: (course: Omit<Course, 'id'>) => void;
  onEditCourse: (id: string, updated: Partial<Course>) => void;
  onDeleteCourse: (id: string) => void;
  currentSemester?: number;
}

export default function MataKuliah({
  courses,
  tasks,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
  currentSemester
}: MataKuliahProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; name: string } | null>(null);

  // Dynamic list of semesters in system
  const existingSemsFromCourses = courses.map(c => c.semester || currentSemester || 5);
  const maxSemesterInSystem = Math.max(
    1,
    currentSemester || 5,
    ...existingSemsFromCourses
  );
  
  const semestersList = Array.from({ length: maxSemesterInSystem }, (_, i) => i + 1);

  // Filter state
  const [selectedSemFilter, setSelectedSemFilter] = useState<number | 'all'>(currentSemester || 5);

  // Sync state with parent currentSemester
  React.useEffect(() => {
    if (currentSemester) {
      setSelectedSemFilter(currentSemester);
    }
  }, [currentSemester]);

  // Filter courses based on selected semester
  const filteredCourses = selectedSemFilter === 'all'
    ? courses
    : courses.filter(c => (c.semester || currentSemester || 5) === selectedSemFilter);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [room, setRoom] = useState('');
  const [day, setDay] = useState('Senin');
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('09:40');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [courseSemester, setCourseSemester] = useState<number>(5);
  const [error, setError] = useState('');

  const openAddModal = () => {
    setEditingCourse(null);
    setCode('');
    setName('');
    setLecturer('');
    setRoom('');
    setDay('Senin');
    setTimeStart('08:00');
    setTimeEnd('09:40');
    setSelectedColor('blue');
    setCourseSemester(
      typeof selectedSemFilter === 'number' ? selectedSemFilter : (currentSemester || 5)
    );
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setCode(c.code);
    setName(c.name);
    setLecturer(c.lecturer);
    setRoom(c.room);
    setDay(c.day);
    setTimeStart(c.timeStart);
    setTimeEnd(c.timeEnd);
    setSelectedColor(c.color);
    setCourseSemester(c.semester || currentSemester || 5);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !lecturer.trim() || !room.trim() || !timeStart || !timeEnd) {
      setError('Semua kolom formulir harus diisi!');
      return;
    }

    // Compare times
    if (timeStart >= timeEnd) {
      setError('Jam mulai harus lebih awal dibanding jam selesai!');
      return;
    }

    const courseData = {
      code: code.trim(),
      name: name.trim(),
      lecturer: lecturer.trim(),
      room: room.trim(),
      day,
      timeStart,
      timeEnd,
      color: selectedColor,
      semester: courseSemester,
      sks: editingCourse ? (editingCourse.sks !== undefined ? editingCourse.sks : 3) : 3,
      grade: editingCourse ? (editingCourse.grade || '-') : '-'
    };

    if (editingCourse) {
      onEditCourse(editingCourse.id, courseData);
    } else {
      onAddCourse(courseData);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setCourseToDelete({ id, name });
  };

  return (
    <div className="space-y-6" id="courses-manager-panel">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" /> Manajemen Mata Kuliah
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lihat, tambahkan, dan perbarui kurikulum mata kuliah aktif beserta jadwal perkuliahannya.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 cursor-pointer leading-none"
          id="btn-add-course-main"
        >
          <Plus className="h-4.5 w-4.5" /> Tambah Mata Kuliah
        </button>
      </div>

      {/* Semester Filter Tabs */}
      {courses.length > 0 && (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs" id="semester-tabs-container">
          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => setSelectedSemFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSemFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
              }`}
            >
              Semua Semester
            </button>
            
            <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

            {semestersList.map((sem) => {
              const isActive = selectedSemFilter === sem;
              const isCurrent = currentSemester === sem;
              const semCoursesCount = courses.filter(c => (c.semester || currentSemester || 5) === sem).length;

              return (
                <button
                  key={sem}
                  onClick={() => setSelectedSemFilter(sem)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                      : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                  }`}
                >
                  <span>Sem {sem}</span>
                  {semCoursesCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {semCoursesCount}
                    </span>
                  )}
                  {isCurrent && (
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${
                      isActive ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                    }`}>
                      Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          <span className="text-[11px] font-bold text-slate-500 md:mr-2">
            Menampilkan {filteredCourses.length} dari {courses.length} mata kuliah
          </span>
        </div>
      )}

      {/* Grid List */}
      {courses.length > 0 ? (
        filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="courses-grid-layout">
            {filteredCourses.map((c) => {
            const preset = COLOR_PRESETS[c.color] || COLOR_PRESETS.blue;
            // Filter tasks under this course
            const courseTasks = tasks.filter((t) => t.courseId === c.id);
            const activeTasks = courseTasks.filter((t) => t.status !== 'Selesai');

            return (
              <div
                key={c.id}
                className="relative rounded-2xl border bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden group border-t-4"
                style={{ borderTopColor: preset.rawHex || '#6366f1' }} 
                id={`course-card-${c.id}`}
              >
                {/* Visual Accent Corner Ribbon */}
                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-transparent to-slate-50 rounded-bl-full pointer-events-none"></div>

                <div className="space-y-4">
                  {/* Card Badge & Code Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1.5 items-center">
                      <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${preset.badgeBg}`}>
                        {c.code}
                      </span>
                      <span className="inline-block text-[10px] font-extrabold tracking-wider bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                        Sem {c.semester || 5}
                      </span>
                    </div>
                    
                    {/* Action buttons panel */}
                    <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                        title="Edit Mata Kuliah"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                        title="Hapus Mata Kuliah"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title and Lecturer */}
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-base tracking-tight group-hover:text-indigo-600 transition duration-150 leading-snug">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-semibold">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.lecturer}</span>
                    </div>
                  </div>

                  {/* Date, Location and Room Details */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Hari {c.day}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-md text-[11px]">
                        <Clock className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                        <span>{c.timeStart} - {c.timeEnd}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.room}</span>
                    </div>
                  </div>
                </div>

                {/* Task Stats Pill */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                    <CheckSquare className="h-3.5 w-3.5 text-slate-400 font-bold" />
                    <span>Tugas: <strong className="text-slate-700 font-extrabold">{courseTasks.length}</strong></span>
                  </div>

                  {activeTasks.length > 0 ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                      {activeTasks.length} Berlangsung
                    </span>
                  ) : courseTasks.length > 0 ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      Semua Selesai ✨
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-205 px-2 py-0.5 rounded-full">
                      Belum Ada Tugas
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-205" id="empty-semester-courses">
          <div className="rounded-full bg-indigo-50 p-4 text-indigo-500 mb-3">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-base">Semester {selectedSemFilter} Kosong</h3>
          <p className="text-xs text-slate-550 mt-1 max-w-sm leading-relaxed">
            Belum ada mata kuliah yang terdaftar khusus untuk Semester {selectedSemFilter}. Silakan daftarkan mata kuliah baru untuk semester ini!
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Daftarkan di Semester {selectedSemFilter}
          </button>
        </div>
      )) : (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200" id="empty-courses">
          <div className="rounded-full bg-indigo-50 p-4 text-indigo-500 mb-3">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-base">Mata Kuliah Kosong</h3>
          <p className="text-xs text-slate-550 mt-1 max-w-sm leading-relaxed">
            Anda belum mendaftarkan mata kuliah satu pun. Mulai tambahkan mata kuliah Anda untuk merekam jadwal belajar hari ini!
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Daftarkan Sekarang
          </button>
        </div>
      )}

      {/* CRUD Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="course-modal">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-50 border-b border-slate-100 px-6 py-4">
              <h2 className="font-display font-bold text-slate-905 text-sm sm:text-base">
                {editingCourse ? 'Sunting Mata Kuliah ✍️' : 'Tambah Mata Kuliah Baru 📚'}
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
                <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 text-xs font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Kode MK <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: IF-202"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-medium transition-all"
                    maxLength={12}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Nama Mata Kuliah <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Struktur Data"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-medium transition-all"
                    maxLength={60}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Dosen Pengampu <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dr. Eng. Helmi Fauzi, M.T."
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-medium transition-all"
                  maxLength={60}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Ruang / Platform <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ruang 304 / Zoom"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-medium transition-all"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Hari Perkuliahan <span className="text-red-500">*</span></label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-bold transition-all bg-white cursor-pointer"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Semester <span className="text-red-500">*</span></label>
                  <select
                    value={courseSemester}
                    onChange={(e) => setCourseSemester(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-bold transition-all bg-white cursor-pointer"
                  >
                    {Array.from({ length: 14 }, (_, i) => i + 1).map((sem) => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Jam Mulai <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-medium transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Jam Selesai <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 focus:outline-none px-3 py-2 text-xs font-medium transition-all"
                  />
                </div>
              </div>

              {/* Theme selection style */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">Warna Aksen Mata Kuliah</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.keys(COLOR_PRESETS).map((key) => {
                    const preset = COLOR_PRESETS[key];
                    const selected = selectedColor === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedColor(key)}
                        className={`group relative h-8 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          selected
                            ? `${preset.badgeBg} ${preset.border} scale-[1.02] ring-4 ring-indigo-100/60`
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${preset.dot}`}></span>
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
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
                  {editingCourse ? 'Simpan Perubahan' : 'Daftarkan MK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">Hapus Mata Kuliah</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus mata kuliah <strong>{courseToDelete.name}</strong>? Seluruh tugas yang terafiliasi juga akan terhapus.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCourse(courseToDelete.id);
                  setCourseToDelete(null);
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
