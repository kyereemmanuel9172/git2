const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const PROXY_BASE = '/api/proxy';

export const TOKEN_KEY = 'cms_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, signal } = options;
  const token = getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const abort = () => controller.abort();

  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 401) {
      setToken(null);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/portal')) {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Session expired. Please log in again.');
    }

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const data = await response.json();
        if (typeof data?.message === 'string') message = data.message;
        else if (Array.isArray(data?.message)) message = data.message.join(', ');
      } catch {}
      throw new ApiError(response.status, message);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export function download(path: string, filename: string) {
  const token = getToken();
  const sep = path.includes('?') ? '&' : '?';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  fetch(`${PROXY_BASE}${path}${sep}t=${Date.now()}`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        let message = `Download failed (${res.status})`;
        try {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (typeof data?.message === 'string') message = data.message;
            else if (Array.isArray(data?.message)) message = data.message.join(', ');
          } catch {
            if (text) message = text.slice(0, 200);
          }
        } catch {}
        throw new Error(message);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('Downloaded file is empty');
      return blob;
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        console.error('Download error:', err);
        const msg = err.message || 'Download failed. Please try again.';
        alert(msg.includes('Failed to fetch') || msg.includes('NetworkError')
          ? 'Cannot reach the server. Please check your connection and ensure the backend is running.'
          : msg);
      }
    })
    .finally(() => clearTimeout(timeout));
}

export function formatMoney(amount: number | null | undefined, currency = 'USD') {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function titleCase(value: string | null | undefined) {
  if (!value) return '';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
