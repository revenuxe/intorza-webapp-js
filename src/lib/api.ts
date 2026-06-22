/**
 * Intorza API client — talks to the AWS Amplify Functions backend.
 *
 * Auth model: every request attaches the **Supabase access token** as a
 * Bearer Authorization header. The backend verifies it against Supabase's
 * JWKS. Database operations are NOT performed via the Supabase JS client
 * anymore — only auth (signIn / signUp / session / signOut) still uses
 * Supabase directly.
 */
import { supabase } from '@/integrations/supabase/client';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'https://api.intorza.com';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...((init?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (json && typeof json === 'object' && 'error' in json && String(json.error)) ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, message, json);
  }
  return json as T;
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

export const api = {
  get:    <T = unknown>(path: string)                 => request<T>('GET',    path),
  post:   <T = unknown>(path: string, body?: unknown) => request<T>('POST',   path, body),
  put:    <T = unknown>(path: string, body?: unknown) => request<T>('PUT',    path, body),
  patch:  <T = unknown>(path: string, body?: unknown) => request<T>('PATCH',  path, body),
  delete: <T = unknown>(path: string)                 => request<T>('DELETE', path),
};

// ---------- Typed resource helpers ----------
// Add one of these per resource as you port the corresponding screens off
// supabase.from(...). Keep response shape `{ data: T }` to match the backend.

export interface Envelope<T> { data: T }

export const quotationsApi = {
  list:   () => api.get<Envelope<any[]>>('/api/quotations'),
  get:    (id: string) => api.get<Envelope<any>>(`/api/quotations/${id}`),
  create: (body: any)  => api.post<Envelope<any>>('/api/quotations', body),
  update: (id: string, body: any) => api.put<Envelope<any>>(`/api/quotations/${id}`, body),
  remove: (id: string) => api.delete<void>(`/api/quotations/${id}`),
};
