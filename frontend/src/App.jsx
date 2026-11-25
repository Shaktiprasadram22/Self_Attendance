import React, { createContext, useEffect, useRef, useState } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Subjects from './pages/Subjects';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SubjectDetails from './pages/SubjectDetails';
import Todos from './pages/Todos';
import { accountJson, loadAccountData, migrateGuestData } from './lib/accountData';

export const AppDataContext = createContext(null);
const BACKUP_KEY = 'self-attendance-local-backup';
function storedJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function App() {
  const [subjects, setSubjects] = useState(() => storedJson('subjects', []));
  const [attendance, setAttendance] = useState(() => storedJson('attendance', {}));
  const [todos, setTodos] = useState(() => storedJson('todos', []));
  const [user, setUser] = useState(() => storedJson('user', null));
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('token') || ''; } catch { return ''; }
  });
  const [localBackup, setLocalBackup] = useState(() => storedJson(BACKUP_KEY, null));
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loadedToken, setLoadedToken] = useState('');
  const authRef = useRef(token);
  const authAttempt = useRef(0);
  const loadAttempt = useRef(0);
  const switchingAccount = useRef(false);
  const storageTimers = useRef(new Map());
  const canEdit = !token || (loadedToken === token && !loadingRemote && !sessionExpired);

  const schedulePersist = (key, value) => {
    const timers = storageTimers.current;
    if (timers.has(key)) clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => {
      try { localStorage.setItem(key, value); } catch { /* In-memory use still works. */ }
      timers.delete(key);
    }, 200));
  };
  useEffect(() => () => {
    loadAttempt.current++;
    authAttempt.current++;
    storageTimers.current.forEach(clearTimeout);
    storageTimers.current.clear();
  }, []);
  useEffect(() => { schedulePersist('subjects', JSON.stringify(subjects)); }, [subjects]);
  useEffect(() => { schedulePersist('attendance', JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { schedulePersist('todos', JSON.stringify(todos)); }, [todos]);

  // Credentials must be available before the first account-data request.
  // Keep them separate from the delayed persistence of larger cached records.
  const rememberAuth = (nextUser, nextToken) => {
    authRef.current = nextToken;
    try {
      if (nextToken) localStorage.setItem('token', nextToken);
      else localStorage.removeItem('token');
      if (nextUser) localStorage.setItem('user', JSON.stringify(nextUser));
      else localStorage.removeItem('user');
    } catch { /* Requests also receive the in-memory token explicitly. */ }
    setToken(nextToken);
    setUser(nextUser);
  };
  const rememberBackup = backup => {
    try {
      if (backup) localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      else localStorage.removeItem(BACKUP_KEY);
    } catch {
      if (backup) throw new Error('Couldn’t keep a backup on this device. Free some browser storage and try again.');
    }
    setLocalBackup(backup);
  };
  const showError = error => {
    setSyncError(error.message || 'Couldn’t load your saved attendance. Please try again.');
    if (error.status === 401) setSessionExpired(true);
  };

  const loadRemote = async (accessToken = authRef.current, accountId = user?.id, backup = localBackup, allowImport = false) => {
    if (!accessToken) return false;
    const attempt = ++loadAttempt.current;
    const current = () => attempt === loadAttempt.current && authRef.current === accessToken;
    setLoadingRemote(true);
    setSyncError('');
    try {
      if (!accountId) {
        const profile = await accountJson('/api/auth/me', accessToken);
        if (!current()) return false;
        if (!profile?.id) throw new Error('Couldn’t load your account. Please try again.');
        accountId = profile.id;
        rememberAuth(profile, accessToken);
      }
      let data = await loadAccountData(accessToken);
      if (!current()) return false;
      const empty = !data.subjects.length && !Object.keys(data.attendance).length && !data.todos.length;
      if (backup?.userId === accountId && (backup.pending || ((allowImport || backup.awaitingAccount) && empty))) {
        backup = { ...backup, pending: true };
        rememberBackup(backup);
        data = await migrateGuestData(backup, data, accessToken, current);
        if (!current()) return false;
        rememberBackup(null);
      } else if (backup?.userId === accountId && backup.awaitingAccount) {
        rememberBackup({ ...backup, awaitingAccount: false });
      }
      setSubjects(data.subjects);
      setAttendance(data.attendance);
      setTodos(data.todos);
      setLoadedToken(accessToken);
      setSessionExpired(false);
      return true;
    } catch (error) {
      if (current()) showError(error);
      return false;
    } finally {
      if (current()) setLoadingRemote(false);
    }
  };

  useEffect(() => {
    if (token && !loadingRemote && !switchingAccount.current && loadedToken !== token) void loadRemote(token, user?.id);
    // Data changes must not restart the initial account load.
  }, [token, user]);

  const mutation = async (path, options) => {
    if (!canEdit) {
      if (!syncError) setSyncError('Load your saved attendance before making changes.');
      return null;
    }
    const accessToken = authRef.current;
    try {
      const data = await accountJson(path, accessToken, options);
      return authRef.current === accessToken ? data : null;
    } catch (error) {
      if (authRef.current === accessToken) showError(error);
      return null;
    }
  };

  const addSubject = async name => {
    const trimmed = name.trim();
    if (!trimmed || !canEdit) return false;
    if (token) {
      const subject = await mutation('/api/subjects', { method: 'POST', body: JSON.stringify({ name: trimmed }) });
      if (!subject) return false;
      setSubjects(prev => [...prev, subject]);
    } else {
      if (subjects.some(subject => subject.name.toLowerCase() === trimmed.toLowerCase())) return false;
      setSubjects(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: trimmed }]);
    }
    return true;
  };
  const editSubject = async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed || !canEdit) return false;
    if (token) {
      const subject = await mutation(`/api/subjects/${id}`, { method: 'PUT', body: JSON.stringify({ name: trimmed }) });
      if (!subject) return false;
      setSubjects(prev => prev.map(item => item.id === id ? subject : item));
    } else setSubjects(prev => prev.map(item => item.id === id ? { ...item, name: trimmed } : item));
    return true;
  };
  const deleteSubject = async id => {
    if (!canEdit) return false;
    if (token && !await mutation(`/api/subjects/${id}`, { method: 'DELETE' })) return false;
    setSubjects(prev => prev.filter(subject => subject.id !== id));
    setAttendance(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(date => {
        if (copy[date]?.[id]) {
          const { [id]: removed, ...rest } = copy[date];
          if (Object.keys(rest).length) copy[date] = rest;
          else delete copy[date];
        }
      });
      return copy;
    });
    return true;
  };

  const markAttendance = async (dateOrDates, subjectIds, status) => {
    if (!canEdit) return false;
    const dates = Array.isArray(dateOrDates) ? dateOrDates : [dateOrDates];
    if (!dates.length || dates.some(date => !date) || !subjectIds.length || !status) return false;
    if (token && !await mutation('/api/attendance/mark', {
      method: 'POST', body: JSON.stringify({ dates, subjectIds, status }),
    })) return false;
    setAttendance(prev => {
      const copy = { ...prev };
      dates.forEach(date => {
        const day = { ...copy[date] };
        subjectIds.forEach(id => { day[id] = status; });
        copy[date] = day;
      });
      return copy;
    });
    return true;
  };
  const clearAttendance = async (date, subjectId) => {
    if (!date || !subjectId || !canEdit) return false;
    if (token && !await mutation(`/api/attendance/clear?date=${encodeURIComponent(date)}&subjectId=${encodeURIComponent(subjectId)}`, { method: 'DELETE' })) return false;
    setAttendance(prev => {
      if (!prev[date]) return prev;
      const copy = { ...prev };
      const { [subjectId]: removed, ...rest } = copy[date];
      if (Object.keys(rest).length) copy[date] = rest;
      else delete copy[date];
      return copy;
    });
    return true;
  };

  const addTodo = async (title, dueAt) => {
    const trimmed = title.trim();
    if (!trimmed || !canEdit) return null;
    const payload = { title: trimmed, ...(dueAt ? { dueAt } : {}) };
    const todo = token ? await mutation('/api/todos', { method: 'POST', body: JSON.stringify(payload) })
      : { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: trimmed, completed: false, dueAt: dueAt || null };
    if (!todo) return null;
    setTodos(prev => [...prev, { ...todo, dueAt: todo.dueAt || dueAt || null }]);
    return todo;
  };
  const toggleTodo = async (id, completed) => {
    if (!id || !canEdit) return null;
    if (token) {
      const todo = await mutation(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify({ completed }) });
      if (!todo) return null;
      setTodos(prev => prev.map(item => item.id === id ? todo : item));
      return todo;
    }
    setTodos(prev => prev.map(item => item.id === id ? { ...item, completed } : item));
    return { id, completed };
  };
  const deleteTodo = async id => {
    if (!id || !canEdit) return false;
    if (token && !await mutation(`/api/todos/${id}`, { method: 'DELETE' })) return false;
    setTodos(prev => prev.filter(item => item.id !== id));
    return true;
  };

  const authenticate = async (path, credentials) => {
    const attempt = ++authAttempt.current;
    const data = await accountJson(path, '', { method: 'POST', body: JSON.stringify(credentials) });
    if (attempt !== authAttempt.current) throw new Error('Sign-in was cancelled. Please try again.');
    if (!data.token || !data.user?.id) throw new Error('Sign-in didn’t complete. Please try again.');
    const guest = !authRef.current && !user;
    let backup = localBackup;
    if (guest && (subjects.length || Object.keys(attendance).length || todos.length)) {
      backup = { userId: data.user.id, pending: false, awaitingAccount: true, subjects, attendance, todos };
      rememberBackup(backup);
    }
    if (user && user.id !== data.user.id) {
      setSubjects([]);
      setAttendance({});
      setTodos([]);
    }
    switchingAccount.current = true;
    loadAttempt.current++;
    rememberAuth(data.user, data.token);
    setLoadedToken('');
    setSessionExpired(false);
    try { await loadRemote(data.token, data.user.id, backup, guest); }
    finally { switchingAccount.current = false; }
    return data.user;
  };
  const loginUser = (email, password) => authenticate('/api/auth/login', { email, password });
  const signupUser = (name, email, password) => authenticate('/api/auth/signup', { name, email, password });
  const logout = () => {
    authAttempt.current++;
    loadAttempt.current++;
    switchingAccount.current = false;
    storageTimers.current.forEach(clearTimeout);
    storageTimers.current.clear();
    rememberAuth(null, '');
    setLoadedToken('');
    setLoadingRemote(false);
    setSessionExpired(false);
    setSyncError('');
    setSubjects([]);
    setAttendance({});
    setTodos([]);
    try {
      ['subjects', 'attendance', 'todos'].forEach(key => localStorage.removeItem(key));
    } catch { /* The in-memory account is still cleared. */ }
  };
  const downloadRecords = records => {
    const { subjects, attendance, todos } = records;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ subjects, attendance, todos }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'self-attendance-local-backup.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const ctxValue = {
    subjects, attendance, todos, user, token, canEdit, sessionExpired,
    addSubject, editSubject, deleteSubject, markAttendance, clearAttendance,
    loginUser, signupUser, addTodo, toggleTodo, deleteTodo, logout,
  };
  return (
    <AppDataContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-md w-full px-3 pb-28 pt-20">
          {loadingRemote && <p className="mb-4 text-sm text-slate-600" role="status">Loading your saved subjects and attendance…</p>}
          {syncError && <section className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
            <p>{syncError}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sessionExpired ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-amber-800 px-3 font-semibold" to="/login">Sign in again</Link>
                : <button className="min-h-11 rounded-lg border border-amber-800 px-3 font-semibold disabled:opacity-50" onClick={() => void loadRemote()} disabled={loadingRemote}>Retry</button>}
              {(subjects.length > 0 || Object.keys(attendance).length > 0 || todos.length > 0) && !(localBackup && user && localBackup.userId === user.id) &&
                <button className="min-h-11 px-2 font-semibold underline" onClick={() => downloadRecords({ subjects, attendance, todos })}>Download saved copy</button>}
            </div>
          </section>}
          {localBackup?.userId === user?.id && user && <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <p>A backup of your previous local records is available.</p>
            <button className="min-h-11 font-semibold text-sky-800 underline" onClick={() => downloadRecords(localBackup)}>Download local backup</button>
          </div>}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/subjects/:id" element={<SubjectDetails />} />
            <Route path="/todos" element={<Todos />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </AppDataContext.Provider>
  );
}

export default App;
