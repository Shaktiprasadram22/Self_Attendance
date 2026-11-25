import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

let mockContext;
jest.mock('./pages/Home', () => {
  const React = require('react');
  return function HomeProbe() {
    mockContext = React.useContext(require('./App').AppDataContext);
    return <p>{mockContext.subjects.map(subject => subject.name).join(', ')}</p>;
  };
});

const user = { id: 'test-student', name: 'Test Student', email: 'student@example.test' };
const cachedSubjects = [{ id: 'science', name: 'Saved science' }];
const cachedAttendance = { '2026-09-16': { science: 'Present' } };
const response = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => data });
let container, root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
const mount = () => act(async () => {
  root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>);
});
function cacheAccount() {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', 'test-session');
  localStorage.setItem('subjects', JSON.stringify(cachedSubjects));
  localStorage.setItem('attendance', JSON.stringify(cachedAttendance));
}
function remoteData(url) {
  if (url.includes('/api/subjects')) return response(cachedSubjects);
  if (url.includes('/api/todos')) return response([]);
  if (url.includes('/api/auth/me')) return response(user);
  return response({ data: cachedAttendance, pagination: { total: 1, returned: 1, skip: 0 } });
}
async function retry() {
  const button = [...container.querySelectorAll('button')].find(button => button.textContent === 'Retry');
  expect(button).toBeDefined();
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

test('sign-in loads saved records immediately with the new token, without reloading', async () => {
  global.fetch = jest.fn((url, options) => {
    if (url.includes('/api/auth/login')) return response({ user, token: 'new-session' });
    expect(options.headers.Authorization).toBe('Bearer new-session');
    expect(localStorage.getItem('token')).toBe('new-session');
    return remoteData(url);
  });
  await mount();
  await act(async () => { await mockContext.loginUser(user.email, 'test-password'); });
  expect(container.textContent).toContain('Saved science');
  expect(mockContext.attendance).toEqual(cachedAttendance);
  expect(mockContext.canEdit).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(4);
});

test('an expired session preserves the saved copy, blocks edits, and offers sign-in', async () => {
  cacheAccount();
  global.fetch = jest.fn(() => response({ message: 'Unauthorized' }, 401));
  await mount();
  expect(container.querySelector('[role="alert"]').textContent).toContain('session has expired');
  expect(container.textContent).toContain('Download saved copy');
  expect(container.textContent).toContain('Saved science');
  expect(mockContext.attendance).toEqual(cachedAttendance);
  expect(mockContext.canEdit).toBe(false);
  const count = global.fetch.mock.calls.length;
  await act(async () => { expect(await mockContext.markAttendance('2026-09-16', ['science'], 'Absent')).toBe(false); });
  expect(global.fetch).toHaveBeenCalledTimes(count);
});

test('a failed load keeps cached records and retry replaces them only after a complete load', async () => {
  cacheAccount();
  let offline = true;
  global.fetch = jest.fn(url => offline ? response({ message: 'Records unavailable' }, 503) : remoteData(url));
  await mount();
  expect(mockContext.attendance).toEqual(cachedAttendance);
  expect(mockContext.canEdit).toBe(false);
  offline = false;
  await retry();
  expect(mockContext.canEdit).toBe(true);
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

test('retry also recovers a missing profile after a connection failure', async () => {
  cacheAccount();
  localStorage.removeItem('user');
  let offline = true;
  global.fetch = jest.fn(url => offline ? response({ message: 'Records unavailable' }, 503) : remoteData(url));
  await mount();
  expect(mockContext.user).toBeNull();
  expect(container.textContent).toContain('Download saved copy');
  offline = false;
  await retry();
  expect(mockContext.user).toEqual(user);
  expect(mockContext.canEdit).toBe(true);
});

test('late responses cannot restore a previous account after logout', async () => {
  cacheAccount();
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  global.fetch = jest.fn(url => pending.then(() => remoteData(url)));
  await mount();
  await act(async () => mockContext.logout());
  await act(async () => release());
  await act(async () => jest.advanceTimersByTime(200));
  expect(mockContext.user).toBeNull();
  expect(mockContext.subjects).toEqual([]);
  expect(mockContext.attendance).toEqual({});
  expect(localStorage.getItem('token')).toBeNull();
  expect(JSON.parse(localStorage.getItem('subjects'))).toEqual([]);
});

test('a rejected attendance change does not change the saved status', async () => {
  cacheAccount();
  global.fetch = jest.fn((url, options) => options.method === 'POST'
    ? response({ message: 'Could not save' }, 503) : remoteData(url));
  await mount();
  await act(async () => { expect(await mockContext.markAttendance('2026-09-16', ['science'], 'Absent')).toBe(false); });
  expect(mockContext.attendance).toEqual(cachedAttendance);
  expect(container.querySelector('[role="alert"]').textContent).toContain('Could not save');
});

test('guest records survive failed loading and a partial import, and retry does not duplicate writes', async () => {
  localStorage.setItem('subjects', JSON.stringify([{ id: 'local-science', name: 'Science' }]));
  localStorage.setItem('attendance', JSON.stringify({ '2026-09-16': { 'local-science': 'Present' } }));
  const remote = { subjects: [], attendance: {} };
  let offline = true, created = 0, marked = 0;
  global.fetch = jest.fn((url, options) => {
    if (url.includes('/api/auth/login')) return response({ user, token: 'test-session' });
    if (offline) return response({ message: 'Records unavailable' }, 503);
    if (options.method === 'POST' && url.includes('/api/subjects')) {
      created++;
      const subject = { id: 'server-science', name: 'Science' };
      remote.subjects.push(subject);
      return response(subject, 201);
    }
    if (options.method === 'POST' && url.includes('/api/attendance/mark')) {
      marked++;
      remote.attendance['2026-09-16'] = { 'server-science': 'Present' };
      // Simulate a committed write whose response was lost.
      return response({ message: 'Response unavailable' }, 503);
    }
    if (url.includes('/api/subjects')) return response([...remote.subjects]);
    if (url.includes('/api/todos')) return response([]);
    return response({ data: { ...remote.attendance }, pagination: { total: marked ? 1 : 0, returned: marked ? 1 : 0, skip: 0 } });
  });
  await mount();
  await act(async () => { await mockContext.loginUser(user.email, 'test-password'); });
  expect(mockContext.subjects[0].id).toBe('local-science');
  expect(JSON.parse(localStorage.getItem('self-attendance-local-backup')).awaitingAccount).toBe(true);
  offline = false;
  await retry();
  expect(mockContext.subjects[0].id).toBe('local-science');
  expect(JSON.parse(localStorage.getItem('self-attendance-local-backup')).pending).toBe(true);
  await retry();
  expect(mockContext.subjects[0].id).toBe('server-science');
  expect(mockContext.attendance['2026-09-16']['server-science']).toBe('Present');
  expect(localStorage.getItem('self-attendance-local-backup')).toBeNull();
  expect(created).toBe(1);
  expect(marked).toBe(1);
});

test('an existing account keeps its records and leaves guest data as a downloadable backup', async () => {
  localStorage.setItem('subjects', JSON.stringify([{ id: 'guest', name: 'Local subject' }]));
  global.fetch = jest.fn((url, options) => url.includes('/api/auth/login')
    ? response({ user, token: 'test-session' }) : remoteData(url));
  await mount();
  await act(async () => { await mockContext.loginUser(user.email, 'test-password'); });
  expect(mockContext.subjects).toEqual(cachedSubjects);
  expect(container.textContent).toContain('Download local backup');
  expect(JSON.parse(localStorage.getItem('self-attendance-local-backup')).subjects[0].id).toBe('guest');
  expect(global.fetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
});
