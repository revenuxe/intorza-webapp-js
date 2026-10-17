/**
 * Intorza API client — Supabase-backed.
 *
 * Requests go directly to Supabase, using the `{ data }` envelope surface
 * imported by the rest of the application.
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
function tableCrud<T = any>(table: string, opts: { userScoped?: boolean; ownerColumn?: 'user_id' | 'company_id' } = { userScoped: true }) {
  const scoped = opts.userScoped !== false;
  const ownerColumn = opts.ownerColumn || 'user_id';
  return {
    list: async (): Promise<Envelope<T[]>> => {
      let q: any = supabase.from(table as any).select('*').order('created_at', { ascending: false });
      if (scoped) {
        const uid = await requireUserId();
        q = q.eq(ownerColumn, uid);
      }
      const rows = unwrap(await q);
      return { data: (rows as T[]) || [] };
    },
    get: async (id: string): Promise<Envelope<T>> => {
      let query = supabase.from(table as any).select('*').eq('id', id);
      if (scoped) query = query.eq(ownerColumn, await requireUserId());
      const row = unwrap(await query.maybeSingle());
      if (!row) throw new ApiError(404, `${table} not found`);
      return { data: row as T };
    },
    create: async (body: Partial<T>): Promise<Envelope<T>> => {
      const payload: any = { ...body };
      if (scoped) payload[ownerColumn] = await requireUserId();
      const row = unwrap(await supabase.from(table as any).insert(payload).select().single());
      return { data: row as T };
    },
    update: async (id: string, body: Partial<T>): Promise<Envelope<T>> => {
      const { id: _id, user_id: _owner, created_at: _created, ...updates } = body as any;
      if (scoped) delete updates[ownerColumn];
      let query = supabase.from(table as any).update(updates).eq('id', id);
      if (scoped) query = query.eq(ownerColumn, await requireUserId());
      const row = unwrap(await query.select().maybeSingle());
      if (!row) throw new ApiError(404, `${table} not found or could not be updated`);
      return { data: row as T };
    },
    remove: async (id: string): Promise<void> => {
      let query = supabase.from(table as any).delete().eq('id', id);
      if (scoped) query = query.eq(ownerColumn, await requireUserId());
      const { data, error } = await query.select('id');
      if (error) throw new ApiError(400, error.message, error);
      if (!data?.length) throw new ApiError(404, `${table} not found or could not be deleted`);
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
    await requireUserId();
    const row = unwrap(await supabase.rpc('save_quotation', { p_id: null, p_payload: body }));
    return { data: row };
  },
  update: async (id: string, body: any): Promise<Envelope<any>> => {
    await requireUserId();
    const row = unwrap(await supabase.rpc('save_quotation', { p_id: id, p_payload: body }));
    return { data: row };
  },
  remove: async (id: string): Promise<void> => {
    const uid = await requireUserId();
    const { data, error } = await supabase.from('quotations').delete().eq('id', id).eq('user_id', uid).select('id');
    if (error) throw new ApiError(400, error.message, error);
    if (!data?.length) throw new ApiError(404, 'Quotation not found or access denied');
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
    const { error } = await supabase.from('payments').delete().eq('id', paymentId).eq('invoice_id', _id);
    if (error) throw new ApiError(400, error.message, error);
  },
};

// ---------------------- other resources ----------------------
export const clientsApi = {
  ...tableCrud('clients'),
  deleteWithRecords: async (clientId: string | null, clientName: string, quotationIds: string[], invoiceIds: string[]) => {
    await requireUserId();
    return unwrap(await supabase.rpc('delete_client_records', { p_client_id: clientId, p_client_name: clientName,
      p_quotation_ids: quotationIds, p_invoice_ids: invoiceIds }));
  },
};
// Tasks are shared with assigned team members; their company/assignee RLS
// policies govern visibility. This table has company_id, not user_id.
export const tasksApi = tableCrud('tasks', { userScoped: false });
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
  terms: {
    ...tableCrud('terms_templates'),
    select: async (id: string): Promise<Envelope<any>> => {
      await requireUserId();
      const data = unwrap(await supabase.rpc('select_terms_template' as any, { p_id: id }));
      return { data };
    },
  },
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
  members: tableCrud('team_members', { ownerColumn: 'company_id' }),
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
  updateRoom: async (projectId: string, roomId: string, body: any): Promise<Envelope<any>> => {
    const { id: _id, project_id: _project, ...updates } = body;
    const row = unwrap(
      await supabase
        .from('site_measurement_rooms')
        .update(updates)
        .eq('id', roomId)
        .eq('project_id', projectId)
        .select()
        .single(),
    );
    return { data: row };
  },
  removeRoom: async (projectId: string, roomId: string): Promise<void> => {
    const { error } = await supabase.from('site_measurement_rooms').delete().eq('id', roomId).eq('project_id', projectId);
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
