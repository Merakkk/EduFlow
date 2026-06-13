import React, { useState } from 'react';
import { Course, Task } from '../types';
import { COLOR_PRESETS } from '../data/initialData';
import { formatIndonesianShortDate, getDeadlineAlert } from '../utils/dateHelpers';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X,
  Plus,
  Trash2
} from 'lucide-react';

interface KalenderProps {
  courses: Course[];
  tasks: Task[];
  todayStr: string;
  onNavigateToTasks: () => void;
  onQuickToggleTaskStatus: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function Kalender({
  courses,
  tasks,
  todayStr,
  onNavigateToTasks,
  onQuickToggleTaskStatus,
  onDeleteTask
}: KalenderProps) {
  // Extract year and month from operating date string ("2026-06-13")
  const defaultDate = new Date(todayStr);
  const [currentYear, setCurrentYear] = useState(defaultDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(defaultDate.getMonth()); // 0-indexed: 5 = Juni

  // Day list labels
  const indonesianDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const indonesianMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Selected day task drawer state
  const [selectedDayTasks, setSelectedDayTasks] = useState<{ dayStr: string; tasks: Task[] } | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedDayTasks(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedDayTasks(null);
  };

  // Calendar Calculation Logic
  // Days in current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Day of week of the 1st day of the month
  // We want Monday (1) to be the first column instead of Sunday (0)
  const getFirstDayOfMonthIndex = (year: number, month: number) => {
    const rawIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    // Adjust Sun(0) -> index 6, Mon(1) -> index 0, Tue(2) -> index 1 etc.
    return rawIndex === 0 ? 6 : rawIndex - 1;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonthIndex(currentYear, currentMonth);

  // Collect previous month overlapping days
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonthIndex);

  const calendarCells: { day: number; month: 'prev' | 'current' | 'next'; dateString: string }[] = [];

  // 1. Fill previous month overlaps
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const mStr = String(prevMonthIndex + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    calendarCells.push({
      day: dayNum,
      month: 'prev',
      dateString: `${prevMonthYear}-${mStr}-${dStr}`
    });
  }

  // 2. Fill current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    calendarCells.push({
      day: d,
      month: 'current',
      dateString: `${currentYear}-${mStr}-${dStr}`
    });
  }

  // 3. Fill next month overlaps until 42 cells are completed (6 full weeks grid)
  const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  let nextDayFill = 1;
  while (calendarCells.length < 42) {
    const mStr = String(nextMonthIndex + 1).padStart(2, '0');
    const dStr = String(nextDayFill).padStart(2, '0');
    calendarCells.push({
      day: nextDayFill,
      month: 'next',
      dateString: `${nextMonthYear}-${mStr}-${dStr}`
    });
    nextDayFill++;
  }

  // Trigger drawer list when cell is clicked
  const handleCellClick = (dateString: string, dayTasks: Task[]) => {
    if (dayTasks.length > 0) {
      setSelectedDayTasks({ dayStr: dateString, tasks: dayTasks });
    } else {
      setSelectedDayTasks(null);
    }
  };

  return (
    <div className="space-y-6" id="calendar-view">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-indigo-600" /> Kalender Jadwal Deadline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lihat pemetaan seluruh tanggal pengumpulan tugas teroganisir secara bulanan dengan sistem penanda warna.
          </p>
        </div>
      </div>

      {/* Main Grid Card layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6" id="calendar-content-split">
        {/* Calendar Body (Span 3) */}
        <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-2xs" id="calendar-grid-card">
          {/* Calendar Controller Header */}
          <div className="flex items-center justify-between border-b border-slate-105 pb-4">
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {indonesianMonths[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="h-4.5 w-4.5 text-slate-600 font-bold" />
              </button>
              <button
                onClick={() => {
                  const now = new Date(todayStr);
                  setCurrentYear(now.getFullYear());
                  setCurrentMonth(now.getMonth());
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600 cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="h-4.5 w-4.5 text-slate-600 font-bold" />
              </button>
            </div>
          </div>

          {/* Calendar Grid Table format */}
          <div className="space-y-2">
            {/* Days row header */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1">
              {indonesianDays.map(day => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days cells layout */}
            <div className="grid grid-cols-7 border-t border-l border-slate-150 rounded-xl overflow-hidden shadow-2xs">
              {calendarCells.map((cell, index) => {
                // Find deadlines matching this cell date string
                const cellTasks = tasks.filter((t) => t.deadline === cell.dateString);
                
                const isSelectedCurrent = cell.month === 'current';
                const isToday = cell.dateString === todayStr;

                return (
                  <div
                    key={`${cell.dateString}-${index}`}
                    onClick={() => handleCellClick(cell.dateString, cellTasks)}
                    className={`min-h-[92px] p-2 border-r border-b border-slate-100 flex flex-col justify-between transition-colors relative cursor-pointer group ${
                      !isSelectedCurrent ? 'bg-slate-50/50 text-slate-400' : 'bg-white'
                    } ${isToday ? 'bg-indigo-50/15 font-bold' : ''} hover:bg-slate-50/50`}
                  >
                    {/* Day number with 'today' highlights */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center justify-center h-5 w-5 text-xs font-bold rounded-full transition ${
                          isToday
                            ? 'bg-indigo-650 text-white shadow-sm font-extrabold'
                            : isSelectedCurrent ? 'text-slate-900 group-hover:text-indigo-600' : 'text-slate-400'
                        }`}
                      >
                        {cell.day}
                      </span>
                      {cellTasks.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-550 xl:hidden"></span>
                      )}
                    </div>

                    {/* Task Pills inside Calendar (only visible in full widths / desktop layouts) */}
                    <div className="hidden xl:flex flex-col gap-1 mt-1.5 max-h-[64px] overflow-y-auto overflow-x-hidden">
                      {cellTasks.slice(0, 3).map((t) => {
                        const course = courses.find(c => c.id === t.courseId);
                        const preset = course ? COLOR_PRESETS[course.color] : COLOR_PRESETS.blue;

                        return (
                          <div
                            key={t.id}
                            title={`${course?.code || 'Tugas'}: ${t.title}`}
                            className={`text-[9px] font-bold truncate rounded px-1.5 py-0.5 border leading-tight ${
                              t.status === 'Selesai'
                                ? 'bg-slate-100 text-slate-400 border-slate-200 line-through font-medium'
                                : `${preset.bg} ${preset.text} ${preset.border}`
                            }`}
                          >
                            {t.title}
                          </div>
                        );
                      })}
                      {cellTasks.length > 3 && (
                        <div className="text-[8px] text-indigo-600 bg-indigo-50/40 py-0.5 rounded text-center font-bold uppercase tracking-wider">
                          +{cellTasks.length - 3} Lainnya
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Legend Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-4 border-t border-slate-100 text-xs text-slate-500 font-bold">
            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Aksen Warna MK:</span>
            {courses.length > 0 ? (
              courses.slice(0, 5).map(c => {
                const p = COLOR_PRESETS[c.color] || COLOR_PRESETS.blue;
                return (
                  <span key={c.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                    <span className={`h-2.2 w-2.2 rounded-full ${p.dot}`}></span>
                    <span className="text-slate-700">{c.name}</span>
                  </span>
                );
              })
            ) : (
              <span className="text-slate-400 font-medium">Belum mendaftarkan matakuliah warna.</span>
            )}
          </div>
        </div>

        {/* Selected Date Detail Drawer Panel (Span 1) */}
        <div className="xl:col-span-1" id="calendar-drawer-space">
          {selectedDayTasks ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs animate-in slide-in-from-right-4 duration-200" id="calendar-day-drawer">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm tracking-tight">
                    Tugas Akhir Tanggal
                  </h3>
                  <p className="text-xs text-indigo-600 font-bold mt-0.5 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                    {formatIndonesianShortDate(selectedDayTasks.dayStr)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayTasks(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-705 transition cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Tasks List aligned */}
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1" id="drawer-tasks-list">
                {selectedDayTasks.tasks.map((t) => {
                  const course = courses.find(c => c.id === t.courseId);
                  const alert = getDeadlineAlert(t.deadline, todayStr, t.status);

                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-100/10 shadow-3xs space-y-2.5 group hover:border-slate-300 transition duration-150"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {course && (
                          <span className="text-[9px] uppercase font-bold tracking-tight text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                            {course.code}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded border ${
                            t.priority === 'Tinggi' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            t.priority === 'Sedang' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                            {t.priority}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTaskToDelete({ id: t.id, title: t.title });
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-55 hover:text-rose-700 transition cursor-pointer"
                            title="Hapus Tugas"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className={`text-xs font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition ${t.status === 'Selesai' ? 'line-through text-slate-400' : ''}`}>
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{t.description}</p>

                      {/* Complete status buttons */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                          t.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {t.status}
                        </span>
                        
                        {t.status !== 'Selesai' ? (
                          <button
                            onClick={() => {
                              onQuickToggleTaskStatus(t.id);
                              // Update selected tasks in state immediately
                              setSelectedDayTasks(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  tasks: prev.tasks.map(item => item.id === t.id ? { ...item, status: 'Selesai' as const } : item)
                                };
                              });
                            }}
                            className="text-[10px] font-extrabold text-emerald-600 hover:text-emerald-800 transition cursor-pointer"
                          >
                            Selesaikan &rarr;
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onQuickToggleTaskStatus(t.id);
                              // Re-open in state
                              setSelectedDayTasks(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  tasks: prev.tasks.map(item => item.id === t.id ? { ...item, status: 'Belum Mulai' as const } : item)
                                };
                              });
                            }}
                            className="text-[10px] text-slate-400 hover:text-indigo-650 font-bold cursor-pointer"
                          >
                            Buka Lagi
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-205 bg-slate-50/50 p-5 text-center flex flex-col items-center justify-center min-h-[180px] h-full" id="calendar-drawer-empty">
              <div className="rounded-full bg-indigo-50 p-3 text-indigo-500 mb-2">
                <Info className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Detail Deadline</h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                Klik salah satu tanggal pada kalender yang memiliki indikator tugas untuk melihat detail rincian tugas pengerjaan di panel ini.
              </p>
            </div>
          )}
        </div>
      </div>

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
              Apakah Anda yakin ingin menghapus tugas <strong>{taskToDelete.title}</strong>?
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
                  // Remove from active drawer immediately
                  setSelectedDayTasks(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      tasks: prev.tasks.filter(item => item.id !== taskToDelete.id)
                    };
                  });
                  setTaskToDelete(null);
                }}
                className="rounded-lg bg-rose-650 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition cursor-pointer animate-in zoom-in-50 duration-75"
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
