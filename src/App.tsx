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
import { db, OperationType, handleFirestoreError, auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import Login from './components/Login';

import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardList, 
  Calendar, 
  Settings,
  Info,
  RotateCcw,
  Layers,
  LogOut,
  User as UserIcon
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

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Dark Mode State with localStorage persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rancang_belajar_dark_mode');
      return saved === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('rancang_belajar_dark_mode', String(darkMode));
  }, [darkMode]);

  // Workspace owner dynamic ID key
  const workspaceId = currentUser?.uid || 'default';

  // Listen for user authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (usr) {
        setCurrentUser(usr);
      } else {
        const savedGuest = localStorage.getItem('eduflow_local_guest');
        if (savedGuest) {
          try {
            setCurrentUser(JSON.parse(savedGuest));
          } catch (_) {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check if current user is an offline local guest
  const isLocalGuest = currentUser?.isLocalGuest === true;

  // Firestore real-time synchronization hook
  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser) {
      setCourses([]);
      setTasks([]);
      setLoading(false);
      setIsCloudSynced(false);
      return;
    }

    if (currentUser.isLocalGuest) {
      // Local offline guest mode! Boot data from localstorage / mock initial data
      try {
        const localCourses = localStorage.getItem('rancang_belajar_courses');
        if (localCourses) {
          setCourses(JSON.parse(localCourses));
        } else {
          setCourses(INITIAL_COURSES);
          localStorage.setItem('rancang_belajar_courses', JSON.stringify(INITIAL_COURSES));
        }
      } catch (_) {
        setCourses(INITIAL_COURSES);
      }

      try {
        const localTasks = localStorage.getItem('rancang_belajar_tasks');
        if (localTasks) {
          setTasks(JSON.parse(localTasks));
        } else {
          setTasks(INITIAL_TASKS);
          localStorage.setItem('rancang_belajar_tasks', JSON.stringify(INITIAL_TASKS));
        }
      } catch (_) {
        setTasks(INITIAL_TASKS);
      }

      try {
        const savedGPAs = localStorage.getItem('rancang_belajar_semester_gpas');
        if (savedGPAs) setSemesterGPAs(JSON.parse(savedGPAs));
      } catch (_) {}

      try {
        const savedSem = localStorage.getItem('rancang_belajar_current_semester');
        if (savedSem) setCurrentSemester(parseInt(savedSem, 10));
      } catch (_) {}

      try {
        const savedSimDate = localStorage.getItem('rancang_belajar_simulation_date');
        if (savedSimDate) {
          setSimulationDate(savedSimDate);
        } else {
          setSimulationDate(getTodayDateString());
        }
      } catch (_) {}

      setLoading(false);
      setIsCloudSynced(false);
      setSyncError(null);
      return;
    }

    setLoading(true);
    let unsubWorkspace: (() => void) | null = null;
    let unsubCourses: (() => void) | null = null;
    let unsubTasks: (() => void) | null = null;

    const setupFirestoreSync = async () => {
      try {
        const uid = currentUser.uid;
        const workspaceRef = doc(db, 'workspaces', uid);
        const wsSnap = await getDoc(workspaceRef);

        if (!wsSnap.exists()) {
          // No workspace exists in Firestore. Seed default data once for this user.
          await setDoc(workspaceRef, {
            currentSemester: 5,
            semesterGPAs: { 1: 3.75, 2: 3.80, 3: 3.85, 4: 3.90, 5: 3.82 },
            simulationDate: getTodayDateString(),
            seeded: true,
            updatedAt: new Date().toISOString()
          });

          // Seed courses
          for (const course of INITIAL_COURSES) {
            await setDoc(doc(db, 'workspaces', uid, 'courses', course.id), {
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
              days: course.days || [course.day],
              schedules: course.schedules || [],
              updatedAt: new Date().toISOString()
            });
          }

          // Seed tasks
          for (const t of INITIAL_TASKS) {
            await setDoc(doc(db, 'workspaces', uid, 'tasks', t.id), {
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
          handleFirestoreError(err, OperationType.GET, `workspaces/${uid}`);
          setLoading(false);
          setIsCloudSynced(false);
        });

        // Live Courses collection listener
        const coursesColRef = collection(db, 'workspaces', uid, 'courses');
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
              days: data.days || [data.day || 'Senin'],
              schedules: data.schedules || []
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
          handleFirestoreError(err, OperationType.LIST, `workspaces/${uid}/courses`);
        });

        // Live Tasks collection listener
        const tasksColRef = collection(db, 'workspaces', uid, 'tasks');
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
          handleFirestoreError(err, OperationType.LIST, `workspaces/${uid}/tasks`);
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
  }, [currentUser, authLoading]);

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
    if (isLocalGuest) {
      setSimulationDate(newVal);
      try {
        localStorage.setItem('rancang_belajar_simulation_date', newVal);
      } catch (_) {}
      return;
    }
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        simulationDate: newVal,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `workspaces/${workspaceId}`);
    }
  };

  const handleSetCurrentSemester = async (newVal: number | ((prev: number) => number)) => {
    const resolvedVal = typeof newVal === 'function' ? newVal(currentSemester) : newVal;
    if (isLocalGuest) {
      setCurrentSemester(resolvedVal);
      try {
        localStorage.setItem('rancang_belajar_current_semester', resolvedVal.toString());
      } catch (_) {}
      return;
    }
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        currentSemester: resolvedVal,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `workspaces/${workspaceId}`);
    }
  };

  const handleSetSemesterGPAs = async (newVal: Record<number, number> | ((prev: Record<number, number>) => Record<number, number>)) => {
    const resolvedVal = typeof newVal === 'function' ? newVal(semesterGPAs) : newVal;
    if (isLocalGuest) {
      setSemesterGPAs(resolvedVal);
      try {
        localStorage.setItem('rancang_belajar_semester_gpas', JSON.stringify(resolvedVal));
      } catch (_) {}
      return;
    }
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        semesterGPAs: resolvedVal,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `workspaces/${workspaceId}`);
    }
  };

  // Task CRUD Operations (backed by Firestore)
  const handleAddTask = async (newTask: Omit<Task, 'id'>) => {
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const taskWithId: Task = { ...newTask, id };
    if (isLocalGuest) {
      setTasks(prev => {
        const next = [...prev, taskWithId];
        try { localStorage.setItem('rancang_belajar_tasks', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      return;
    }
    try {
      await setDoc(doc(db, 'workspaces', workspaceId, 'tasks', id), {
        ...newTask,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `workspaces/${workspaceId}/tasks`);
    }
  };

  const handleEditTask = async (id: string, updated: Partial<Task>) => {
    if (isLocalGuest) {
      setTasks(prev => {
        const next = prev.map(t => t.id === id ? { ...t, ...updated } : t);
        try { localStorage.setItem('rancang_belajar_tasks', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      return;
    }
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId, 'tasks', id), {
        ...updated,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `workspaces/${workspaceId}/tasks/${id}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (isLocalGuest) {
      setTasks(prev => {
        const next = prev.filter(t => t.id !== id);
        try { localStorage.setItem('rancang_belajar_tasks', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      return;
    }
    try {
      await deleteDoc(doc(db, 'workspaces', workspaceId, 'tasks', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `workspaces/${workspaceId}/tasks/${id}`);
    }
  };

  const handleQuickToggleTaskStatus = async (id: string) => {
    if (isLocalGuest) {
      setTasks(prev => {
        const next = prev.map(t => {
          if (t.id === id) {
            const nextStatus = t.status === 'Selesai' ? 'Belum Mulai' : 'Selesai';
            return { ...t, status: nextStatus };
          }
          return t;
        });
        try { localStorage.setItem('rancang_belajar_tasks', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      return;
    }
    try {
      const t = tasks.find(item => item.id === id);
      if (t) {
        const nextStatus = t.status === 'Selesai' ? 'Belum Mulai' : 'Selesai';
        await updateDoc(doc(db, 'workspaces', workspaceId, 'tasks', id), {
          status: nextStatus,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `workspaces/${workspaceId}/tasks/${id}`);
    }
  };

  // Course CRUD Operations (backed by Firestore)
  const handleAddCourse = async (newCourse: Omit<Course, 'id'>) => {
    const existing = courses.find(c => c.code.trim().toUpperCase() === newCourse.code.trim().toUpperCase());
    if (isLocalGuest) {
      setCourses(prev => {
        let next;
        const reallyExisting = prev.find(c => c.code.trim().toUpperCase() === newCourse.code.trim().toUpperCase());
        if (reallyExisting) {
          next = prev.map(c => c.id === reallyExisting.id ? { ...c, ...newCourse } : c);
        } else {
          const id = `course_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          next = [...prev, { ...newCourse, id }];
        }
        try { localStorage.setItem('rancang_belajar_courses', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      return;
    }
    try {
      if (existing) {
        await updateDoc(doc(db, 'workspaces', workspaceId, 'courses', existing.id), {
          ...newCourse,
          updatedAt: new Date().toISOString()
        });
        return;
      }

      const id = `course_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await setDoc(doc(db, 'workspaces', workspaceId, 'courses', id), {
        ...newCourse,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `workspaces/${workspaceId}/courses`);
    }
  };

  const handleEditCourse = async (id: string, updated: Partial<Course>) => {
    if (isLocalGuest) {
      setCourses(prev => {
        const next = prev.map(c => c.id === id ? { ...c, ...updated } : c);
        try { localStorage.setItem('rancang_belajar_courses', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      return;
    }
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId, 'courses', id), {
        ...updated,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `workspaces/${workspaceId}/courses/${id}`);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (isLocalGuest) {
      setCourses(prev => {
        const next = prev.filter(c => c.id !== id);
        try { localStorage.setItem('rancang_belajar_courses', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      setTasks(prev => {
        const next = prev.filter(t => t.courseId !== id);
        try { localStorage.setItem('rancang_belajar_tasks', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      return;
    }
    try {
      await deleteDoc(doc(db, 'workspaces', workspaceId, 'courses', id));
      // Clean up linked tasks
      const linkedTasks = tasks.filter(t => t.courseId === id);
      for (const t of linkedTasks) {
        await deleteDoc(doc(db, 'workspaces', workspaceId, 'tasks', t.id));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `workspaces/${workspaceId}/courses/${id}`);
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans tracking-wide">Memverifikasi Gerbang Keamanan...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login 
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onLocalGuestLogin={() => {
          const guestUser = {
            uid: 'guest_local_uid',
            displayName: 'Tamu EduFlow',
            email: 'offline-mode@eduflow.local',
            isAnonymous: true,
            isLocalGuest: true
          };
          try {
            localStorage.setItem('eduflow_local_guest', JSON.stringify(guestUser));
          } catch (_) {}
          setCurrentUser(guestUser as any);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans tracking-wide">Menghubungkan dengan EduFlow Cloud Sync...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-100 font-sans flex flex-col md:flex-row overflow-hidden" id="rancang-belajar-main-pane">
      
      {/* Sidebar - Desktop */}
      <nav className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 justify-between shrink-0 transition-colors" id="desktop-sidebar">
        
        {/* Top Part */}
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display">EduFlow</h1>
          </div>

          {/* Menus List */}
          <div className="space-y-1.5" id="desktop-menu-list">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 shadow-xs dark:shadow-none'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <LayoutDashboard className="h-4.5 w-4.5" /> Dashboard
              </span>
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'courses'
                  ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 shadow-xs dark:shadow-none'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <BookOpen className="h-4.5 w-4.5" /> Mata Kuliah
              </span>
              <span className={`h-5 px-1.5 rounded-full text-[9px] font-extrabold flex items-center justify-center border ${
                activeTab === 'courses' 
                  ? 'bg-indigo-105 dark:bg-indigo-900 text-indigo-805 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
                  : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300'
              }`}>
                {courses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 shadow-xs dark:shadow-none'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <ClipboardList className="h-4.5 w-4.5" /> Daftar Tugas
              </span>
              {pendingTasksCount > 0 && (
                <span className={`h-5 px-2 rounded-full text-[9px] font-extrabold flex items-center justify-center border ${
                  activeTab === 'tasks' ? 'bg-rose-500 text-white border-rose-450' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-750 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'
                }`}>
                  {pendingTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 shadow-xs dark:shadow-none'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <Calendar className="h-4.5 w-4.5" /> Kalender
              </span>
            </button>

            <button
              onClick={() => setActiveTab('semester')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'semester'
                  ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 shadow-xs dark:shadow-none'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <Layers className="h-4.5 w-4.5" /> Semester
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Part */}
        <div className="p-4 border-t border-slate-150 dark:border-slate-800 space-y-3">
          {currentUser && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center border border-indigo-200 dark:border-indigo-850 text-indigo-750 dark:text-indigo-300 font-bold text-xs shrink-0 whitespace-nowrap overflow-hidden">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-slate-800 dark:text-slate-205 leading-tight truncate">
                    {currentUser.displayName || (currentUser.isAnonymous ? 'Tamu Rancang' : 'Mahasiswa')}
                  </div>
                  <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate leading-none mt-0.5">
                    {currentUser.email || 'Mode Demo Offline'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try { await signOut(auth); } catch (_) {}
                  localStorage.removeItem('eduflow_local_guest');
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-905 transition text-[10px] font-extrabold text-rose-700 dark:text-rose-400 cursor-pointer shadow-3xs"
              >
                <LogOut className="h-3 w-3" /> Log Out / Keluar
              </button>
            </div>
          )}

          <button
            onClick={handleResetData}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-rose-950/20 hover:text-red-650 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 transition text-[11px] font-bold text-slate-600 dark:text-slate-400 shadow-xs cursor-pointer"
            id="btn-reset-data"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-450 dark:text-slate-500" /> Atur Ulang Data
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
          currentUser={currentUser}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />

        {/* Responsive Floating Simulation date for Mobile layouts */}
        <div className="md:hidden bg-indigo-50/60 dark:bg-slate-900 border-b border-indigo-100 dark:border-slate-850 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-350 font-semibold" id="mobile-simulation-bar">
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Tanggal Simulasi:
          </span>
          <input
            type="date"
            value={simulationDate}
            onChange={(e) => handleSetSimulationDate(e.target.value)}
            className="border bg-white dark:bg-slate-800 rounded px-2.5 py-1 border-indigo-200 dark:border-slate-700 text-indigo-800 dark:text-indigo-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                currentSemester={currentSemester}
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
                currentSemester={currentSemester}
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
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 px-3 rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/5" id="mobile-nav">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 text-[9.5px] font-bold transition-transform active:scale-95 ${
              activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-450'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`flex flex-col items-center gap-0.5 text-[9.5px] font-bold relative transition-transform active:scale-95 ${
              activeTab === 'courses' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-455'
            }`}
          >
            <BookOpen className="h-4.5 w-4.5" />
            <span>Kuliah</span>
            <span className="absolute -top-1.5 -right-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black border border-indigo-200 dark:border-indigo-800">
              {courses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-0.5 text-[9.5px] font-bold relative transition-transform active:scale-95 ${
              activeTab === 'tasks' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-455'
            }`}
          >
            <ClipboardList className="h-4.5 w-4.5" />
            <span>Tugas</span>
            {pendingTasksCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black">
                {pendingTasksCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center gap-0.5 text-[9.5px] font-bold transition-transform active:scale-95 ${
              activeTab === 'calendar' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-455'
            }`}
          >
            <Calendar className="h-4.5 w-4.5" />
            <span>Kalender</span>
          </button>

          <button
            onClick={() => setActiveTab('semester')}
            className={`flex flex-col items-center gap-0.5 text-[9.5px] font-bold transition-transform active:scale-95 ${
              activeTab === 'semester' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-455'
            }`}
          >
            <Layers className="h-4.5 w-4.5" />
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
                  if (isLocalGuest) {
                    setSemesterGPAs({ 1: 3.75, 2: 3.80, 3: 3.85, 4: 3.90, 5: 3.82 });
                    setCurrentSemester(5);
                    const todayStr = getTodayDateString();
                    setSimulationDate(todayStr);
                    setCourses(INITIAL_COURSES);
                    setTasks(INITIAL_TASKS);
                    try {
                      localStorage.setItem('rancang_belajar_semester_gpas', JSON.stringify({ 1: 3.75, 2: 3.80, 3: 3.85, 4: 3.90, 5: 3.82 }));
                      localStorage.setItem('rancang_belajar_current_semester', '5');
                      localStorage.setItem('rancang_belajar_simulation_date', todayStr);
                      localStorage.setItem('rancang_belajar_courses', JSON.stringify(INITIAL_COURSES));
                      localStorage.setItem('rancang_belajar_tasks', JSON.stringify(INITIAL_TASKS));
                    } catch (_) {}
                    setActiveTab('dashboard');
                    setLoading(false);
                    return;
                  }
                  try {
                    const workspaceRef = doc(db, 'workspaces', workspaceId);
                    await setDoc(workspaceRef, {
                      currentSemester: 5,
                      semesterGPAs: { 1: 3.75, 2: 3.80, 3: 3.85, 4: 3.90, 5: 3.82 },
                      simulationDate: getTodayDateString(),
                      seeded: true,
                      updatedAt: new Date().toISOString()
                    });

                    // Clear old entries from Firestore
                    for (const c of courses) {
                      await deleteDoc(doc(db, 'workspaces', workspaceId, 'courses', c.id));
                    }
                    for (const t of tasks) {
                      await deleteDoc(doc(db, 'workspaces', workspaceId, 'tasks', t.id));
                    }

                    // Write initial seed to Firestore
                    for (const course of INITIAL_COURSES) {
                      await setDoc(doc(db, 'workspaces', workspaceId, 'courses', course.id), {
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
                        days: course.days || [course.day],
                        schedules: course.schedules || [],
                        updatedAt: new Date().toISOString()
                      });
                    }

                    for (const t of INITIAL_TASKS) {
                      await setDoc(doc(db, 'workspaces', workspaceId, 'tasks', t.id), {
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
