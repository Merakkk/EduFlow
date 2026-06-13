import React, { useState } from 'react';
import { Course } from '../types';
import { Award, Layers, Plus, Trash2, CheckCircle, Info, BookOpen, Calculator, X } from 'lucide-react';
import { COLOR_PRESETS } from '../data/initialData';

interface SemesterProps {
  courses: Course[];
  onAddCourse: (course: Omit<Course, 'id'>) => void;
  onEditCourse: (id: string, updated: Partial<Course>) => void;
  onDeleteCourse: (id: string) => void;
  currentSemester: number;
  setCurrentSemester: React.Dispatch<React.SetStateAction<number>>;
  semesterGPAs: Record<number, number>;
  setSemesterGPAs: React.Dispatch<React.SetStateAction<Record<number, number>>>;
}

// Convert letter grade to numerical value based on standard Indonesian universities (e.g., UB)
export const GRADE_VALUES: Record<string, number> = {
  'A': 4.0,
  'B+': 3.5,
  'B': 3.0,
  'C+': 2.5,
  'C': 2.0,
  'D': 1.0,
  'E': 0.0,
};

export const GRADE_LABELS = ['Belum Dinilai', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E'];

export default function Semester({
  courses,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
  currentSemester,
  setCurrentSemester,
  semesterGPAs,
  setSemesterGPAs,
}: SemesterProps) {
  const [selectedSemTab, setSelectedSemTab] = useState<number>(currentSemester);

  // Keep tab selected on current active semester when it loads or changes from Firestore
  React.useEffect(() => {
    setSelectedSemTab(currentSemester);
  }, [currentSemester]);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [semesterToDelete, setSemesterToDelete] = useState<number | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; name: string } | null>(null);

  // Add course modal states
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSks, setNewSks] = useState(3);
  const [newColor, setNewColor] = useState('blue');
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate IPS (Indeks Prestasi Semester) for a given semester
  const calculateIPS = (sem: number): { ips: number; autoCalculated: boolean; totalSks: number } => {
    const semCourses = courses.filter(c => (c.semester || currentSemester) === sem);
    
    // Filter courses that have both valid SKS and valid Grades
    const gradedCourses = semCourses.filter(c => c.sks && c.grade && GRADE_VALUES[c.grade] !== undefined);
    
    if (gradedCourses.length > 0) {
      let totalPoints = 0;
      let totalSks = 0;
      gradedCourses.forEach(c => {
        const sksValue = c.sks || 3;
        const gradeWeight = GRADE_VALUES[c.grade || 'A'];
        totalPoints += gradeWeight * sksValue;
        totalSks += sksValue;
      });
      return {
        ips: parseFloat((totalPoints / totalSks).toFixed(2)),
        autoCalculated: true,
        totalSks
      };
    }

    // Fall back to manual input or default
    return {
      ips: semesterGPAs[sem] !== undefined ? semesterGPAs[sem] : 0,
      autoCalculated: false,
      totalSks: semCourses.reduce((sum, c) => sum + (c.sks || 3), 0)
    };
  };

  // List of active semesters (from 1 up to the max semester defined or added)
  const existingSemsFromManual = Object.keys(semesterGPAs).map(Number);
  const existingSemsFromCourses = courses.map(c => c.semester || currentSemester);
  const maxSemesterInSystem = Math.max(
    1,
    currentSemester,
    ...existingSemsFromManual,
    ...existingSemsFromCourses
  );

  const semestersList = Array.from({ length: maxSemesterInSystem }, (_, i) => i + 1);

  // Calculate Cumulative IPK
  const allSemesterData = semestersList.map(sem => {
    const calc = calculateIPS(sem);
    return {
      semester: sem,
      ips: calc.ips,
      isGraded: calc.autoCalculated
    };
  });

  // Average of all IPS values below or equal to max semester
  const cumulativeIPK = allSemesterData.length > 0
    ? (allSemesterData.reduce((sum, item) => sum + item.ips, 0) / allSemesterData.length).toFixed(2)
    : "0.00";

  // Handle setting a manual IPS value
  const handleManualIpsChange = (sem: number, val: string) => {
    const parsed = parseFloat(val);
    setSemesterGPAs(prev => ({
      ...prev,
      [sem]: isNaN(parsed) ? 0 : Math.min(4, Math.max(0, parsed))
    }));
  };

  // Handle deleting a semester
  const handleDeleteSemester = (sem: number) => {
    if (sem === 1) {
      alert('Semester 1 adalah semester minimum yang harus ada di sistem.');
      return;
    }
    setSemesterToDelete(sem);
  };

  const handleConfirmDeleteSemester = () => {
    if (semesterToDelete === null) return;
    const sem = semesterToDelete;
    const semCourses = courses.filter(c => (c.semester || currentSemester) === sem);

    // 1. Delete manual GPA entry
    setSemesterGPAs(prev => {
      const next = { ...prev };
      delete next[sem];
      return next;
    });

    // 2. Delete courses assigned to this semester if any
    if (semCourses.length > 0) {
      semCourses.forEach(c => {
        onDeleteCourse(c.id);
      });
    }

    // 3. Adjust currentSemester if we deleted the current semester
    if (currentSemester === sem) {
      setCurrentSemester(Math.max(1, sem - 1));
    }

    // 4. Change active selected tab
    setSelectedSemTab(Math.max(1, sem - 1));
    setSemesterToDelete(null);
  };

  // Handle adding a course specifically inside this semester view
  const handleAddCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      setErrorMsg('Kode dan Nama Mata Kuliah wajib diisi!');
      return;
    }

    onAddCourse({
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      lecturer: 'Dosen Pembimbing',
      room: 'Luring/Daring',
      day: 'Senin',
      timeStart: '08:00',
      timeEnd: '09:40',
      color: newColor,
      semester: selectedSemTab,
      sks: newSks,
      grade: '-'
    });

    // Reset fields
    setNewCode('');
    setNewName('');
    setNewSks(3);
    setNewColor('blue');
    setErrorMsg('');
    setIsAddingCourse(false);
  };

  const selectedSemCalc = calculateIPS(selectedSemTab);
  const selectedSemCourses = courses.filter(c => (c.semester || currentSemester) === selectedSemTab);

  return (
    <div className="space-y-6" id="semester-view-container">
      {/* Detail Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" /> Ringkasan Akademik & Semester
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau IP Kumulatif (IPK) Anda, kelola nilai per mata kuliah (IPS), dan sinkronisasikan target kelulusan kuliah.
          </p>
        </div>
      </div>

      {/* Main Stats Banner Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="semester-bento-stats">
        {/* IPK Score widget */}
        <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-xs border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">Indeks Prestasi Kumulatif</span>
            <Award className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="my-3">
            <span className="text-4xl sm:text-5xl font-black text-emerald-400 font-mono tracking-tight">{cumulativeIPK}</span>
            <span className="text-xs text-slate-400 ml-2 font-medium">/ 4.00</span>
          </div>
          <p className="text-xs text-slate-400">
            Dihitung otomatis dari rata-rata IPS Semester 1 sampai Semester {maxSemesterInSystem}.
          </p>
        </div>

        {/* Current Active Semester Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Semester Aktif Sekarang</span>
            <CheckCircle className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display">Semester {currentSemester}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 p-1.5 rounded-lg">
            <button
              onClick={() => setCurrentSemester(prev => Math.max(1, prev - 1))}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            >
              -
            </button>
            <span className="flex-1 text-center text-xs font-bold text-indigo-700">Ubah Semester</span>
            <button
              onClick={() => setCurrentSemester(prev => Math.min(10, prev + 1))}
              className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-200 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Dynamic GPA SKS Calculator summary */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total SKS Terkelola</span>
            <Calculator className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-800 font-mono">
              {courses.reduce((sum, c) => sum + (c.sks || 3), 0)}
            </span>
            <span className="text-xs text-slate-500 ml-1 font-bold">SKS</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            SKS digunakan sebagai penentu beban nilai bobot IPS terhitung berdasarkan standard universitas.
          </p>
        </div>
      </div>

      {/* Main split row layouts */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6" id="semester-detail-split">
        {/* Left Column: List of Semesters (Col Span 1) */}
        <div className="xl:col-span-1 space-y-3">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Pilih Semester:</h3>
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
            {semestersList.map(sem => {
              const semCalc = calculateIPS(sem);
              const isActive = selectedSemTab === sem;
              const isCurrent = currentSemester === sem;

              return (
                <button
                  key={sem}
                  onClick={() => setSelectedSemTab(sem)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all relative ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-white border-slate-200 hover:border-slate-350 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black">Semester {sem}</span>
                    {isCurrent && (
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${
                        isActive ? 'bg-indigo-850 text-indigo-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        Aktif
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className={`text-base font-extrabold font-mono ${isActive ? 'text-emerald-300' : 'text-indigo-600'}`}>
                      {semCalc.ips.toFixed(2)}
                    </span>
                    <span className={`text-[9px] ${isActive ? 'text-slate-200' : 'text-slate-400'} font-semibold`}>
                      IPS {semCalc.autoCalculated ? '(Kalkulasi)' : '(Manual)'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              const nextSemNum = maxSemesterInSystem + 1;
              setSemesterGPAs(prev => ({
                ...prev,
                [nextSemNum]: 3.50
              }));
              setSelectedSemTab(nextSemNum);
            }}
            className="w-full text-center py-2.5 rounded-xl border border-dashed border-slate-350 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 text-xs font-bold text-slate-600 transition cursor-pointer"
          >
            + Tambah Semester Baru
          </button>
        </div>

        {/* Right Column: Tab View of Selected Semester's courses & grades (Col Span 3) */}
        <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6 shadow-2xs" id="semester-detail-panel">
          {/* Panel Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-lg font-extrabold text-slate-930 tracking-tight">
                Rincian Semester {selectedSemTab}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                {selectedSemCalc.autoCalculated ? (
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block text-[10px]">
                    Kalkulasi Otomatis Aktif
                  </span>
                ) : (
                  <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block text-[10px]">
                    Input Manual / Kosong (Belum ada nilai terinput)
                  </span>
                )}
                <span>Jumlah MK: {selectedSemCourses.length} • {selectedSemCalc.totalSks} SKS</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsAddingCourse(!isAddingCourse)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-xs font-bold text-indigo-700 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Tambah Mata Kuliah Baru
              </button>

              {selectedSemTab > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteSemester(selectedSemTab)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-250 text-xs font-bold text-rose-700 transition cursor-pointer"
                  title="Hapus Semester Ini"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" /> Hapus Semester
                </button>
              )}
            </div>
          </div>

          {/* Form to insert quick course into this semester */}
          {isAddingCourse && (
            <form onSubmit={handleAddCourseSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Tambah Mata Kuliah Ke Semester {selectedSemTab}</span>
                <button
                  type="button"
                  onClick={() => setIsAddingCourse(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded p-2 font-bold">{errorMsg}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 block mb-1">Kode MK</label>
                  <input
                    type="text"
                    placeholder="IF-301"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                    maxLength={12}
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 block mb-1">Nama Mata Kuliah</label>
                  <input
                    type="text"
                    placeholder="Rekayasa Perangkat Lunak"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                    maxLength={60}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 block mb-1">SKS</label>
                  <select
                    value={newSks}
                    onChange={(e) => setNewSks(parseInt(e.target.value, 10))}
                    className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} SKS</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 block mb-1">Warna Akses</label>
                  <select
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                  >
                    {Object.keys(COLOR_PRESETS).map(colorKey => (
                      <option key={colorKey} value={colorKey}>
                        {colorKey.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingCourse(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow"
                >
                  Tambah & Simpan
                </button>
              </div>
            </form>
          )}

          {/* Manual Input Panel when no courses are added */}
          {!selectedSemCalc.autoCalculated && (
            <div className="p-4 rounded-xl border border-dashed border-indigo-150 bg-indigo-50/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-indigo-500 shrink-0" /> Ubah Nilai IPS Semester Manual
                </h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Anda belum memasukkan mata kuliah dan nilai untuk semester {selectedSemTab}. Masukkan indeks prestasi secara manual untuk kalkulasi cepat, atau daftarkan mata kuliah semester ini di atas.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-600 font-bold">IPS Manual:</span>
                <input
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  placeholder="0.00"
                  value={semesterGPAs[selectedSemTab] !== undefined ? semesterGPAs[selectedSemTab] : ''}
                  onChange={(e) => handleManualIpsChange(selectedSemTab, e.target.value)}
                  className="w-20 bg-white border border-slate-250 rounded-lg px-2 py-1.5 text-center text-xs text-indigo-750 font-bold font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Table list of courses for the selected semester */}
          <div className="space-y-3.5">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Daftar Mata Kuliah Semester {selectedSemTab}:</h3>
            
            {selectedSemCourses.length > 0 ? (
              <div className="border border-slate-150 rounded-xl overflow-hidden shadow-3xs" id="semester-courses-table">
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-12 bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider px-4 py-2.5 border-b border-slate-150">
                  <div className="col-span-2">Kode</div>
                  <div className="col-span-4">Mata Kuliah</div>
                  <div className="col-span-2 text-center">SKS</div>
                  <div className="col-span-3 text-center">Nilai Kuliah</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-slate-100">
                  {selectedSemCourses.map(c => {
                    const preset = COLOR_PRESETS[c.color] || COLOR_PRESETS.blue;
                    return (
                      <div key={c.id} className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-0 px-4 py-3 bg-white hover:bg-slate-50/50 transition">
                        {/* Course Code info */}
                        <div className="col-span-2 font-mono text-xs font-bold">
                          <span className={`inline-block px-2 py-0.5 rounded ${preset.badgeBg} text-[9.5px]`}>
                            {c.code}
                          </span>
                        </div>

                        {/* Course Name */}
                        <div className="col-span-4 text-xs font-bold text-slate-800">
                          {c.name}
                        </div>

                        {/* SKS Selector inline */}
                        <div className="col-span-2 text-center flex items-center justify-between sm:justify-center gap-1 text-xs">
                          <span className="sm:hidden text-slate-400">SKS:</span>
                          <select
                            value={c.sks || 3}
                            onChange={(e) => {
                              onEditCourse(c.id, { sks: parseInt(e.target.value, 10) });
                            }}
                            className="bg-white border border-slate-200 rounded px-2 py-1 font-semibold text-slate-700 text-xs focus:outline-none focus:border-indigo-505 font-mono"
                          >
                            {[1, 2, 3, 4, 5, 6].map(val => (
                              <option key={val} value={val}>{val} SKS</option>
                            ))}
                          </select>
                        </div>

                        {/* Grade Letter Dropdown selector */}
                        <div className="col-span-3 text-center flex items-center justify-between sm:justify-center gap-1.5 text-xs">
                          <span className="sm:hidden text-slate-400">Nilai:</span>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={c.grade || '-'}
                              onChange={(e) => {
                                onEditCourse(c.id, { grade: e.target.value });
                              }}
                              className="bg-white border border-slate-205 rounded px-2.5 py-1 text-xs font-black text-indigo-700 focus:outline-none focus:border-indigo-500 font-mono"
                            >
                              <option value="-">- Belum Rilis -</option>
                              {Object.keys(GRADE_VALUES).map(l => (
                                <option key={l} value={l}>
                                  {l} (Bobot: {GRADE_VALUES[l].toFixed(1)})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Actions: delete course from semester */}
                        <div className="col-span-1 text-right flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setCourseToDelete({ id: c.id, name: c.name });
                            }}
                            className="p-1 rounded text-slate-450 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Kuliah"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 bg-slate-50/40 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-2">
                <BookOpen className="h-8 w-8 text-slate-400" />
                <p className="text-xs font-bold text-slate-750">Belum ada mata kuliah di semester {selectedSemTab}</p>
                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                  Silakan tambahkan mata kuliah baru di atas atau pindahkan mata kuliah yang ada di halaman utama 'Mata Kuliah' untuk menghitung IPS Anda secara otomatis.
                </p>
              </div>
            )}
          </div>

          {/* Quick FAQ info tips */}
          <div className="border border-indigo-100 bg-indigo-50/15 rounded-xl p-4 flex gap-3">
            <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-750">Fungsi Bobot Nilai & SKS:</p>
              <p className="leading-relaxed">
                IPS dihitung dengan cara mengalikan bobot nilai huruf dengan jumlah SKS masing-masing mata kuliah, dijumlahkan lalu dibagi total SKS keseluruhan semester tersebut.
              </p>
              <ul className="list-disc pl-4 space-y-0.5 leading-relaxed">
                <li><strong>A</strong> = 4.0</li>
                <li><strong>B+</strong> = 3.5</li>
                <li><strong>B</strong> = 3.0</li>
                <li><strong>C+</strong> = 2.5</li>
                <li><strong>C</strong> = 2.0</li>
                <li><strong>D</strong> = 1.0</li>
                <li><strong>E</strong> = 0.0</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {semesterToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">Hapus Semester {semesterToDelete}</h3>
            </div>
            <div className="text-xs text-slate-500 space-y-2 leading-relaxed">
              <p>Apakah Anda yakin ingin menghapus Semester <strong>{semesterToDelete}</strong>?</p>
              {courses.filter(c => (c.semester || currentSemester) === semesterToDelete).length > 0 && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-lg border border-rose-100 font-semibold text-[11px]">
                  <strong>PERINGATAN:</strong> Semester ini memiliki <strong>{courses.filter(c => (c.semester || currentSemester) === semesterToDelete).length} mata kuliah</strong>. Menghapus semester ini juga akan menghapus mata kuliah tersebut beserta tugas-tugas yang terhubung!
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSemesterToDelete(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSemester}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition cursor-pointer animate-in zoom-in-50 duration-75"
              >
                Hapus Semester
              </button>
            </div>
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
              Hapus <strong>{courseToDelete.name}</strong> dari Semester <strong>{selectedSemTab}</strong>?
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
