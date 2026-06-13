import React, { useState, useEffect } from 'react';
import { Course, Task, ActiveTab } from './types';
import { INITIAL_COURSES, INITIAL_TASKS } from './data/initialData';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MataKuliah from './components/MataKuliah';
import Tugas from './components/Tugas';
import Kalender from './components/Kalender';
import Semester from './components/Semester';
import { 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';

import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardList, 
  Calendar, 
  Settings,
  Info,
  RotateCcw,
  Layers
} from 'lucide-react';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Helper to get real local date in YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Date state simulation (initial based on real local date)
  const [simulationDate, setSimulationDate] = useState<string>(() => {
    return getTodayDateString();
  });

  // GPA / IPK dynamic state
  const [semesterGPAs, setSemesterGPAs] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('rancang_belajar_semester_gpas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn("localStorage fallback semesterGPAs corrupted", e);
    }
    return { 1: 3.75, 2: 3.80, 3: 3.85, 4: 3.90, 5: 3.82 };
  });

  const [currentSemester, setCurrentSemester] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rancang_belajar_current_semester');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1) return parsed;
      }
    } catch (e) {
      console.warn("localStorage fallback currentSemester corrupted", e);
    }
    return 5;
  });

  // Load state from localStorage with fallback to initial data
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem('rancang_belajar_courses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("localStorage fallback key corrupted", e);
    }
    return INITIAL_COURSES;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('rancang_belajar_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("localStorage fallback tasks corrupted", e);
    }
    return INITIAL_TASKS;
  });

  // Short-circuit toggles to open Add Modal dynamically in from other tabs
  const [importQuickTask, setImportQuickTask] = useState<boolean>(false);
  const [importQuickCourse, setImportQuickCourse] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Firestore real-time synchronization hook
  useEffect(() => {
    let unsubWorkspace: (() => void) | null = null;
    let unsubCourses: (() => void) | null = null;
    let unsubTasks: (() => void) | null = null;

    const setupFirestoreSync = async () => {
      try {
        const workspaceRef = doc(db, 'workspaces', 'default');
        const wsSnap = await getDoc(workspaceRef);

        if (!wsSnap.exists()) {
          // No workspace exists in Firestore. Seed default data once.
          await setDoc(workspaceRef, {
            currentSemester: 5,
            semesterGPAs: { 1: 3.75, 2: 3.80, 3: 3.85, 4: 3.90, 5: 3.82 },
            simulationDate: getTodayDateString(),
            seeded: true,
            updatedAt: new Date().toISOString()
          });

          // Seed courses
          for (const course of INITIAL_COURSES) {
            await setDoc(doc(db, 'workspaces', 'default', 'courses', course.id), {
              code: course.code,
              name: course.name,
              lecturer: course.lecturer || '',
              room: course.room || '',
              day: course.day,
              timeStart: course.timeStart,
              timeEnd: course.timeEnd,
              color: course.color,
              sks: course.sks || 0,
              semester: course.semester || 1,
              grade: course.grade || '',
              updatedAt: new Date().toISOString()
            });
          }

          // Seed tasks
          for (const t of INITIAL_TASKS) {
            await setDoc(doc(db, 'workspaces', 'default', 'tasks', t.id), {
              courseId: t.courseId,
              title: t.title,
              description: t.description || '',
              deadline: t.deadline,
              priority: t.priority,
              status: t.status,
              updatedAt: new Date().toISOString()
            });
          }
        }

        // Live Workspace document listener
        unsubWorkspace = onSnapshot(workspaceRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.currentSemester !== undefined) setCurrentSemester(data.currentSemester);
            if (data.semesterGPAs !== undefined) setSemesterGPAs(data.semesterGPAs);
            if (data.simulationDate !== undefined) setSimulationDate(data.simulationDate);
          }
          setLoading(false);
          setIsCloudSynced(true);
          setSyncError(null);
        }, (err) => {
          setSyncError(`Workspace sync failed: ${err.message}`);
          handleFirestoreError(err, OperationType.GET, 'workspaces/default');
          setLoading(false);
          setIsCloudSynced(false);
        });

        // Live Courses collection listener
        const coursesColRef = collection(db, 'workspaces', 'default', 'courses');
        unsubCourses = onSnapshot(coursesColRef, (colSnap) => {
          const list: Course[] = [];
          colSnap.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              code: data.code,
              name: data.name,
              lecturer: data.lecturer || '',
              room: data.room || '',
              day: data.day,
              timeStart: data.timeStart,
              timeEnd: data.timeEnd,
              color: data.color,
              sks: data.sks || 0,
              semester: data.semester || 1,
              grade: data.grade || '',
            });
          });
          setCourses(list);
          setIsCloudSynced(true);
          setSyncError(null);
          try {
            localStorage.setItem('rancang_belajar_courses', JSON.stringify(list));
          } catch (_) {}
        }, (err) => {
          setSyncError(`Courses sync failed: ${err.message}`);
          setIsCloudSynced(false);
          handleFirestoreError(err, OperationType.LIST, 'workspaces/default/courses');
        });

        // Live Tasks collection listener
        const tasksColRef = collection(db, 'workspaces', 'default', 'tasks');
        unsubTasks = onSnapshot(tasksColRef, (colSnap) => {
          const list: Task[] = [];
          colSnap.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              courseId: data.courseId,
              title: data.title,
              description: data.description || '',
              deadline: data.deadline,
              priority: data.priority,
              status: data.status,
            });
          });
          setTasks(list);
          setIsCloudSynced(true);
          setSyncError(null);
          try {
            localStorage.setItem('rancang_belajar_tasks', JSON.stringify(list));
          } catch (_) {}
        }, (err) => {
          setSyncError(`Tasks sync failed: ${err.message}`);
          setIsCloudSynced(false);
          handleFirestoreError(err, OperationType.LIST, 'workspaces/default/tasks');
        });

      } catch (err) {
        console.error("Firestore setup error:", err);
        setSyncError(`Database connection failed: ${err instanceof Error ? err.message : String(err)}`);
        setIsCloudSynced(false);
        setLoading(false);
      }
    };

    setupFirestoreSync();

    return () => {
      if (unsubWorkspace) unsubWorkspace();
      if (unsubCourses) unsubCourses();
      if (unsubTasks) unsubTasks();
    };
  }, []);

  // Sync back state changes locally for instant page cache rendering
  useEffect(() => {
    try {
      localStorage.setItem('rancang_belajar_semester_gpas', JSON.stringify(semesterGPAs));
    } catch (_) {}
  }, [semesterGPAs]);

  useEffect(() => {
    try {
      localStorage.setItem('rancang_belajar_current_semester', currentSemester.toString());
    } catch (_) {}
  }, [currentSemester]);

  // Firestore update helper functions
  const handleSetSimulationDate = async (newVal: string) => {
    try {
      await updateDoc(doc(db, 'workspaces', 'default'), {
        simulationDate: newVal,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'workspaces/default');
    }
  };

  const handleSetCurrentSemester = async (newVal: number | ((prev: number) => number)) => {
    try {
      const resolvedVal = typeof newVal === 'function' ? newVal(currentSemester) : newVal;
      await updateDoc(doc(db, 'workspaces', 'default'), {
        currentSemester: resolvedVal,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'workspaces/default');
    }
  };

  const handleSetSemesterGPAs = async (newVal: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => {
    try {
      const resolvedVal = typeof newVal === 'function' ? newVal(semesterGPAs) : newVal;
      await updateDoc(doc(db, 'workspaces', 'default'), {
        semesterGPAs: resolvedVal,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'workspaces/default');
    }
  };

  // Task CRUD Operations (backed by Firestore)
  const handleAddTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      const id = `task_${Date.now()}`;
      await setDoc(doc(db, 'workspaces', 'default', 'tasks', id), {
        ...newTask,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'workspaces/default/tasks');
    }
  };

  const handleEditTask = async (id: string, updated: Partial<Task>) => {
    try {
      await updateDoc(doc(db, 'workspaces', 'default', 'tasks', id), {
        ...updated,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `workspaces/default/tasks/${id}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workspaces', 'default', 'tasks', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `workspaces/default/tasks/${id}`);
    }
  };

  const handleQuickToggleTaskStatus = async (id: string) => {
    try {
      const t = tasks.find(item => item.id === id);
      if (t) {
        const nextStatus = t.status === 'Selesai' ? 'Belum Mulai' : 'Selesai';
        await updateDoc(doc(db, 'workspaces', 'default', 'tasks', id), {
          status: nextStatus,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `workspaces/default/tasks/${id}`);
    }
  };

  // Course CRUD Operations (backed by Firestore)
  const handleAddCourse = async (newCourse: Omit<Course, 'id'>) => {
    try {
      const id = `course_${Date.now()}`;
      await setDoc(doc(db, 'workspaces', 'default', 'courses', id), {
        ...newCourse,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'workspaces/default/courses');
    }
  };

  const handleEditCourse = async (id: string, updated: Partial<Course>) => {
    try {
      await updateDoc(doc(db, 'workspaces', 'default', 'courses', id), {
        ...updated,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `workspaces/default/courses/${id}`);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workspaces', 'default', 'courses', id));
      // Clean up linked tasks
      const linkedTasks = tasks.filter(t => t.courseId === id);
      for (const t of linkedTasks) {
        await deleteDoc(doc(db, 'workspaces', 'default', 'tasks', t.id));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `workspaces/default/courses/${id}`);
    }
  };

  // Reset to sample initial state
  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  // Navigation callbacks
  const handleQuickAddTask = () => {
    setActiveTab('tasks');
    setImportQuickTask(true);
  };

  const handleQuickAddCourse = () => {
    setActiveTab('courses');
    setImportQuickCourse(true);
  };

  // Active state indicators
  const pendingTasksCount = tasks.filter(t => t.status !== 'Selesai').length;

  // GPA calculation up to currentSemester
  const activeGPAs = Object.entries(semesterGPAs)
    .filter(([semNum]) => parseInt(semNum, 10) <= currentSemester)
    .map(([_, val]) => Number(val));
  const cumulativeIPK = activeGPAs.length > 0
    ? (activeGPAs.reduce((sum: number, g: number) => sum + g, 0) / activeGPAs.length).toFixed(2)
    : "0.00";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-xs font-bold text-slate-500 font-sans tracking-wide">Menghubungkan dengan EduFlow Cloud Sync...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-gray-800 font-sans flex flex-col md:flex-row overflow-hidden" id="rancang-belajar-main-pane">
      
      {/* Sidebar - Desktop */}
      <nav className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white justify-between shrink-0" id="desktop-sidebar">
        
        {/* Top Part */}
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">EduFlow</h1>
          </div>

          {/* Menus List */}
          <div className="space-y-1.5" id="desktop-menu-list">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <LayoutDashboard className="h-4.5 w-4.5" /> Dashboard
              </span>
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'courses'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <BookOpen className="h-4.5 w-4.5" /> Mata Kuliah
              </span>
              <span className={`h-5 px-1.5 rounded-full text-[9px] font-extrabold flex items-center justify-center border ${
                activeTab === 'courses' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-gray-100 border-gray-200 text-gray-600'
              }`}>
                {courses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'tasks'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <ClipboardList className="h-4.5 w-4.5" /> Daftar Tugas
              </span>
              {pendingTasksCount > 0 && (
                <span className={`h-5 px-2 rounded-full text-[9px] font-extrabold flex items-center justify-center border ${
                  activeTab === 'tasks' ? 'bg-rose-500 text-white border-rose-450' : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  {pendingTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <Calendar className="h-4.5 w-4.5" /> Kalender
              </span>
            </button>

            <button
              onClick={() => setActiveTab('semester')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'semester'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <Layers className="h-4.5 w-4.5" /> Semester
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Part */}
        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleResetData}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition text-[11px] font-bold text-slate-650 shadow-xs cursor-pointer"
            id="btn-reset-data"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-450" /> Atur Ulang Data
          </button>
        </div>
      </nav>

      {/* Main Container including Header and Screens */}
      <div className="flex-1 flex flex-col min-w-0" id="main-screens-canvas">
        
        {/* Unified Application Header layout */}
        <Header 
          courses={courses}
          tasks={tasks}
          todayStr={simulationDate}
          onQuickToggleTaskStatus={handleQuickToggleTaskStatus}
          onSetSimulationDate={handleSetSimulationDate}
          isCloudSynced={isCloudSynced}
          syncError={syncError}
        />

        {/* Responsive Floating Simulation date for Mobile layouts */}
        <div className="md:hidden bg-indigo-50/60 border-b border-indigo-100 px-4 py-2 flex items-center justify-between text-xs text-gray-600 font-semibold">
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-indigo-600" /> Tanggal:</span>
          <input
            type="date"
            value={simulationDate}
            onChange={(e) => handleSetSimulationDate(e.target.value)}
            className="border bg-white rounded px-2 py-0.5 border-indigo-200 text-indigo-800 font-mono text-xs focus:outline-none"
          />
        </div>

        {/* View Screens content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6" id="applet-viewport">
          <div className="max-w-6xl mx-auto pb-16 md:pb-6">
            {activeTab === 'dashboard' && (
              <Dashboard 
                courses={courses}
                tasks={tasks}
                todayStr={simulationDate}
                onNavigate={setActiveTab}
                onAddTaskClick={handleQuickAddTask}
                onAddCourseClick={handleQuickAddCourse}
                onQuickToggleTaskStatus={handleQuickToggleTaskStatus}
              />
            )}

            {activeTab === 'courses' && (
              <MataKuliah 
                courses={courses}
                tasks={tasks}
                onAddCourse={handleAddCourse}
                onEditCourse={handleEditCourse}
                onDeleteCourse={handleDeleteCourse}
              />
            )}

            {activeTab === 'tasks' && (
              <Tugas 
                courses={courses}
                tasks={tasks}
                todayStr={simulationDate}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onImportQuickTask={importQuickTask}
                onToggleQuickTaskDone={() => setImportQuickTask(false)}
              />
            )}

            {activeTab === 'calendar' && (
              <Kalender 
                courses={courses}
                tasks={tasks}
                todayStr={simulationDate}
                onNavigateToTasks={() => setActiveTab('tasks')}
                onQuickToggleTaskStatus={handleQuickToggleTaskStatus}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeTab === 'semester' && (
              <Semester
                courses={courses}
                onAddCourse={handleAddCourse}
                onEditCourse={handleEditCourse}
                onDeleteCourse={handleDeleteCourse}
                currentSemester={currentSemester}
                setCurrentSemester={handleSetCurrentSemester}
                semesterGPAs={semesterGPAs}
                setSemesterGPAs={handleSetSemesterGPAs}
              />
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar Footer */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-150 flex items-center justify-around py-2.5 px-4 shadow-xl" id="mobile-nav">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              activeTab === 'dashboard' ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              activeTab === 'courses' ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Kuliah</span>
            <span className="absolute -top-1 -right-2 bg-indigo-100 text-indigo-700 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black">
              {courses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${
              activeTab === 'tasks' ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <ClipboardList className="h-5 w-5" />
            <span>Tugas</span>
            {pendingTasksCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black">
                {pendingTasksCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              activeTab === 'calendar' ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span>Kalender</span>
          </button>

          <button
            onClick={() => setActiveTab('semester')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              activeTab === 'semester' ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <Layers className="h-5 w-5" />
            <span>Semester</span>
          </button>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-full animate-pulse">
                <RotateCcw className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">Atur Ulang Data</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda ingin memulihkan data bawaan? Semua mata kuliah dan tugas yang telah Anda buat sendiri akan dihapus permanen.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowResetConfirm(false);
                  setLoading(true);
                  try {
                    const workspaceRef = doc(db, 'workspaces', 'default');
                    await setDoc(workspaceRef, {
                      currentSemester: 5,
                      semesterGPAs: { 1: 3.75, 2: 3.80, 3: 3.85, 4: 3.90, 5: 3.82 },
                      simulationDate: getTodayDateString(),
                      seeded: true,
                      updatedAt: new Date().toISOString()
                    });

                    // Clear old entries from Firestore
                    for (const c of courses) {
                      await deleteDoc(doc(db, 'workspaces', 'default', 'courses', c.id));
                    }
                    for (const t of tasks) {
                      await deleteDoc(doc(db, 'workspaces', 'default', 'tasks', t.id));
                    }

                    // Write initial seed to Firestore
                    for (const course of INITIAL_COURSES) {
                      await setDoc(doc(db, 'workspaces', 'default', 'courses', course.id), {
                        code: course.code,
                        name: course.name,
                        lecturer: course.lecturer || '',
                        room: course.room || '',
                        day: course.day,
                        timeStart: course.timeStart,
                        timeEnd: course.timeEnd,
                        color: course.color,
                        sks: course.sks || 0,
                        semester: course.semester || 1,
                        grade: course.grade || '',
                        updatedAt: new Date().toISOString()
                      });
                    }

                    for (const t of INITIAL_TASKS) {
                      await setDoc(doc(db, 'workspaces', 'default', 'tasks', t.id), {
                        courseId: t.courseId,
                        title: t.title,
                        description: t.description || '',
                        deadline: t.deadline,
                        priority: t.priority,
                        status: t.status,
                        updatedAt: new Date().toISOString()
                      });
                    }

                    setActiveTab('dashboard');
                  } catch (err) {
                    console.error("Failed to reset Firestore data:", err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition cursor-pointer animate-in zoom-in-50 duration-75"
              >
                Ya, Atur Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
