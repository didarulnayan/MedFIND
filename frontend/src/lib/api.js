// Small fetch wrapper for the MedFind BD REST API.
// Every backend response is { success, message, data } or { success:false, message, errors }.

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'medfind.token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: the session just won't persist */
  }
}

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors || [];
  }
}

/** Builds "?a=1&b=2" from an object, skipping empty values; arrays become comma lists. */
export function qs(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function api(path, { method = 'GET', body, form, query } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form; // FormData: the browser sets the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}${qs(query)}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || !json || json.success === false) {
    const message = (json && json.message) || `Request failed (${res.status})`;
    if (res.status === 401 && token) setToken(null);
    throw new ApiError(res.status, message, json && json.errors);
  }
  return json.data;
}

/** Turns an ApiError into one readable line, including field errors. */
export function errorText(err) {
  if (!err) return '';
  const fields = (err.errors || []).map((e) => `${e.field}: ${e.message}`);
  return fields.length ? `${err.message} - ${fields.join('; ')}` : err.message;
}
