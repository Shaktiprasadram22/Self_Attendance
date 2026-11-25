import { accountJson, loadAllAttendance } from './accountData';

const response = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => data });

afterEach(() => { jest.restoreAllMocks(); });

test('loads every page, including subjects split across a day boundary', async () => {
  const rows = Array.from({ length: 740 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 8, 24) - Math.floor(i / 3) * 86400000).toISOString().slice(0, 10),
    id: `subject-${i % 3}`, status: i % 2 ? 'Absent' : 'Present',
  }));
  global.fetch = jest.fn((url, options) => {
    expect(options.headers.Authorization).toBe('Bearer test-session');
    const skip = Number(new URL(url, 'http://localhost').searchParams.get('skip'));
    const batch = rows.slice(skip, skip + 365);
    const data = {};
    batch.forEach(row => { (data[row.date] ||= {})[row.id] = row.status; });
    return response({ data, pagination: { skip, total: rows.length, returned: batch.length } });
  });
  const attendance = await loadAllAttendance('test-session');
  expect(Object.values(attendance).reduce((count, day) => count + Object.keys(day).length, 0)).toBe(740);
  for (const row of rows) expect(attendance[row.date][row.id]).toBe(row.status);
  expect(global.fetch).toHaveBeenCalledTimes(3);
});

test('rejects a failed later page instead of returning a truncated history', async () => {
  global.fetch = jest.fn()
    .mockImplementationOnce(() => response({ data: { '2026-09-24': { science: 'Present' } }, pagination: { skip: 0, total: 2, returned: 1 } }))
    .mockImplementationOnce(() => response({ message: 'Database unavailable' }, 503));
  await expect(loadAllAttendance('test-session')).rejects.toMatchObject({ status: 503 });
});

test('stops a broken pagination response rather than looping or silently dropping history', async () => {
  global.fetch = jest.fn(() => response({ data: {}, pagination: { skip: 0, total: 10, returned: 0 } }));
  await expect(loadAllAttendance('test-session')).rejects.toThrow('complete attendance history');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('distinguishes an expired session from an incorrect login password', async () => {
  global.fetch = jest.fn(() => response({ message: 'Invalid credentials' }, 401));
  await expect(accountJson('/api/subjects', 'expired')).rejects.toThrow('session has expired');
  await expect(accountJson('/api/auth/login', '', { method: 'POST' })).rejects.toThrow('Invalid credentials');
});

test('rejects an HTML fallback instead of interpreting it as an empty account', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError(); } }));
  await expect(loadAllAttendance('test-session')).rejects.toThrow('didn’t return your attendance data');
});
