export const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

export async function apiFetch(path, options = {}, accessToken) {
  let token = accessToken;
  if (token === undefined) {
    try { token = localStorage.getItem('token') || ''; } catch { token = ''; }
  }
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70000);
  try {
    return await fetch(apiUrl(path), { ...options, headers, signal: options.signal || controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
