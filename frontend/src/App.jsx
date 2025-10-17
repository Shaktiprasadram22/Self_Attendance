import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Subjects from './pages/Subjects';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SubjectDetails from './pages/SubjectDetails';
import Todos from './pages/Todos';
import { apiFetch } from './lib/api';

export const AppDataContext = createContext(null);

function App() {
  const [subjects, setSubjects] = useState(() => {
    try {
      const saved = localStorage.getItem('subjects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [attendance, setAttendance] = useState(() => {
    try {
      const saved = localStorage.getItem('attendance');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('todos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Auth: token + user persisted in localStorage; hydrate on load
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token') || '';
    } catch {
      return '';
    }
  });

  const storageTimers = useRef(new Map());

  const schedulePersist = (key, value) => {
    const timers = storageTimers.current;
    if (timers.has(key)) {
      clearTimeout(timers.get(key));
    }
    const timerId = setTimeout(() => {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // ignore storage errors
      } finally {
        timers.delete(key);
      }
    }, 200);
    timers.set(key, timerId);
  };

  useEffect(() => {
    return () => {
      storageTimers.current.forEach((timerId) => clearTimeout(timerId));
      storageTimers.current.clear();
    };
  }, []);

  useEffect(() => {
    schedulePersist('subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    schedulePersist('attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    schedulePersist('todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    if (user) schedulePersist('user', JSON.stringify(user));
    else schedulePersist('user', null);
  }, [user]);

  useEffect(() => {
    if (token) schedulePersist('token', token);
    else schedulePersist('token', null);
  }, [token]);

  // If we have a token but no user, fetch profile
  useEffect(() => {
    let cancelled = false;
    const loadMe = async () => {
      if (!token || user) return;
      try {
        const res = await apiFetch('/api/auth/me');
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setUser({ id: data.id, name: data.name, email: data.email });
          } else {
            setToken('');
          }
        }
      } catch {
        // ignore
      }
    };
    loadMe();
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const addSubject = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // If authenticated, create on server
    if (token) {
      const res = await apiFetch('/api/subjects', { method: 'POST', body: JSON.stringify({ name: trimmed }) });
      if (!res.ok) {
        // fall back silently if conflict
        return;
      }
      const s = await res.json();
      setSubjects((prev) => [...prev, s]);
    } else {
      const exists = subjects.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setSubjects((prev) => [...prev, { id, name: trimmed }]);
    }
  };

  // When token+user are set, fetch remote subjects/attendance
  useEffect(() => {
    if (token && user) {
      loadRemote();
    }
  }, [token, user]);

  const editSubject = async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (token) {
      const res = await apiFetch(`/api/subjects/${id}`, { method: 'PUT', body: JSON.stringify({ name: trimmed }) });
      if (!res.ok) return;
      const s = await res.json();
      setSubjects((prev) => prev.map((x) => (x.id === id ? s : x)));
    } else {
      setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, name: trimmed } : s)));
    }
  };

  const deleteSubject = async (id) => {
    if (token) {
      const res = await apiFetch(`/api/subjects/${id}`, { method: 'DELETE' });
      if (!res.ok) return;
    }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setAttendance((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((date) => {
        if (copy[date] && copy[date][id]) {
          const { [id]: _, ...rest } = copy[date];
          copy[date] = rest;
          if (Object.keys(copy[date]).length === 0) {
            delete copy[date];
          }
        }
      });
      return copy;
    });
  };

  const addTodo = async (title, dueAt) => {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const payload = { title: trimmed };
    if (dueAt) payload.dueAt = dueAt;
    if (token) {
      const res = await apiFetch('/api/todos', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) return null;
      const todo = await res.json();
      const normalized = { ...todo, dueAt: todo.dueAt || dueAt || null };
      setTodos((prev) => [...prev, normalized]);
      return todo;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const todo = { id, title: trimmed, completed: false, dueAt: dueAt || null };
    setTodos((prev) => [...prev, todo]);
    return todo;
  };

  const toggleTodo = async (id, completed) => {
    if (!id) return null;
    if (token) {
      const res = await apiFetch(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify({ completed }) });
      if (!res.ok) return null;
      const todo = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? todo : t)));
      return todo;
    }
    let updatedTodo = null;
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        updatedTodo = { ...t, completed };
        return updatedTodo;
      })
    );
    return updatedTodo;
  };

  const deleteTodo = async (id) => {
    if (!id) return;
    if (token) {
      const res = await apiFetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!res.ok) return;
    }
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const markAttendance = async (dateStrOrArray, subjectIds, status) => {
    if ((!dateStrOrArray && !Array.isArray(dateStrOrArray)) || subjectIds.length === 0 || !status) return;
    const dates = Array.isArray(dateStrOrArray) ? dateStrOrArray : [dateStrOrArray];
    if (token) {
      await apiFetch('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ dates, subjectIds, status }),
      });
    }
    // Update local state
    setAttendance((prev) => {
      const copy = { ...prev };
      dates.forEach((dateStr) => {
        const day = copy[dateStr] ? { ...copy[dateStr] } : {};
        subjectIds.forEach((id) => {
          day[id] = status;
        });
        copy[dateStr] = day;
      });
      return copy;
    });
  };

  const clearAttendance = async (dateStr, subjectId) => {
    if (!dateStr || !subjectId) return;
    if (token) {
      await apiFetch(`/api/attendance/clear?date=${encodeURIComponent(dateStr)}&subjectId=${encodeURIComponent(subjectId)}`, {
        method: 'DELETE',
      });
    }
    setAttendance((prev) => {
      const copy = { ...prev };
      if (!copy[dateStr]) return prev;
      const { [subjectId]: _, ...rest } = copy[dateStr];
      if (Object.keys(rest).length === 0) {
        delete copy[dateStr];
      } else {
        copy[dateStr] = rest;
      }
      return copy;
    });
  };

  // Load subjects and attendance from server
  const loadRemote = async () => {
    if (!token) return;
    try {
      const [sRes, aRes, tRes] = await Promise.all([
        apiFetch('/api/subjects'),
        apiFetch('/api/attendance/all?limit=180&skip=0'),
        apiFetch('/api/todos'),
      ]);
      if (sRes.ok) {
        const s = await sRes.json();
        setSubjects(s);
      }
      if (aRes.ok) {
        const a = await aRes.json();
        setAttendance(a.data || {});
      }
      if (tRes.ok) {
        const t = await tRes.json();
        setTodos(t);
      }
    } catch {
      // ignore
    }
  };

  const migrateLocalToServerIfNeeded = async () => {
    if (!token) return;
    try {
      const [sRes, aRes, tRes] = await Promise.all([
        apiFetch('/api/subjects'),
        apiFetch('/api/attendance/all?limit=180&skip=0'),
        apiFetch('/api/todos'),
      ]);
      const serverSubjects = sRes.ok ? await sRes.json() : [];
      const serverAttendance = aRes.ok ? await aRes.json() : { data: {} };
      const serverTodos = tRes.ok ? await tRes.json() : [];
      const hasServerData =
        serverSubjects.length > 0 || Object.keys(serverAttendance.data || {}).length > 0 || serverTodos.length > 0;
      if (hasServerData) return;
      // Read local cached data
      const localSubjects = (() => {
        try { return JSON.parse(localStorage.getItem('subjects') || '[]'); } catch { return []; }
      })();
      const localAttendance = (() => {
        try { return JSON.parse(localStorage.getItem('attendance') || '{}'); } catch { return {}; }
      })();
      const localTodos = (() => {
        try { return JSON.parse(localStorage.getItem('todos') || '[]'); } catch { return []; }
      })();
      if (localSubjects.length === 0 && localTodos.length === 0) return;
      // Create subjects on server and build id map
      const chunk = (arr, size) => {
        const parts = [];
        for (let i = 0; i < arr.length; i += size) parts.push(arr.slice(i, i + size));
        return parts;
      };

      const idMap = new Map();
      const subjectChunks = chunk(localSubjects, 5);
      for (const group of subjectChunks) {
        const created = await Promise.all(
          group.map(async (s) => {
            try {
              const res = await apiFetch('/api/subjects', { method: 'POST', body: JSON.stringify({ name: s.name }) });
              if (!res.ok) return null;
              const payload = await res.json();
              return { oldId: s.id, newId: payload.id };
            } catch {
              return null;
            }
          })
        );
        created.forEach((entry) => {
          if (entry?.newId) idMap.set(entry.oldId, entry.newId);
        });
      }

      const attendancePayloads = [];
      for (const [dateStr, perSubj] of Object.entries(localAttendance)) {
        const groups = {};
        for (const [oldId, status] of Object.entries(perSubj)) {
          const newId = idMap.get(oldId);
          if (!newId) continue;
          if (!groups[status]) groups[status] = [];
          groups[status].push(newId);
        }
        for (const [status, subjIds] of Object.entries(groups)) {
          if (subjIds.length === 0) continue;
          attendancePayloads.push({ dateStr, status, subjectIds: subjIds });
        }
      }

      const attendanceChunks = chunk(attendancePayloads, 5);
      for (const group of attendanceChunks) {
        await Promise.all(
          group.map(async ({ dateStr, status, subjectIds }) => {
            try {
              await apiFetch('/api/attendance/mark', {
                method: 'POST',
                body: JSON.stringify({ dates: [dateStr], subjectIds, status }),
              });
            } catch {
              // ignore
            }
          })
        );
      }

      const todoChunks = chunk(localTodos, 5);
      for (const group of todoChunks) {
        await Promise.all(
          group.map(async (todo) => {
            try {
              await apiFetch('/api/todos', {
                method: 'POST',
                body: JSON.stringify({
                  title: todo.title,
                  completed: !!todo.completed,
                  dueAt: todo.dueAt || null,
                }),
              });
            } catch {
              // ignore
            }
          })
        );
      }
      // Reload from server
      await loadRemote();
    } catch {
      // ignore
    }
  };

  // Auth actions
  const loginUser = async (email, password) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Login failed');
    }
    const data = await res.json();
    setToken(data.token || '');
    setUser(data.user || null);
    await migrateLocalToServerIfNeeded();
    await loadRemote();
    return data.user;
  };

  const signupUser = async (name, email, password) => {
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Signup failed');
    }
    const data = await res.json();
    setToken(data.token || '');
    setUser(data.user || null);
    return data.user;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    // Clear client-side cached data so nothing is shown after logout
    setSubjects([]);
    setAttendance({});
    setTodos([]);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('subjects');
      localStorage.removeItem('attendance');
      localStorage.removeItem('todos');
    } catch {
      // ignore storage errors
    }
  };

  const ctxValue = useMemo(
    () => ({
      // data
      subjects,
      attendance,
      todos,
      user,
      token,
      // subject actions
      addSubject,
      editSubject,
      deleteSubject,
      // attendance actions
      markAttendance,
      // auth actions
      loginUser,
      signupUser,
      clearAttendance,
      // todo actions
      addTodo,
      toggleTodo,
      deleteTodo,
      logout,
    }),
    [subjects, attendance, todos, user, token]
  );

  return (
    <AppDataContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-md w-full px-3 pb-28 pt-16">
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
