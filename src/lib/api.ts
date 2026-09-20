/**
 * Intorza API client — Supabase-backed.
 *
 * Previously this file talked to an external AWS backend at api.intorza.com,
 * which was returning CORS/ERR_FAILED for every request. Everything now goes
 * directly to Supabase, using the same `{ data }` envelope surface that the
 * rest of the app already imports, so no call-site changes are required.
 */
import { supabase as supabaseTyped } from '@/integrations/supabase/client';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = supabaseTyped;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface Envelope<T> { data: T }

// ---------------------- helpers ----------------------
async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new ApiError(401, 'Not authenticated');
  return id;
}

function unwrap<T>(res: { data: T | null; error: any }): T {
  if (res.error) throw new ApiError(res.error.status || 400, res.error.message, res.error);
  return res.data as T;
}

/** Generic user-scoped CRUD helper for simple tables (has a user_id column). */
function tableCrud<T = any>(table: string, opts: { userScoped?: boolean } = { userScoped: true }) {
  const scoped = opts.userScoped !== false;
  return {
    list: async (): Promise<Envelope<T[]>> => {
      let q: any = supabase.from(table as any).select('*').order('created_at', { ascending: false });
      if (scoped) {
        const uid = await requireUserId();
        q = q.eq('user_id', uid);
      }
      const rows = unwrap(await q);
      return { data: (rows as T[]) || [] };
    },
    get: async (id: string): Promise<Envelope<T>> => {
      const row = unwrap(await supabase.from(table as any).select('*').eq('id', id).maybeSingle());
      if (!row) throw new ApiError(404, `${table} not found`);
      return { data: row as T };
    },
    create: async (body: Partial<T>): Promise<Envelope<T>> => {
      const payload: any = { ...body };
      if (scoped && !payload.user_id) payload.user_id = await requireUserId();
      const row = unwrap(await supabase.from(table as any).insert(payload).select().single());
      return { data: row as T };
    },
    update: async (id: string, body: Partial<T>): Promise<Envelope<T>> => {
      let query = supabase.from(table as any).update(body as any).eq('id', id);
      if (scoped) query = query.eq('user_id', await requireUserId());
      const row = unwrap(await query.select().maybeSingle());
      if (!row) throw new ApiError(404, `${table} not found or could not be updated`);
      return { data: row as T };
    },
    remove: async (id: string): Promise<void> => {
      const { error } = await supabase.from(table as any).delete().eq('id', id);
      if (error) throw new ApiError(400, error.message, error);
    },
  };
}

// ---------------------- profile ----------------------
export const profileApi = {
  get: async (): Promise<Envelope<any>> => {
    const uid = await requireUserId();
    const row = unwrap(await supabase.from('profiles').select('*').eq('id', uid).maybeSingle());
    return { data: row || null };
  },
  update: async (body: any): Promise<Envelope<any>> => {
    const uid = await requireUserId();
    const row = unwrap(
      await supabase.from('profiles').update(body).eq('id', uid).select().single(),
    );
    return { data: row };
  },
  roles: async (): Promise<Envelope<string[]>> => {
    const uid = await requireUserId();
    const rows = unwrap(await supabase.from('user_roles').select('role').eq('user_id', uid));
    return { data: (rows as any[]).map((r) => r.role) };
  },
  getPreferences: async (): Promise<Envelope<any>> => {
    const uid = await requireUserId();
    const row = unwrap(
      await supabase.from('quotation_preferences').select('*').eq('user_id', uid).maybeSingle(),
    );
    return { data: row };
  },
  setPreferences: async (body: any): Promise<Envelope<any>> => {
    const uid = await requireUserId();
    const row = unwrap(
      await supabase
        .from('quotation_preferences')
        .upsert({ ...body, user_id: uid }, { onConflict: 'user_id' })
        .select()
        .single(),
    );
    return { data: row };
  },
};

// ---------------------- quotations (with sections + items) ----------------------
async function insertSections(quotationId: string, sections: any[]) {
  for (let sIdx = 0; sIdx < (sections || []).length; sIdx++) {
    const section = sections[sIdx];
    const sec = unwrap(
      await supabase
        .from('quotation_sections')
        .insert({
          quotation_id: quotationId,
          section_name: section.section_name || section.title || `Section ${sIdx + 1}`,
          sort_order: section.sort_order ?? sIdx,
        })
        .select()
        .single(),
    );
    const items = (section.items || []).map((item: any, iIdx: number) => ({
      section_id: (sec as any).id,
      product_name: item.product_name ?? item.productName ?? '',
      product_details: item.product_details ?? item.productDetails ?? null,
      side: item.side ?? null,
      width_ft: Number(item.width_ft ?? item.widthFt ?? 0),
      height_ft: Number(item.height_ft ?? item.heightFt ?? 0),
      sft_area: Number(item.sft_area ?? item.sftArea ?? 0),
      rate_per_sft: Number(item.rate_per_sft ?? item.ratePerSft ?? 0),
      amount: Number(item.amount ?? 0),
      sort_order: item.sort_order ?? iIdx,
    }));
    if (items.length) {
      const { error } = await supabase.from('quotation_items').insert(items);
      if (error) throw new ApiError(400, error.message, error);
    }
  }
}

export const quotationsApi = {
  list: async (): Promise<Envelope<any[]>> => {
    const uid = await requireUserId();
    const rows = unwrap(
      await supabase
        .from('quotations')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
    );
    return { data: (rows as any[]) || [] };
  },
  get: async (id: string): Promise<Envelope<any>> => {
    const row = unwrap(
      await supabase.from('quotations').select('*').eq('id', id).maybeSingle(),
    );
    if (!row) throw new ApiError(404, 'Quotation not found');
    const sections = unwrap(
      await supabase
        .from('quotation_sections')
        .select('*, quotation_items(*)')
        .eq('quotation_id', id)
        .order('sort_order', { ascending: true }),
    );
    const normalized = (sections as any[]).map((s) => ({
      ...s,
      items: (s.quotation_items || []).sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      ),
    }));
    return { data: { ...(row as any), sections: normalized } };
  },
  create: async (body: any): Promise<Envelope<any>> => {
    const uid = await requireUserId();
    const { sections, ...rest } = body || {};
    const payload: any = { ...rest, user_id: uid };
    const row = unwrap(
      await supabase.from('quotations').insert(payload).select().single(),
    );
    try {
      await insertSections((row as any).id, sections || []);
    } catch (e) {
      // Best-effort: keep the quotation; surface the error so caller sees it.
      throw e;
    }
    return { data: row };
  },
  update: async (id: string, body: any): Promise<Envelope<any>> => {
    const { sections, ...rest } = body || {};
    let row: any = null;
    if (Object.keys(rest).length) {
      row = unwrap(
        await supabase.from('quotations').update(rest).eq('id', id).select().single(),
      );
    } else {
      row = unwrap(await supabase.from('quotations').select('*').eq('id', id).single());
    }
    if (sections !== undefined) {
      const { error } = await supabase
        .from('quotation_sections')
        .delete()
        .eq('quotation_id', id);
      if (error) throw new ApiError(400, error.message, error);
      await insertSections(id, sections || []);
    }
    return { data: row };
  },
  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    if (error) throw new ApiError(400, error.message, error);
  },
};

// ---------------------- invoices (with payments) ----------------------
const invoicesBase = tableCrud('invoices');
export const invoicesApi = {
  ...invoicesBase,
  // Overrides tableCrud's flat get() — callers (e.g. InvoiceDetail.tsx) expect payments
  // nested on the invoice, same shape the old backend/src/routes/invoices.js returned.
  get: async (id: string): Promise<Envelope<any>> => {
    const row = unwrap(
      await supabase.from('invoices').select('*').eq('id', id).maybeSingle(),
    );
    if (!row) throw new ApiError(404, 'invoices not found');
    const payments = unwrap(
      await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at', { ascending: false }),
    );
    return { data: { ...(row as any), payments: (payments as any[]) || [] } };
  },
  listPayments: async (id: string): Promise<Envelope<any[]>> => {
    const rows = unwrap(
      await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at', { ascending: false }),
    );
    return { data: (rows as any[]) || [] };
  },
  addPayment: async (id: string, body: any): Promise<Envelope<any>> => {
    // `payments` has no user_id column; RLS checks the insert against the parent invoice's
    // ownership instead (see "Users can insert payments to own invoices" policy).
    const row = unwrap(
      await supabase
        .from('payments')
        .insert({ ...body, invoice_id: id })
        .select()
        .single(),
    );
    return { data: row };
  },
  removePayment: async (_id: string, paymentId: string): Promise<void> => {
    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    if (error) throw new ApiError(400, error.message, error);
  },
};

// ---------------------- other resources ----------------------
export const clientsApi = tableCrud('clients');
export const tasksApi = tableCrud('tasks');
export const galleryApi = tableCrud('gallery_images');

export const paymentsApi = {
  // `payments` has no user_id column — ownership is enforced by RLS via a join back to the
  // parent invoice (invoices.user_id = auth.uid()), so no extra filter is needed or possible here.
  list: async (): Promise<Envelope<any[]>> => {
    const rows = unwrap(
      await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false }),
    );
    return { data: (rows as any[]) || [] };
  },
  logs: async (): Promise<Envelope<any[]>> => {
    const uid = await requireUserId();
    const rows = unwrap(
      await supabase
        .from('payment_logs')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
    );
    return { data: (rows as any[]) || [] };
  },
};

// ---------------------- library ----------------------
export const libraryApi = {
  terms: tableCrud('terms_templates'),
  warranty: tableCrud('warranty_templates'),
  bankDetails: tableCrud('bank_detail_templates'),
  paymentTemplates: tableCrud('payment_templates'),
  sections: tableCrud('section_templates'),
  quotationTemplates: tableCrud('quotation_templates'),
  items: {
    list: async (): Promise<Envelope<any[]>> => {
      const uid = await requireUserId();
      const rows = unwrap(
        await supabase
          .from('item_usage_patterns')
          .select('*')
          .eq('user_id', uid)
          .order('usage_count', { ascending: false }),
      );
      return { data: (rows as any[]) || [] };
    },
    upsert: async (body: any): Promise<Envelope<any>> => {
      const uid = await requireUserId();
      const row = unwrap(
        await supabase
          .from('item_usage_patterns')
          .upsert({ ...body, user_id: uid })
          .select()
          .single(),
      );
      return { data: row };
    },
    remove: async (id: string): Promise<void> => {
      const { error } = await supabase.from('item_usage_patterns').delete().eq('id', id);
      if (error) throw new ApiError(400, error.message, error);
    },
  },
};

// ---------------------- team ----------------------
export const teamApi = {
  members: tableCrud('team_members'),
  assignments: tableCrud('team_project_assignments', { userScoped: false }),
  attendance: tableCrud('attendance', { userScoped: false }),
  requests: {
    list: async (): Promise<Envelope<any[]>> => {
      const rows = unwrap(
        await supabase
          .from('team_member_requests')
          .select('*')
          .order('created_at', { ascending: false }),
      );
      return { data: (rows as any[]) || [] };
    },
    create: async (body: any): Promise<Envelope<any>> => {
      const row = unwrap(
        await supabase.from('team_member_requests').insert(body).select().single(),
      );
      return { data: row };
    },
    update: async (id: string, body: any): Promise<Envelope<any>> => {
      const row = unwrap(
        await supabase
          .from('team_member_requests')
          .update(body)
          .eq('id', id)
          .select()
          .single(),
      );
      return { data: row };
    },
    remove: async (id: string): Promise<void> => {
      const { error } = await supabase.from('team_member_requests').delete().eq('id', id);
      if (error) throw new ApiError(400, error.message, error);
    },
  },
};

// ---------------------- site measurements ----------------------
const siteMeasurementsBase = tableCrud('site_measurement_projects');
export const siteMeasurementsApi = {
  ...siteMeasurementsBase,
  addRoom: async (projectId: string, body: any): Promise<Envelope<any>> => {
    const row = unwrap(
      await supabase
        .from('site_measurement_rooms')
        .insert({ ...body, project_id: projectId })
        .select()
        .single(),
    );
    return { data: row };
  },
  updateRoom: async (_projectId: string, roomId: string, body: any): Promise<Envelope<any>> => {
    const row = unwrap(
      await supabase
        .from('site_measurement_rooms')
        .update(body)
        .eq('id', roomId)
        .select()
        .single(),
    );
    return { data: row };
  },
  removeRoom: async (_projectId: string, roomId: string): Promise<void> => {
    const { error } = await supabase.from('site_measurement_rooms').delete().eq('id', roomId);
    if (error) throw new ApiError(400, error.message, error);
  },
  addPhoto: async (
    _projectId: string,
    roomId: string,
    body: any,
  ): Promise<Envelope<any>> => {
    const row = unwrap(
      await supabase
        .from('room_photos')
        .insert({ ...body, room_id: roomId })
        .select()
        .single(),
    );
    return { data: row };
  },
  removePhoto: async (
    _projectId: string,
    _roomId: string,
    photoId: string,
  ): Promise<void> => {
    const { error } = await supabase.from('room_photos').delete().eq('id', photoId);
    if (error) throw new ApiError(400, error.message, error);
  },
};

// ---------------------- feedback ----------------------
export const feedbackApi = {
  create: async (body: any): Promise<Envelope<any>> => {
    const uid = await requireUserId();
    const row = unwrap(
      await supabase.from('feedback').insert({ ...body, user_id: uid }).select().single(),
    );
    return { data: row };
  },
};

// Legacy generic HTTP helpers kept as no-ops so any stray imports don't crash.
// Prefer the typed resource helpers above.
export const api = {
  get:    async <T = unknown>(_p: string): Promise<T> => { throw new ApiError(410, 'HTTP api disabled; use resource helpers'); },
  post:   async <T = unknown>(_p: string, _b?: unknown): Promise<T> => { throw new ApiError(410, 'HTTP api disabled'); },
  put:    async <T = unknown>(_p: string, _b?: unknown): Promise<T> => { throw new ApiError(410, 'HTTP api disabled'); },
  patch:  async <T = unknown>(_p: string, _b?: unknown): Promise<T> => { throw new ApiError(410, 'HTTP api disabled'); },
  delete: async <T = unknown>(_p: string): Promise<T> => { throw new ApiError(410, 'HTTP api disabled'); },
};
