import React, { useState } from 'react';
import { Course, Task } from '../types';
import { COLOR_PRESETS } from '../data/initialData';
import { getDeadlineAlert, formatIndonesianShortDate, getDayDifference } from '../utils/dateHelpers';
import { 
  Bell, 
  CheckCircle, 
  Activity, 
  Calendar,
  Sparkles,
  User,
  GraduationCap
} from 'lucide-react';

interface HeaderProps {
  courses: Course[];
  tasks: Task[];
  todayStr: string;
  onQuickToggleTaskStatus: (taskId: string) => void;
  onSetSimulationDate: (newDate: string) => void;
  isCloudSynced?: boolean;
  syncError?: string | null;
}

export default function Header({
  courses,
  tasks,
  todayStr,
  onQuickToggleTaskStatus,
  onSetSimulationDate,
  isCloudSynced = false,
  syncError = null
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter tasks with H-1, H-3, H-7 alerts
  const alertTasks = tasks
    .filter(t => t.status !== 'Selesai')
    .map(t => {
      const course = courses.find(c => c.id === t.courseId);
      const alert = getDeadlineAlert(t.deadline, todayStr, t.status);
      return { t, course, alert };
    })
    .filter(item => item.alert !== null)
    .sort((a, b) => {
      const diffA = getDayDifference(a.t.deadline, todayStr);
      const diffB = getDayDifference(b.t.deadline, todayStr);
      return diffA - diffB;
    });

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-150 p-4 sm:px-6 flex items-center justify-between h-20" id="app-header">
      {/* Brand Logo & Motto / Welcome Greeting */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-slate-900 text-sm sm:text-base tracking-tight leading-tight flex items-center gap-1">
            EduFlow
          </h2>
          <p className="text-[10.5px] text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap">
            <span>Selamat datang kembali, Helris</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            {isCloudSynced ? (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border border-emerald-100">
                ● Terhubung Live
              </span>
            ) : syncError ? (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border border-amber-200" title={syncError}>
                ⚠️ Mode Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-full text-[9px] font-bold border border-slate-200">
                ● Menghubungkan...
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Simulation Date Picker (Aesthetic & highly functional) */}
        <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-650 font-bold shadow-2xs">
          <Calendar className="h-4 w-4 text-indigo-600" />
          <span className="text-[11px]">Tanggal:</span>
          <input
            type="date"
            value={todayStr}
            onChange={(e) => onSetSimulationDate(e.target.value)}
            className="border-none bg-transparent font-mono p-0 focus:outline-none text-indigo-700 cursor-pointer text-[11px] font-bold"
            title="Ubah tanggal penanggalan untuk mensimulasikan alarm deadline H-1, H-3, atau H-7"
          />
        </div>

        {/* Notifikasi Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative rounded-xl border p-2 text-slate-650 transition ${
              isOpen ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
            id="notification-bell-btn"
          >
            <Bell className="h-5 w-5" />
            {alertTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white animate-bounce shadow-md">
                {alertTasks.length}
              </span>
            )}
          </button>

          {/* Alert Dropdown Drawer Pane */}
          {isOpen && (
            <>
              {/* Backscreen close layer */}
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>

              <div className="absolute right-0 mt-2.5 w-80 sm:w-85 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150" id="notification-pane">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-display font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <Activity className="h-4 w-4 text-indigo-605" /> Sinyal Alarm Deadline
                  </h3>
                  <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 border border-indigo-100">
                    {alertTasks.length} Aktif
                  </span>
                </div>

                {/* Alarm Feed */}
                <div className="mt-3 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {alertTasks.length > 0 ? (
                    alertTasks.map(({ t, course, alert }) => {
                      const colorPreset = course ? COLOR_PRESETS[course.color] : COLOR_PRESETS.blue;

                      // Banner class helper
                      let alertColorClasses = 'border-l-indigo-400 bg-slate-50 text-slate-800';
                      if (alert?.type === 'danger') {
                        alertColorClasses = 'border-l-rose-500 bg-rose-50/40 text-rose-900 border-rose-100';
                      } else if (alert?.type === 'warning') {
                        alertColorClasses = 'border-l-amber-500 bg-amber-50/40 text-amber-900 border-amber-100';
                      }

                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl border border-slate-100 border-l-4 ${alertColorClasses} flex flex-col gap-2`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              {course && (
                                <span className={`text-[9px] uppercase font-extrabold tracking-tight px-1.5 py-0.5 rounded border ${colorPreset?.bg} ${colorPreset?.border} ${colorPreset?.text}`}>
                                  {course.name}
                                </span>
                              )}
                              <span className="text-[9px] font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-white border border-slate-100">
                                {alert?.text}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 leading-tight">
                              {t.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-semibold">
                              Batas: {formatIndonesianShortDate(t.deadline)}
                            </p>
                          </div>

                          <div className="flex items-center justify-end border-t border-slate-150/50 pt-2">
                            <button
                              onClick={() => {
                                onQuickToggleTaskStatus(t.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700 shadow-2xs border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                            >
                              <CheckCircle className="h-3 w-3 text-emerald-500" /> Selesai
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <div className="rounded-full bg-emerald-50 p-2 text-emerald-600 mb-1.5">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">Bebas Hambatan</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] leading-relaxed">
                        Semua tugas bebas dari batas alarm H-1, H-3, atau H-7 Anda!
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-3.5 border-t border-slate-100 pt-2.5 text-center">
                  <p className="text-[9px] text-slate-400 font-medium leading-tight">
                    *Alarm terpicu otomatis pada tugas berstatus "Belum Mulai" atau "Proses".
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Card placeholder (highly professional layout detail) */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4 py-1">
          <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 text-xs shadow-3xs" id="profile-bubble">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:block text-left">
            <h4 className="text-xs font-bold text-slate-900 leading-tight">Helris</h4>
            <span className="text-[9px] text-slate-400 font-semibold">NIM: 255150201111048</span>
          </div>
        </div>
      </div>
    </header>
  );
}
