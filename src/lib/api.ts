/**
 * Intorza API client — single entry point to the AWS-hosted backend.
 * Supabase is used ONLY for auth (the access token is forwarded as a Bearer).
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
      (json && typeof json === 'object' && 'error' in json && String((json as any).error)) ||
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

export interface Envelope<T> { data: T }

// ---- Generic CRUD factory matching backend/src/crud.js ----
function crud<T = any>(base: string) {
  return {
    list:   () => api.get<Envelope<T[]>>(base),
    get:    (id: string) => api.get<Envelope<T>>(`${base}/${id}`),
    create: (body: Partial<T>) => api.post<Envelope<T>>(base, body),
    update: (id: string, body: Partial<T>) => api.patch<Envelope<T>>(`${base}/${id}`, body),
    remove: (id: string) => api.delete<void>(`${base}/${id}`),
  };
}

// ---- Resources ----
export const quotationsApi = {
  ...crud('/api/quotations'),
};
export const invoicesApi = {
  ...crud('/api/invoices'),
};
export const paymentsApi = {
  list:   (invoiceId?: string) =>
    api.get<Envelope<any[]>>(`/api/payments${invoiceId ? `?invoice_id=${invoiceId}` : ''}`),
  create: (body: any) => api.post<Envelope<any>>('/api/payments', body),
  remove: (id: string) => api.delete<void>(`/api/payments/${id}`),
};
export const clientsApi          = crud('/api/clients');
export const tasksApi            = crud('/api/tasks');
export const galleryApi          = crud('/api/gallery');

export const profileApi = {
  me:     () => api.get<Envelope<any>>('/api/profile/me'),
  update: (body: any) => api.patch<Envelope<any>>('/api/profile/me', body),
};

export const libraryApi = {
  terms:               crud('/api/library/terms'),
  warranty:            crud('/api/library/warranty'),
  paymentStages:       crud('/api/library/payment-stages'),
  bankDetails:         crud('/api/library/bank-details'),
  quotationTemplates:  crud('/api/library/quotation-templates'),
  sectionTemplates:    crud('/api/library/section-templates'),
  items:               crud('/api/library/items'),
  preferences:         crud('/api/library/preferences'),
};

export const teamApi = {
  members:     crud('/api/team/members'),
  requests:    crud('/api/team/requests'),
  assignments: crud('/api/team/assignments'),
  attendance:  crud('/api/team/attendance'),
};

export const siteApi = {
  projects: crud('/api/site-measurements/projects'),
  rooms:    crud('/api/site-measurements/rooms'),
  photos:   crud('/api/site-measurements/photos'),
};

export const filesApi = {
  signUpload:   (body: { kind: string; filename?: string; contentType?: string; size?: number }) =>
    api.post<Envelope<{ uploadUrl: string; method: 'PUT'; headers: Record<string, string>; key: string; bucket: string; url: string; expiresIn: number }>>(
      '/api/files/sign-upload', body),
  signDownload: (key: string) =>
    api.post<Envelope<{ url: string; expiresIn: number }>>('/api/files/sign-download', { key }),
};
