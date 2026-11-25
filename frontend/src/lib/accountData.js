import { apiFetch } from './api';

export class AccountDataError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

export async function accountJson(path, token, options = {}) {
  let response;
  try {
    response = await apiFetch(path, options, token);
  } catch {
    throw new AccountDataError('Couldn’t connect to your saved attendance. Check your connection and try again.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !['/api/auth/login', '/api/auth/signup'].includes(path)) {
      throw new AccountDataError('Your session has expired. Sign in again to load your saved subjects and attendance.', 401);
    }
    throw new AccountDataError(data?.message || 'Couldn’t load your saved attendance. Please try again.', response.status);
  }
  if (data === null) throw new AccountDataError('The server didn’t return your attendance data. Please try again.');
  return data;
}

export async function loadAllAttendance(token) {
  const attendance = {};
  let skip = 0;
  let total;
  do {
    const page = await accountJson(`/api/attendance/all?limit=365&skip=${skip}`, token);
    if (!page.data || typeof page.data !== 'object' || Array.isArray(page.data)) {
      throw new AccountDataError('Couldn’t read your attendance history. Please try again.');
    }
    for (const [date, subjects] of Object.entries(page.data)) {
      if (!subjects || typeof subjects !== 'object' || Array.isArray(subjects)) {
        throw new AccountDataError('Couldn’t read your attendance history. Please try again.');
      }
      attendance[date] = { ...attendance[date], ...subjects };
    }
    // Older API deployments returned the complete map without pagination.
    if (!page.pagination) break;
    const { returned, total: count, skip: offset } = page.pagination;
    if (!Number.isInteger(returned) || returned < 0 || !Number.isInteger(count) || count < 0 || offset !== skip) {
      throw new AccountDataError('Couldn’t load the complete attendance history. Please try again.');
    }
    total = count;
    if (returned === 0 && skip < total) {
      throw new AccountDataError('Couldn’t load the complete attendance history. Please try again.');
    }
    skip += returned;
  } while (skip < total);
  return attendance;
}

export async function loadAccountData(token) {
  const [subjects, attendance, todos] = await Promise.all([
    accountJson('/api/subjects', token),
    loadAllAttendance(token),
    accountJson('/api/todos', token),
  ]);
  if (!Array.isArray(subjects) || !Array.isArray(todos)) {
    throw new AccountDataError('Couldn’t read your saved subjects. Please try again.');
  }
  return { subjects, attendance, todos };
}

// A failed guest import can be retried using the same backup. Existing server
// marks win, and subjects already created by an earlier attempt are reused.
export async function migrateGuestData(backup, remote, token, isCurrent = () => true) {
  const checkSession = () => {
    if (!isCurrent()) throw new AccountDataError('Sign-in changed. Your local backup has been kept.');
  };
  const subjects = [...remote.subjects];
  const ids = new Map();
  const normalized = name => name.trim().toLowerCase();
  for (const local of backup.subjects) {
    checkSession();
    let subject = subjects.find(item => normalized(item.name) === normalized(local.name));
    if (!subject) {
      subject = await accountJson('/api/subjects', token, {
        method: 'POST', body: JSON.stringify({ name: local.name }),
      });
      subjects.push(subject);
    }
    ids.set(local.id, subject.id);
  }
  for (const [date, records] of Object.entries(backup.attendance)) {
    const groups = new Map();
    for (const [localId, status] of Object.entries(records)) {
      const subjectId = ids.get(localId);
      if (!subjectId) throw new AccountDataError('A local attendance record has no subject. Your local backup has been kept.');
      if (remote.attendance[date]?.[subjectId]) continue;
      if (!groups.has(status)) groups.set(status, []);
      groups.get(status).push(subjectId);
    }
    for (const [status, subjectIds] of groups) {
      checkSession();
      await accountJson('/api/attendance/mark', token, {
        method: 'POST', body: JSON.stringify({ dates: [date], subjectIds, status }),
      });
    }
  }
  for (const todo of backup.todos) {
    checkSession();
    if (remote.todos.some(item => item.title === todo.title && (item.dueAt || null) === (todo.dueAt || null))) continue;
    await accountJson('/api/todos', token, {
      method: 'POST', body: JSON.stringify({ title: todo.title, completed: !!todo.completed, dueAt: todo.dueAt || null }),
    });
  }
  checkSession();
  return loadAccountData(token);
}
