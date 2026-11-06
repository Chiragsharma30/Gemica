// Single fetch wrapper: cookies included, JSON in/out, normalised errors.
export const API_BASE = import.meta.env.VITE_API_URL || '/api';
const ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const opts = { method, credentials: 'include', headers: { ...headers } };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) {
    opts.body = JSON.stringify(body);
    opts.headers['Content-Type'] = 'application/json';
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch {
    throw new ApiError(0, 'Network error. Please check your connection and try again.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.success === false)) {
    throw new ApiError(res.status, (json && json.message) || 'Something went wrong', json && json.errors);
  }
  return raw ? json : json.data;
}

// Uploaded images are served by the API; seeded/placeholder images are static client assets.
export const imageUrl = (src) => (src && src.startsWith('/uploads/') ? `${ORIGIN}${src}` : src || '/images/hero.svg');
