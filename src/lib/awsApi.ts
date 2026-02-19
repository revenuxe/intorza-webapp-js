/**
 * AWS API Client for Intorza
 * 
 * This module provides a centralized client for communicating with the AWS backend.
 * All business data (quotations, invoices, clients, etc.) is stored in AWS DynamoDB.
 * Supabase is only used for authentication and storing reference IDs.
 */

import { supabase } from "@/integrations/supabase/client";

const AWS_API_BASE_URL = "https://bqqxbtxch3.execute-api.ap-south-1.amazonaws.com";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get the current user's JWT token from Supabase for AWS API authentication
 */
const getAuthToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Make an authenticated request to the AWS API directly (no proxy)
 */
const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${AWS_API_BASE_URL}${normalizedEndpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;

    // Support both shapes:
    // 1) AWS returns the object directly
    // 2) AWS returns { success, data, error/message }
    if (parsed && typeof parsed === "object" && "success" in parsed) {
      const wrapped = parsed as any;
      if (wrapped.success === false) {
        return { success: false, error: wrapped.error || wrapped.message || "API request failed" };
      }
      if (wrapped.success === true && "data" in wrapped) {
        return { success: true, data: wrapped.data as T };
      }
    }

    if (!response.ok) {
      const message =
        (parsed && (parsed.message || parsed.error)) ||
        `API request failed (${response.status})`;
      return { success: false, error: message };
    }

    return { success: true, data: parsed as T };
  } catch (error) {
    console.error("AWS API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// ==================== QUOTATIONS ====================

export interface QuotationItem {
  side: string;
  productName: string;
  productDetails: string;
  widthFt: number;
  heightFt: number;
  sftArea: number;
  ratePerSft: number;
  amount: number;
}

export interface QuotationSection {
  id: string;
  title: string;
  items: QuotationItem[];
}

export interface QuotationPayload {
  quotation_id: string;
  company_id: string;
  project_id?: string;
  client_id?: string;
  quotation_number: string;
  quotation_title: string;
  client_name: string;
  client_address: string;
  city: string;
  date_of_proposal: string;
  valid_till: string;
  project_deadline?: string;
  place_of_project: string;
  warranty: string;
  project_type: string;
  status: string;
  gst_enabled: boolean;
  gst_percentage: number;
  gst_amount: number;
  discount_amount: number;
  subtotal: number;
  grand_total: number;
  sections: QuotationSection[];
  items: QuotationItem[]; // Flattened list of all items
  total: number;
}

export const createQuotation = async (payload: QuotationPayload): Promise<ApiResponse> => {
  return apiRequest("/quotations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateQuotation = async (quotationId: string, payload: Partial<QuotationPayload>): Promise<ApiResponse> => {
  return apiRequest(`/quotations/${quotationId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const getQuotation = async (quotationId: string): Promise<ApiResponse<QuotationPayload>> => {
  return apiRequest(`/quotations/${quotationId}`, {
    method: "GET",
  });
};

export const listQuotations = async (companyId: string): Promise<ApiResponse<QuotationPayload[]>> => {
  return apiRequest(`/quotations?company_id=${companyId}`, {
    method: "GET",
  });
};

export const deleteQuotation = async (quotationId: string): Promise<ApiResponse> => {
  return apiRequest(`/quotations/${quotationId}`, {
    method: "DELETE",
  });
};

// ==================== INVOICES ====================

export interface InvoicePayload {
  invoice_id: string;
  company_id: string;
  user_id?: string;
  project_id?: string;
  quotation_id?: string;
  client_id?: string;
  invoice_number: string;
  client_name: string;
  project_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'unpaid' | 'partially_paid' | 'overdue' | string;
  action?: 'save' | 'share' | 'accept' | 'reject' | 'finalize' | 'payment' | 'delete';
  invoice_date: string;
  due_date?: string;
  notes?: string;
  items?: any[];
  sections?: any[];
  timestamps?: {
    created_at?: string;
    updated_at?: string;
    saved_at?: string;
    shared_at?: string;
    accepted_at?: string;
    rejected_at?: string;
    paid_at?: string;
  };
  payments?: Array<{
    amount: number;
    payment_date: string;
    payment_method: string;
    notes?: string;
  }>;
}

export const createInvoice = async (payload: InvoicePayload): Promise<ApiResponse> => {
  return apiRequest("/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateInvoice = async (invoiceId: string, payload: Partial<InvoicePayload>): Promise<ApiResponse> => {
  return apiRequest(`/invoices/${invoiceId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const getInvoice = async (invoiceId: string): Promise<ApiResponse<InvoicePayload>> => {
  return apiRequest(`/invoices/${invoiceId}`, {
    method: "GET",
  });
};

export const deleteInvoice = async (invoiceId: string): Promise<ApiResponse> => {
  return apiRequest(`/invoices/${invoiceId}`, {
    method: "DELETE",
  });
};

// ==================== CLIENTS ====================

export interface ClientPayload {
  client_id: string;
  company_id: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  city?: string;
}

export const createClient = async (payload: ClientPayload): Promise<ApiResponse> => {
  return apiRequest("/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateClient = async (clientId: string, payload: Partial<ClientPayload>): Promise<ApiResponse> => {
  return apiRequest(`/clients/${clientId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const getClient = async (clientId: string): Promise<ApiResponse<ClientPayload>> => {
  return apiRequest(`/clients/${clientId}`, {
    method: "GET",
  });
};

export const listClients = async (companyId: string): Promise<ApiResponse<ClientPayload[]>> => {
  return apiRequest(`/clients?company_id=${companyId}`, {
    method: "GET",
  });
};

export const deleteClient = async (clientId: string): Promise<ApiResponse> => {
  return apiRequest(`/clients/${clientId}`, {
    method: "DELETE",
  });
};

// ==================== SITE MEASUREMENTS ====================

export interface MeasurementPayload {
  measurement_id: string;
  company_id: string;
  project_id?: string;
  client_name: string;
  site_location: string;
  assigned_to?: string;
  status: string;
  total_area: number;
  room_count: number;
  photo_count: number;
  rooms?: any[];
}

export const createMeasurement = async (payload: MeasurementPayload): Promise<ApiResponse> => {
  return apiRequest("/measurements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateMeasurement = async (measurementId: string, payload: Partial<MeasurementPayload>): Promise<ApiResponse> => {
  return apiRequest(`/measurements/${measurementId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const getMeasurement = async (measurementId: string): Promise<ApiResponse<MeasurementPayload>> => {
  return apiRequest(`/measurements/${measurementId}`, {
    method: "GET",
  });
};

export const listMeasurements = async (companyId: string): Promise<ApiResponse<MeasurementPayload[]>> => {
  return apiRequest(`/measurements?company_id=${companyId}`, {
    method: "GET",
  });
};

export const deleteMeasurement = async (measurementId: string): Promise<ApiResponse> => {
  return apiRequest(`/measurements/${measurementId}`, {
    method: "DELETE",
  });
};

// ==================== TEMPLATES ====================

export interface TemplateCategoryPayload {
  category_id: string;
  company_id: string;
  name: string;
  type: string;
}

export interface TemplatePayload {
  template_id: string;
  company_id: string;
  category_id?: string;
  template_name: string;
  template_type: string;
  content: any;
  is_default?: boolean;
}

export interface TemplateItemPayload {
  item_id: string;
  company_id: string;
  product_name: string;
  product_details?: string;
  default_rate?: number;
  preferred_rate?: number;
  category?: string;
  usage_count?: number;
}

export const createTemplateCategory = async (payload: TemplateCategoryPayload): Promise<ApiResponse> => {
  return apiRequest("/template-categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const createTemplate = async (payload: TemplatePayload): Promise<ApiResponse> => {
  return apiRequest("/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const createTemplateItem = async (payload: TemplateItemPayload): Promise<ApiResponse> => {
  return apiRequest("/template-items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// ==================== LIBRARY / LEARNING DATA ====================

export interface LibraryItemPayload {
  item_id: string;
  company_id: string;
  product_name: string;
  product_details?: string;
  city: string;
  category: string;
  rate: number;
  area?: number;
  usage_count: number;
}

export interface LibrarySectionPayload {
  section_id: string;
  company_id: string;
  template_name: string;
  category: string;
  items: any[];
  usage_count: number;
}

export interface LibraryQuotePayload {
  quote_id: string;
  company_id: string;
  template_name: string;
  category: string;
  sections: any[];
  city: string;
  total: number;
  usage_count: number;
}

export interface ClientBehaviorPayload {
  behavior_id: string;
  company_id: string;
  client_id?: string;
  quotation_id?: string;
  city: string;
  category: string;
  template?: string;
  rate: number;
  area?: number;
  final_price: number;
  won_or_lost: "won" | "lost" | "pending";
  payment_days?: number;
}

export const createLibraryItem = async (payload: LibraryItemPayload): Promise<ApiResponse> => {
  return apiRequest("/library-items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const createLibrarySection = async (payload: LibrarySectionPayload): Promise<ApiResponse> => {
  return apiRequest("/library-sections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const createLibraryQuote = async (payload: LibraryQuotePayload): Promise<ApiResponse> => {
  return apiRequest("/library-quotes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const createClientBehavior = async (payload: ClientBehaviorPayload): Promise<ApiResponse> => {
  return apiRequest("/client-behavior", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// ==================== TEAMS ====================

/**
 * Team/Team Member entity - stored in intorza_teams table
 * Each team member is a row in the teams table, accessed via POST/PUT /teams
 */
export interface TeamPayload {
  team_id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  work_type: string;
  role: string;
  status?: string;
  daily_rate?: number;
  user_id?: string;
  permissions?: any;
  // Assignment data (optional - for project assignments)
  quotation_id?: string;
  assigned_at?: string;
  assigned_to?: string;
  // Attendance data (optional - for attendance records)
  attendance_id?: string;
  team_member_id?: string;
  clock_in?: string;
  clock_out?: string;
  clock_in_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  clock_out_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  // Task data (optional - for task records)
  task_id?: string;
  title?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create a new team member - POST /teams
 */
export const createTeam = async (payload: TeamPayload): Promise<ApiResponse> => {
  return apiRequest("/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/**
 * Update an existing team member - PUT /teams/:id
 */
export const updateTeam = async (teamId: string, payload: Partial<TeamPayload>): Promise<ApiResponse> => {
  return apiRequest(`/teams/${teamId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

/**
 * Get a specific team member - GET /teams/:id
 */
export const getTeam = async (teamId: string): Promise<ApiResponse<TeamPayload>> => {
  return apiRequest(`/teams/${teamId}`, {
    method: "GET",
  });
};

/**
 * List all team members for a company - GET /teams?company_id=xxx
 */
export const listTeams = async (companyId: string): Promise<ApiResponse<TeamPayload[]>> => {
  return apiRequest(`/teams?company_id=${companyId}`, {
    method: "GET",
  });
};

/**
 * Soft delete a team member - PUT /teams/:id with status='deleted'
 * Note: AWS API does not support DELETE, use PUT with status change instead
 */
export const deleteTeam = async (teamId: string): Promise<ApiResponse> => {
  return updateTeam(teamId, { status: 'deleted' });
};

/**
 * Get team member by user_id - GET /teams?user_id=xxx
 */
export const getTeamByUserId = async (userId: string): Promise<ApiResponse<TeamPayload>> => {
  return apiRequest(`/teams?user_id=${userId}`, {
    method: "GET",
  });
};

/**
 * List team members assigned to a project - GET /teams?quotation_id=xxx
 */
export const listTeamsByProject = async (quotationId: string): Promise<ApiResponse<TeamPayload[]>> => {
  return apiRequest(`/teams?quotation_id=${quotationId}`, {
    method: "GET",
  });
};

/**
 * List attendance records for a company - GET /teams?company_id=xxx&type=attendance
 */
export const listAttendanceByCompany = async (companyId: string, date?: string): Promise<ApiResponse<TeamPayload[]>> => {
  const queryDate = date || new Date().toISOString().split('T')[0];
  return apiRequest(`/teams?company_id=${companyId}&type=attendance&date=${queryDate}`, {
    method: "GET",
  });
};

/**
 * List attendance records for specific members - GET /teams?member_ids=xxx&type=attendance
 */
export const listAttendanceByMembers = async (memberIds: string[], days: number = 7): Promise<ApiResponse<TeamPayload[]>> => {
  return apiRequest(`/teams?member_ids=${memberIds.join(',')}&type=attendance&days=${days}`, {
    method: "GET",
  });
};

/**
 * List tasks for a member - GET /teams?member_id=xxx&type=tasks
 */
export const listTasksByMember = async (memberId: string): Promise<ApiResponse<TeamPayload[]>> => {
  return apiRequest(`/teams?member_id=${memberId}&type=tasks`, {
    method: "GET",
  });
};

/**
 * List tasks for a project - GET /teams?quotation_id=xxx&type=tasks
 */
export const listTasksByProject = async (quotationId: string): Promise<ApiResponse<TeamPayload[]>> => {
  return apiRequest(`/teams?quotation_id=${quotationId}&type=tasks`, {
    method: "GET",
  });
};

/**
 * List all tasks for a company - GET /teams?company_id=xxx&type=tasks
 */
export const listTasksByCompany = async (companyId: string): Promise<ApiResponse<TeamPayload[]>> => {
  return apiRequest(`/teams?company_id=${companyId}&type=tasks`, {
    method: "GET",
  });
};

/**
 * Soft delete a task - PUT /teams/:id with status='deleted'
 * Note: AWS API does not support DELETE, use PUT with status change instead
 */
export const deleteTask = async (taskId: string): Promise<ApiResponse> => {
  return updateTeam(taskId, { status: 'deleted' });
};

// ==================== FILES ====================

export interface FilePayload {
  file_id: string;
  company_id: string;
  project_id?: string;
  quote_id?: string;
  invoice_id?: string;
  file_url: string;
  file_type: "logo" | "signature" | "qr_code" | "room_photo" | "quote_pdf" | "invoice_pdf" | "document";
  file_name?: string;
}

export const createFileRecord = async (payload: FilePayload): Promise<ApiResponse> => {
  return apiRequest("/files", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// ==================== ADMIN LOGS ====================

export interface AdminLogPayload {
  log_id: string;
  company_id: string;
  user_id: string;
  action: string;
  object_type: "quotation" | "invoice" | "client" | "measurement" | "template" | "file" | "user" | "settings";
  object_id: string;
  timestamp: string;
  metadata?: any;
}

export const createAdminLog = async (payload: AdminLogPayload): Promise<ApiResponse> => {
  return apiRequest("/admin-logs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Log an admin action to AWS
 */
export const logAdminAction = async (
  companyId: string,
  userId: string,
  action: string,
  objectType: AdminLogPayload["object_type"],
  objectId: string,
  metadata?: any
): Promise<void> => {
  try {
    await createAdminLog({
      log_id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      company_id: companyId,
      user_id: userId,
      action,
      object_type: objectType,
      object_id: objectId,
      timestamp: new Date().toISOString(),
      metadata,
    });
  } catch (error) {
    // Silently fail - logging should not block operations
    console.error("Failed to log admin action:", error);
  }
};

/**
 * Record file upload in AWS after S3 upload
 */
export const recordFileUpload = async (
  companyId: string,
  fileUrl: string,
  fileType: FilePayload["file_type"],
  options?: {
    projectId?: string;
    quoteId?: string;
    invoiceId?: string;
    fileName?: string;
  }
): Promise<void> => {
  try {
    await createFileRecord({
      file_id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      company_id: companyId,
      file_url: fileUrl,
      file_type: fileType,
      project_id: options?.projectId,
      quote_id: options?.quoteId,
      invoice_id: options?.invoiceId,
      file_name: options?.fileName,
    });
  } catch (error) {
    // Silently fail - file recording should not block operations
    console.error("Failed to record file upload:", error);
  }
};

/**
 * Build quotation payload for AWS from local data
 */
export const buildQuotationPayload = (
  quotationId: string,
  companyId: string,
  data: {
    quotationNumber: string;
    quotationTitle: string;
    clientName: string;
    clientAddress: string;
    clientId?: string;
    projectId?: string;
    dateOfProposal: string;
    validTill: string;
    projectDeadline?: string;
    placeOfProject: string;
    warranty: string;
    projectType: string;
    status: string;
    gstEnabled: boolean;
    gstPercentage: number;
    gstAmount: number;
    discountAmount: number;
    subtotal: number;
    grandTotal: number;
    sections: QuotationSection[];
  }
): QuotationPayload => {
  // Flatten all items for the items array
  const allItems = data.sections.flatMap(section => section.items);
  
  return {
    quotation_id: quotationId,
    company_id: companyId,
    project_id: data.projectId,
    client_id: data.clientId,
    quotation_number: data.quotationNumber,
    quotation_title: data.quotationTitle,
    client_name: data.clientName,
    client_address: data.clientAddress,
    city: data.placeOfProject,
    date_of_proposal: data.dateOfProposal,
    valid_till: data.validTill,
    project_deadline: data.projectDeadline,
    place_of_project: data.placeOfProject,
    warranty: data.warranty,
    project_type: data.projectType,
    status: data.status,
    gst_enabled: data.gstEnabled,
    gst_percentage: data.gstPercentage,
    gst_amount: data.gstAmount,
    discount_amount: data.discountAmount,
    subtotal: data.subtotal,
    grand_total: data.grandTotal,
    total: data.grandTotal,
    sections: data.sections,
    items: allItems,
  };
};
