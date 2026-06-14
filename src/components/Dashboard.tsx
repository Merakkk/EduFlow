import React, { useState } from 'react';
import { Course, Task } from '../types';
import { COLOR_PRESETS, DAYS_OF_WEEK } from '../data/initialData';
import { formatIndonesianShortDate, getDeadlineAlert, getDayDifference } from '../utils/dateHelpers';
import { 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Clock, 
  GraduationCap, 
  AlertCircle, 
  Plus, 
  Flame, 
  ClipboardList 
} from 'lucide-react';

interface DashboardProps {
  courses: Course[];
  tasks: Task[];
  todayStr: string;
  currentSemester?: number;
  onNavigate: (tab: 'dashboard' | 'courses' | 'tasks' | 'calendar') => void;
  onAddTaskClick: () => void;
  onAddCourseClick: () => void;
  onQuickToggleTaskStatus: (taskId: string) => void;
}

export default function Dashboard({
  courses,
  tasks,
  todayStr,
  currentSemester,
  onNavigate,
  onAddTaskClick,
  onAddCourseClick,
  onQuickToggleTaskStatus
}: DashboardProps) {
  // Get current day name in Indonesian (e.g., "Sabtu")
  const currentDayOfWeekNum = new Date(todayStr).getDay(); // 0 = Minggu, 1 = Senin, ...
  const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayDayName = daysMap[currentDayOfWeekNum];

  const [scheduleDay, setScheduleDay] = useState<string>(
    DAYS_OF_WEEK.includes(todayDayName) ? todayDayName : 'Senin'
  );

  const activeSemester = currentSemester || 5;
  const currentSemCourses = courses.filter(c => (c.semester || activeSemester) === activeSemester);

  // Stats calculation
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'Selesai').length;
  const inProgressTasksCount = tasks.filter(t => t.status === 'Proses').length;
  const pendingTasksCount = tasks.filter(t => t.status === 'Belum Mulai').length;
  const totalActiveTasks = totalTasks - completedTasksCount;
  
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // Filter schedules for selected day and current active semester only, mapping each distinct schedule slot
  const dailySchedules = currentSemCourses.flatMap(c => {
    const schedules = c.schedules && c.schedules.length > 0
      ? c.schedules
      : [{ id: 'legacy-' + c.id, day: c.day || 'Senin', timeStart: c.timeStart || '08:00', timeEnd: c.timeEnd || '09:40', room: c.room || 'Luring/Daring' }];

    return schedules
      .filter(s => s.day === scheduleDay)
      .map(s => ({
        course: c,
        schedule: s
      }));
  }).sort((a, b) => a.schedule.timeStart.localeCompare(b.schedule.timeStart));

  // Filter urgent & H-X notifications for dashboard
  const urgentTasksWithAlerts = tasks
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
      return diffA - diffB; // closest first
    });

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-6 sm:p-8 text-white shadow-md" id="welcome-banner">
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
            <GraduationCap className="h-3.5 w-3.5" /> Portal Mahasiswa Aktif
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Selamat Datang di EduFlow! 
          </h1>
          <p className="text-sm text-indigo-100 leading-relaxed">
            Kelola kuliah, pantau tugas mandiri, dan pastikan tidak ada tugas terlewat dengan notifikasi deadline H-1, H-3, serta H-7 Anda secara instan.
          </p>
          <div className="flex flex-wrap gap-3 pt-3">
            <button
              onClick={onAddTaskClick}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 hover:scale-[1.02] active:scale-95"
              id="quick-add-task-btn"
            >
              <Plus className="h-4 w-4" /> Tambah Tugas Baru
            </button>
            <button
              onClick={onAddCourseClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-[1.02] active:scale-95"
              id="quick-add-course-btn"
            >
              <BookOpen className="h-4 w-4" /> Daftar Mata Kuliah
            </button>
          </div>
        </div>
        {/* Background Decorative Circles */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-violet-400 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 -mb-16 h-48 w-48 rounded-full bg-indigo-300 opacity-15 blur-2xl"></div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        {/* Total Courses */}
        <button 
          onClick={() => onNavigate('courses')}
          className="group block text-left rounded-xl border border-slate-205 bg-white p-5 transition-all duration-200 hover:shadow-sm hover:border-indigo-200 hover:-translate-y-0.5 active:scale-98 cursor-pointer dark:border-slate-800 dark:bg-slate-900"
          id="stat-courses"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mata Kuliah</span>
            <div className="rounded-xl bg-indigo-50 dark:bg-slate-800 p-2 text-indigo-600 dark:text-indigo-400 transition-colors group-hover:bg-indigo-100 dark:group-hover:bg-slate-700">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-display text-slate-950 dark:text-slate-100 tracking-tight">{currentSemCourses.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">Kelas aktif semester ini</p>
        </button>

        {/* Active Tasks */}
        <button 
          onClick={() => onNavigate('tasks')}
          className="group block text-left rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:shadow-sm hover:border-amber-200 hover:-translate-y-0.5 active:scale-98 cursor-pointer dark:bg-slate-900 dark:border-slate-800"
          id="stat-active-tasks"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tugas Aktif</span>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-2 text-amber-600 dark:text-amber-400 transition-colors group-hover:bg-amber-100 dark:hover:bg-slate-800">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-display text-slate-950 dark:text-slate-100 tracking-tight">{totalActiveTasks}</p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
            <span>●</span> {tasks.filter(t => t.priority === 'Tinggi' && t.status !== 'Selesai').length} Prioritas Tinggi
          </p>
        </button>

        {/* Completed Tasks */}
        <button 
          onClick={() => onNavigate('tasks')}
          className="group block text-left rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:shadow-sm hover:border-emerald-200 hover:-translate-y-0.5 active:scale-98 cursor-pointer dark:bg-slate-900 dark:border-slate-800"
          id="stat-completed"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tugas Selesai</span>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-955/20 p-2 text-emerald-600 dark:text-emerald-400 transition-colors group-hover:bg-emerald-100 dark:group-hover:bg-slate-700">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-display text-slate-955 dark:text-slate-100 tracking-tight">{completedTasksCount}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-emerald-605 dark:text-emerald-405 shrink-0">{completionPercentage}%</span>
          </div>
        </button>

        {/* Deadlines this month */}
        <button 
          onClick={() => onNavigate('calendar')}
          className="group block text-left rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:shadow-sm hover:border-indigo-200 hover:-translate-y-0.5 active:scale-98 cursor-pointer dark:bg-slate-900 dark:border-slate-800"
          id="stat-deadlines"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-sans">Total Tugas</span>
            <div className="rounded-xl bg-indigo-50 dark:bg-slate-800 p-2 text-indigo-600 dark:text-indigo-400 transition-colors group-hover:bg-indigo-100 dark:group-hover:bg-slate-700">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-display text-slate-950 dark:text-slate-100 tracking-tight">{totalTasks}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">{inProgressTasksCount} Sedang Berproses</p>
        </button>
      </div>

      {/* Main Content Split: Course Schedule & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" id="dashboard-details">
        {/* Course Schedule (Left Col, 3 span) */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4" id="dashboard-schedule-panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-105 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">Jadwal Kuliah Mingguan</h2>
            </div>
            {/* Quick Day Selector pills */}
            <div className="flex flex-wrap gap-1" id="day-pills">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  onClick={() => setScheduleDay(day)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold tracking-tight border transition-all cursor-pointer ${
                    scheduleDay === day
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-950 dark:border-indigo-750 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule List */}
          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1" id="schedule-list">
            {dailySchedules.length > 0 ? (
              dailySchedules.map(({ course, schedule }) => {
                const preset = COLOR_PRESETS[course.color] || COLOR_PRESETS.blue;
                // Count tasks for this course
                const courseTasks = tasks.filter(t => t.courseId === course.id);
                const activeTasks = courseTasks.filter(t => t.status !== 'Selesai');
                
                return (
                  <div
                    key={`${course.id}-${schedule.id}`}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${preset.bg} ${preset.border} transition-all hover:shadow-2xs`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${preset.badgeBg}`}>
                          {course.code}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{schedule.room}</span>
                      </div>
                      <h3 className={`font-display font-bold text-sm sm:text-base ${preset.text}`}>
                        {course.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dosen: {course.lecturer}</p>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-200/50 dark:border-slate-800/40 pt-2.5 sm:pt-0 gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-705 font-bold shrink-0 shadow-3xs">
                        <Clock className="h-3.5 w-3.5 text-slate-450 dark:text-slate-400" /> {schedule.timeStart} - {schedule.timeEnd}
                      </span>
                      {activeTasks.length > 0 ? (
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 px-2 py-0.5 rounded-full shrink-0">
                          {activeTasks.length} Tugas Pending
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 px-2 py-0.5 rounded-full shrink-0">
                          Bebas Tugas
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-5 text-center bg-slate-50/60 dark:bg-slate-950/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800" id="empty-schedule">
                <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-3 text-slate-400 dark:text-slate-500 mb-2">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak Ada Jadwal Kuliah</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Wah, Anda tidak memiliki jadwal mata kuliah untuk hari {scheduleDay}. Gunakan waktu ini untuk menyelesaikan tugas Anda!
                </p>
                <button
                  onClick={() => onNavigate('courses')}
                  className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-850 transition cursor-pointer"
                >
                  Kelola Mata Kuliah &rarr;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Urgent Deadlines Notifications (Right Col, 2 span) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4" id="dashboard-deadlines-panel">
          <div className="flex items-center justify-between border-b border-slate-105 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500 animate-pulse" />
              <h2 className="font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">Sinyal Urgent & Alarm</h2>
            </div>
            <span className="inline-flex items-center justify-center h-5.5 w-5.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-455 border border-rose-200 dark:border-rose-900/30 text-[10px] font-bold">
              {urgentTasksWithAlerts.length}
            </span>
          </div>

          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
            Daftar tugas yang menyalakan alarm alarm pengumpulan otomatis <strong className="text-rose-605 dark:text-rose-400">H-1</strong>, <strong className="text-amber-500 dark:text-amber-400">H-3</strong>, atau <strong className="text-indigo-600 dark:text-indigo-400">H-7</strong>.
          </p>

          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1" id="notifications-list">
            {urgentTasksWithAlerts.length > 0 ? (
              urgentTasksWithAlerts.map(({ t, course, alert }) => {
                const colorPreset = course ? COLOR_PRESETS[course.color] : COLOR_PRESETS.blue;

                // Determine badge tailwind classes based on alert type
                let badgeClass = 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-150 dark:border-indigo-900/40 font-bold';
                if (alert?.type === 'danger') {
                  badgeClass = 'bg-rose-50 dark:bg-rose-950/25 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40 font-extrabold animate-pulse';
                } else if (alert?.type === 'warning') {
                  badgeClass = 'bg-amber-50 dark:bg-amber-950/25 text-amber-705 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 font-bold';
                }

                return (
                  <div
                    key={t.id}
                    className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-955/40 hover:border-slate-200 dark:hover:border-slate-750 hover:shadow-3xs transition-all duration-250 hover:translate-x-1"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        {course && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase border ${colorPreset?.border} ${colorPreset?.bg} ${colorPreset?.text}`}>
                            {course.name}
                          </span>
                        )}
                        <span className={`text-[9px] border px-2 py-0.5 rounded-md ${badgeClass}`}>
                          {alert?.text}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{t.description}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-2.5 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">
                        Kumpul: <strong className="text-slate-800 dark:text-slate-200 font-bold">{formatIndonesianShortDate(t.deadline)}</strong>
                      </span>
                      <button
                        onClick={() => onQuickToggleTaskStatus(t.id)}
                        className="text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-3xs hover:border-indigo-200 dark:hover:border-indigo-805 cursor-pointer"
                        title="Tandai Selesai"
                      >
                        Tandai Selesai
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-5 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/35 p-3 text-emerald-600 dark:text-emerald-400 mb-2">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Situasi Aman Terkendali!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Hebat! Tidak ada tugas belum selesai yang masuk radar alarm H-1, H-3, atau H-7 Anda saat ini.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
