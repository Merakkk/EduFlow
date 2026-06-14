import React, { useState } from 'react';
import { Course, Task, CourseSchedule } from '../types';
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
  AlertCircle,
  Sparkles,
  Upload,
  Image,
  FileText,
  Loader2,
  Check
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

  // States for AI Screenshot upload schedule feature
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);
  const [parsedCourses, setParsedCourses] = useState<Omit<Course, 'id'>[]>([]);
  const [selectedParsedIndexes, setSelectedParsedIndexes] = useState<Record<number, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setAnalyzerError(null);
      setParsedCourses([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setUploadFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
        setAnalyzerError(null);
        setParsedCourses([]);
      } else {
        setAnalyzerError('Format file harus berupa gambar (PNG, JPG, JPEG, dll.)');
      }
    }
  };

  const handleAnalyzeScreenshot = async () => {
    if (!uploadPreview) return;
    setIsAnalyzing(true);
    setAnalyzerError(null);

    try {
      const res = await fetch('/api/parse-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: uploadPreview,
          mimeType: uploadFile?.type || 'image/png'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal memproses gambar jadwal.');
      }

      const data = await res.json();
      if (data.courses && Array.isArray(data.courses)) {
        if (data.courses.length === 0) {
          throw new Error('AI tidak berhasil mendeteksi mata kuliah apapun dari screenshot tersebut. Pastikan teks terlihat jelas.');
        }

        // Group courses with identical names together, merging schedules
        const groupedCoursesMap = new Map<string, any>();
        
        data.courses.forEach((c: any) => {
          const courseName = c.name || 'Mata Kuliah Baru';
          const normalized = courseName.toLowerCase().trim().replace(/\s+/g, ' ');
          
          const scheduleRows = c.schedules && c.schedules.length > 0 ? c.schedules : [
            {
              id: Date.now().toString() + Math.random().toString().substring(2, 6),
              day: c.day || 'Senin',
              timeStart: c.timeStart || '08:00',
              timeEnd: c.timeEnd || '09:40',
              room: c.room || 'TBA'
            }
          ];

          if (groupedCoursesMap.has(normalized)) {
            const existing = groupedCoursesMap.get(normalized);
            
            // Map and add new schedules
            const newSchedules = scheduleRows.map((s: any) => ({
              id: s.id || (Date.now().toString() + Math.random().toString().substring(2, 6)),
              day: s.day || c.day || 'Senin',
              timeStart: s.timeStart || c.timeStart || '08:00',
              timeEnd: s.timeEnd || c.timeEnd || '09:40',
              room: s.room || c.room || existing.room || 'TBA'
            }));

            // Append schedules avoiding redundant duplicates (same day + start time combination)
            newSchedules.forEach((newS: any) => {
              const isDuplicate = existing.schedules.some((existingS: any) => 
                existingS.day === newS.day && 
                existingS.timeStart === newS.timeStart
              );
              if (!isDuplicate) {
                existing.schedules.push(newS);
              }
            });

            // Update lecturer if existing is default but new is custom
            if ((existing.lecturer === 'Dosen Pengampu' || !existing.lecturer) && c.lecturer && c.lecturer !== 'Dosen Pengampu') {
              existing.lecturer = c.lecturer;
            }
          } else {
            groupedCoursesMap.set(normalized, {
              code: c.code || `MK-${Math.floor(Math.random() * 900) + 100}`,
              name: courseName,
              lecturer: c.lecturer || 'Dosen Pengampu',
              room: c.room || scheduleRows[0].room || 'TBA',
              day: c.day || scheduleRows[0].day || 'Senin',
              color: '', // Assigned below
              sks: c.sks || 3,
              semester: (typeof selectedSemFilter === 'number' ? selectedSemFilter : (c.semester || currentSemester || 1)),
              grade: '-',
              schedules: scheduleRows.map((s: any) => ({
                id: s.id || (Date.now().toString() + Math.random().toString().substring(2, 6)),
                day: s.day || c.day || 'Senin',
                timeStart: s.timeStart || c.timeStart || '08:00',
                timeEnd: s.timeEnd || c.timeEnd || '09:40',
                room: s.room || c.room || 'TBA'
              }))
            });
          }
        });

        const colorKeys = Object.keys(COLOR_PRESETS);
        const nameToColorMap = new Map<string, string>();
        courses.forEach(c => {
          const normalized = c.name.toLowerCase().trim().replace(/\s+/g, ' ');
          if (normalized && c.color) {
            nameToColorMap.set(normalized, c.color);
          }
        });

        let unmappedColorIndex = 0;
        const coursesWithDefaultAndColors = Array.from(groupedCoursesMap.values()).map((c: any) => {
          const normalized = c.name.toLowerCase().trim().replace(/\s+/g, ' ');
          
          let color = nameToColorMap.get(normalized);
          if (!color) {
            color = colorKeys[unmappedColorIndex % colorKeys.length];
            unmappedColorIndex++;
            nameToColorMap.set(normalized, color);
          }

          c.color = color;
          c.days = c.schedules.map((s: any) => s.day);
          c.day = c.schedules[0]?.day || 'Senin';
          c.timeStart = c.schedules[0]?.timeStart || '08:00';
          c.timeEnd = c.schedules[0]?.timeEnd || '09:40';
          c.room = c.schedules[0]?.room || 'TBA';

          return c;
        });

        setParsedCourses(coursesWithDefaultAndColors);
        const selObj: Record<number, boolean> = {};
        coursesWithDefaultAndColors.forEach((_: any, idx: number) => {
          selObj[idx] = true;
        });
        setSelectedParsedIndexes(selObj);
      } else {
        throw new Error('Format respon AI tidak sesuai.');
      }
    } catch (err: any) {
      console.error(err);
      setAnalyzerError(err.message || 'Gagal berkomunikasi dengan server AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImportSelected = () => {
    const selected = parsedCourses.filter((_, idx) => selectedParsedIndexes[idx]);
    if (selected.length === 0) {
      setAnalyzerError('Pilih setidaknya satu mata kuliah untuk diimpor.');
      return;
    }

    selected.forEach(course => {
      onAddCourse(course);
    });

    // Reset and close modal
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setUploadPreview(null);
    setParsedCourses([]);
    setSelectedParsedIndexes({});
    setAnalyzerError(null);
  };

  const toggleSelectAllParsed = () => {
    const allSelected = parsedCourses.every((_, idx) => selectedParsedIndexes[idx]);
    const next: Record<number, boolean> = {};
    parsedCourses.forEach((_, idx) => {
      next[idx] = !allSelected;
    });
    setSelectedParsedIndexes(next);
  };

  const toggleSelectParsedIndex = (index: number) => {
    setSelectedParsedIndexes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleModifyParsedCourseSemester = (index: number, newSem: number) => {
    setParsedCourses(prev => prev.map((c, idx) => {
      if (idx === index) {
        return { ...c, semester: newSem };
      }
      return c;
    }));
  };

  const handleManualNameChange = (val: string) => {
    setName(val);
    const normalizedInput = val.toLowerCase().trim().replace(/\s+/g, ' ');
    if (normalizedInput) {
      const existing = courses.find(c => c.name.toLowerCase().trim().replace(/\s+/g, ' ') === normalizedInput && (!editingCourse || c.id !== editingCourse.id));
      if (existing && existing.color) {
        setSelectedColor(existing.color);
      }
    }
  };
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
  const [selectedDays, setSelectedDays] = useState<string[]>(['Senin']);
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('09:40');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [courseSemester, setCourseSemester] = useState<number>(5);
  const [error, setError] = useState('');
  const [schedules, setSchedules] = useState<CourseSchedule[]>([
    { id: '1', day: 'Senin', timeStart: '08:00', timeEnd: '09:40', room: '' }
  ]);

  const addScheduleRow = () => {
    setSchedules([
      ...schedules,
      {
        id: Date.now().toString() + Math.random().toString().substring(2, 6),
        day: 'Senin',
        timeStart: '08:00',
        timeEnd: '09:40',
        room: room || ''
      }
    ]);
  };

  const removeScheduleRow = (id: string) => {
    if (schedules.length > 1) {
      setSchedules(schedules.filter(s => s.id !== id));
    }
  };

  const updateScheduleRow = (id: string, field: keyof CourseSchedule, value: string) => {
    setSchedules(schedules.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const openAddModal = () => {
    setEditingCourse(null);
    setCode('');
    setName('');
    setLecturer('');
    setRoom('');
    setDay('Senin');
    setSelectedDays(['Senin']);
    setTimeStart('08:00');
    setTimeEnd('09:40');
    setSchedules([
      { id: Date.now().toString(), day: 'Senin', timeStart: '08:00', timeEnd: '09:40', room: '' }
    ]);
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
    setSelectedDays(c.days || [c.day]);
    setTimeStart(c.timeStart);
    setTimeEnd(c.timeEnd);
    const existingSchedules = c.schedules && c.schedules.length > 0
      ? c.schedules
      : [{ id: Date.now().toString(), day: c.day || 'Senin', timeStart: c.timeStart || '08:00', timeEnd: c.timeEnd || '09:40', room: c.room || '' }];
    setSchedules(existingSchedules.map(s => ({ ...s })));
    setSelectedColor(c.color);
    setCourseSemester(c.semester || currentSemester || 5);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !lecturer.trim()) {
      setError('Kode, nama mata kuliah, dan dospem wajib diisi!');
      return;
    }

    if (schedules.length === 0) {
      setError('Pilih minimal satu hari, waktu, dan ruang kelas perkuliahan!');
      return;
    }

    // Validate each schedule row
    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (!s.day) {
        setError(`Hari perkuliahan di baris ke-${i + 1} tidak boleh kosong!`);
        return;
      }
      if (!s.timeStart || !s.timeEnd) {
        setError(`Waktu mulai & selesai di baris ke-${i + 1} harus diisi!`);
        return;
      }
      if (s.timeStart >= s.timeEnd) {
        setError(`Jam mulai harus lebih awal dibanding jam selesai di baris ke-${i + 1}!`);
        return;
      }
      if (!s.room.trim()) {
        setError(`Ruang kelas di baris ke-${i + 1} wajib diisi!`);
        return;
      }
    }

    const firstSched = schedules[0];
    const courseData = {
      code: code.trim(),
      name: name.trim(),
      lecturer: lecturer.trim(),
      // Backward-compatible fields
      room: firstSched.room.trim(),
      day: firstSched.day,
      days: schedules.map(s => s.day),
      timeStart: firstSched.timeStart,
      timeEnd: firstSched.timeEnd,
      color: selectedColor,
      semester: courseSemester,
      sks: editingCourse ? (editingCourse.sks !== undefined ? editingCourse.sks : 3) : 3,
      grade: editingCourse ? (editingCourse.grade || '-') : '-',
      schedules: schedules.map(s => ({
        ...s,
        room: s.room.trim()
      }))
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-805 pb-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /> Manajemen Mata Kuliah
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Lihat, tambahkan, dan perbarui kurikulum mata kuliah aktif beserta jadwal perkuliahannya.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-4 py-2.5 text-xs sm:text-sm font-bold shadow-2xs transition-all hover:bg-indigo-100 dark:hover:bg-indigo-950/60 active:scale-95 cursor-pointer leading-none"
            id="btn-add-course-ai"
          >
            Impor Jadwal
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 cursor-pointer leading-none"
            id="btn-add-course-main"
          >
            <Plus className="h-4.5 w-4.5" /> Tambah Mata Kuliah
          </button>
        </div>
      </div>

      {/* Semester Filter Tabs */}
      {courses.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs" id="semester-tabs-container">
          <div className="flex flex-wrap gap-1.5 items-center font-sans">
            <button
              onClick={() => setSelectedSemFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSemFilter === 'all'
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-sm shadow-indigo-100/10'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Semua Semester
            </button>
            
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-750 mx-1 hidden sm:block"></div>

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
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100/15'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-705 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>Sem {sem}</span>
                  {semCoursesCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-405 border border-slate-200 dark:border-slate-605'
                    }`}>
                      {semCoursesCount}
                    </span>
                  )}
                  {isCurrent && (
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${
                      isActive ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/40'
                    }`}>
                      Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 md:mr-2">
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
                className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden group border-t-4"
                style={{ borderTopColor: preset.rawHex || '#6366f1' }} 
                id={`course-card-${c.id}`}
              >
                {/* Visual Accent Corner Ribbon */}
                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-transparent to-slate-50 dark:to-slate-950/20 rounded-bl-full pointer-events-none"></div>

                <div className="space-y-4">
                  {/* Card Badge & Code Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1.5 items-center">
                      <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${preset.badgeBg}`}>
                        {c.code}
                      </span>
                      <span className="inline-block text-[10px] font-extrabold tracking-wider bg-slate-105 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-full">
                        Sem {c.semester || 5}
                      </span>
                    </div>
                    
                    {/* Action buttons panel */}
                    <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shortcut-btn transition cursor-pointer"
                        title="Edit Mata Kuliah"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-405 shortcut-btn transition cursor-pointer"
                        title="Hapus Mata Kuliah"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title and Lecturer */}
                  <div>
                    <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition duration-150 leading-snug">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                      <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-550 shrink-0" />
                      <span className="truncate">{c.lecturer}</span>
                    </div>
                  </div>

                  {/* Date, Location and Room Details */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Jadwal Sesi Kuliah:</div>
                    <div className="space-y-1.5">
                      {(c.schedules && c.schedules.length > 0
                        ? c.schedules
                        : [{ id: 'legacy', day: c.day || 'Senin', timeStart: c.timeStart || '08:00', timeEnd: c.timeEnd || '09:40', room: c.room || 'Luring/Daring' }]
                      ).map((sch, sIdx) => (
                        <div key={sch.id || sIdx} className="bg-slate-50/60 dark:bg-slate-950/30 rounded-xl border border-slate-100/70 dark:border-slate-800/60 p-2 space-y-1 sm:space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                              {sch.day}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] shadow-3xs">
                              <Clock className="h-3 w-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
                              {sch.timeStart} - {sch.timeEnd}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate">{sch.room}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Task Stats Pill */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 font-semibold">
                    <CheckSquare className="h-3.5 w-3.5 text-slate-400 dark:text-slate-550 font-bold" />
                    <span>Tugas: <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{courseTasks.length}</strong></span>
                  </div>

                  {activeTasks.length > 0 ? (
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 px-2 py-0.5 rounded-full">
                      {activeTasks.length} Berlangsung
                    </span>
                  ) : courseTasks.length > 0 ? (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 px-2 py-0.5 rounded-full">
                      Semua Selesai ✨
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-850 border border-slate-205 dark:border-slate-700 px-2 py-0.5 rounded-full">
                      Belum Ada Tugas
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-205 dark:border-slate-800 w-full" id="empty-semester-courses">
          <div className="rounded-full bg-indigo-50 dark:bg-slate-800 p-4 text-indigo-500 dark:text-indigo-400 mb-3">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-base">Semester {selectedSemFilter} Kosong</h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
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
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800" id="empty-courses">
          <div className="rounded-full bg-indigo-50 dark:bg-slate-800 p-4 text-indigo-500 dark:text-indigo-400 mb-3">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-base">Mata Kuliah Kosong</h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
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
                    onChange={(e) => handleManualNameChange(e.target.value)}
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

              {/* Dynamic Schedules list */}
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[11px] font-extrabold text-indigo-750 uppercase tracking-wide block">Jadwal & Ruang Kelas Perkuliahan <span className="text-red-500">*</span></label>
                  <span className="text-[10px] text-slate-400 block leading-normal mt-0.5">Satu mata kuliah bisa diadakan di beberapa hari dengan waktu dan ruangan yang berbeda.</span>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {schedules.map((sch, index) => (
                    <div key={sch.id} className="relative bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3 shadow-3xs">
                      {schedules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeScheduleRow(sch.id)}
                          className="absolute top-2.5 right-2.5 text-rose-500 hover:text-rose-700 p-1 rounded-lg bg-white border border-slate-200 hover:border-rose-250 transition shadow-2xs cursor-pointer z-10"
                          title="Hapus jadwal ini"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      
                      <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full"></span>
                        Jadwal & Sesi #{index + 1}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Hari <span className="text-red-500">*</span></label>
                          <select
                            value={sch.day}
                            onChange={(e) => updateScheduleRow(sch.id, 'day', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:outline-none p-2 text-xs font-bold bg-white cursor-pointer"
                          >
                            {DAYS_OF_WEEK.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Kelas / Ruangan <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ruang 402, Lab Komp A"
                            value={sch.room}
                            onChange={(e) => updateScheduleRow(sch.id, 'room', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:outline-none p-2 text-xs font-medium"
                            maxLength={40}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Waktu Mulai <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            required
                            value={sch.timeStart}
                            onChange={(e) => updateScheduleRow(sch.id, 'timeStart', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:outline-none p-2 text-xs font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Waktu Selesai <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            required
                            value={sch.timeEnd}
                            onChange={(e) => updateScheduleRow(sch.id, 'timeEnd', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white hover:border-slate-350 focus:border-indigo-500 focus:outline-none p-2 text-xs font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addScheduleRow}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300 text-indigo-650 hover:text-indigo-700 transition p-2.5 text-xs font-bold cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Tambah Hari & Ruangan Lain
                </button>
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
            <p className="text-xs text-slate-500 leading-relaxed border-b border-slate-100 pb-2">
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

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-150">
              <div className="flex items-center gap-2.5 text-indigo-700">
                <div className="p-1.5 bg-indigo-50 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm sm:text-base">Impor Jadwal Kuliah</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-semibold leading-none mt-0.5">Unggah screenshot jadwal perkuliahan Anda untuk sinkronisasi otomatis</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadFile(null);
                  setUploadPreview(null);
                  setParsedCourses([]);
                  setAnalyzerError(null);
                }}
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Message */}
            {analyzerError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-100">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Gagal memproses:</span> {analyzerError}
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {parsedCourses.length === 0 ? (
                <>
                  {/* File Upload Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('ai-file-upload-input')?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : uploadPreview
                        ? 'border-slate-200 bg-slate-50/50'
                        : 'border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/50'
                    }`}
                  >
                    <input
                      id="ai-file-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {uploadPreview ? (
                      <div className="relative w-full max-w-xs aspect-video rounded-xl border overflow-hidden shadow-xs shrink-0 max-h-[140px]" onClick={(e) => e.stopPropagation()}>
                        <img src={uploadPreview} alt="Screenshot Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setUploadFile(null);
                            setUploadPreview(null);
                            setAnalyzerError(null);
                          }}
                          className="absolute top-1.5 right-1.5 h-6 w-6 bg-slate-900/70 hover:bg-slate-900/90 rounded-full text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                          <Upload className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          {isDragging ? 'Lepas berkas untuk mengunggah' : 'Pilih atau Seret screenshot jadwal di sini'}
                        </p>
                        <p className="text-[10px] text-slate-450 mt-1">Mendukung format PNG, JPG, JPEG ukuran hingga 10MB</p>
                      </>
                    )}
                  </div>


                </>
              ) : (
                /* Parsed Results List */
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold text-slate-805">Mata Kuliah Terdeteksi ({parsedCourses.length} MK):</span>
                    <button
                      type="button"
                      onClick={toggleSelectAllParsed}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-805 cursor-pointer"
                    >
                      {parsedCourses.every((_, idx) => selectedParsedIndexes[idx]) ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {parsedCourses.map((c, idx) => {
                      const selected = selectedParsedIndexes[idx] || false;
                      const presetOfCourse = COLOR_PRESETS[c.color] || COLOR_PRESETS.blue;
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleSelectParsedIndex(idx)}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            selected
                              ? 'border-indigo-200 bg-indigo-50/20 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            <div className={`h-4.5 w-4.5 rounded flex items-center justify-center border transition-all ${
                              selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-400 bg-white'
                            }`}>
                              {selected && <Check className="h-3 w-3 stroke-[3px]" />}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${presetOfCourse.badgeBg}`}>
                                {c.code}
                              </span>
                              <span className="text-xs font-black text-slate-800 leading-tight truncate">{c.name}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500 font-semibold">
                              <div className="flex items-center gap-1 leading-none truncate">
                                <User className="h-3.5 w-3.5 text-slate-450 shrink-0" /> {c.lecturer || 'Dosen tidak tertera'}
                              </div>
                              <div className="flex items-center gap-1 leading-none truncate">
                                <Calendar className="h-3.5 w-3.5 text-slate-450 shrink-0" /> {c.day}, {c.timeStart}-{c.timeEnd}
                              </div>
                              <div className="flex items-center gap-1 leading-none truncate">
                                <MapPin className="h-3.5 w-3.5 text-slate-455 shrink-0" /> {c.room || 'TBA'}
                              </div>
                              <div className="flex items-center gap-1 leading-none" onClick={(e) => e.stopPropagation()}>
                                <BookOpen className="h-3.5 w-3.5 text-slate-455 shrink-0 mr-1" /> {c.sks} SKS, 
                                <span className="ml-1.5 text-slate-400">Sem:</span>
                                <select
                                  value={c.semester}
                                  onChange={(e) => handleModifyParsedCourseSemester(idx, parseInt(e.target.value, 10))}
                                  className="ml-1 bg-slate-150 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded px-1.5 py-0.5 text-[9px] font-black text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8].map(semNum => (
                                    <option key={semNum} value={semNum}>{semNum}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-150 flex items-center justify-between">
              {parsedCourses.length === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setUploadFile(null);
                      setUploadPreview(null);
                      setParsedCourses([]);
                      setAnalyzerError(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!uploadPreview || isAnalyzing}
                    onClick={handleAnalyzeScreenshot}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 disabled:bg-indigo-305 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memproses...
                      </>
                    ) : (
                      <span>Proses Jadwal</span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedCourses([]);
                      setAnalyzerError(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Ulangi Unggah
                  </button>
                  <button
                    type="button"
                    onClick={handleImportSelected}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Impor Terpilih ({parsedCourses.filter((_, idx) => selectedParsedIndexes[idx]).length} MK)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
