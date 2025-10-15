export const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

export async function apiFetch(path, options = {}) {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(apiUrl(path), { headers, ...options });
  return res;
}
