import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Fetch wrapper that attaches the current Supabase session's JWT
 * and normalizes error handling across the app.
 */
async function apiFetch(path, options = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message = body?.error || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.details = body?.details;
    throw error;
  }

  return body;
}

export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};
