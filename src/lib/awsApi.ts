/**
 * AWS API Client for Intorza (DIRECT – NO PROXY)
 *
 * - Supabase → Authentication only
 * - AWS API Gateway → All business data
 * - DynamoDB → Storage
 */

import { supabase } from "@/integrations/supabase/client";

const AWS_API_BASE_URL =
  "https://bqqxbtxch3.execute-api.ap-south-1.amazonaws.com";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get Supabase JWT
 */
const getAuthToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
};

/**
 * Direct AWS API request (NO PROXY)
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

    const response = await fetch(`${AWS_API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;

    // If backend uses { success, data, error }
    if (parsed && typeof parsed === "object" && "success" in parsed) {
      if (parsed.success === false) {
        return {
          success: false,
          error: parsed.error || parsed.message || "API request failed",
        };
      }
      return { success: true, data: parsed.data };
    }

    if (!response.ok) {
      return {
        success: false,
        error:
          parsed?.message ||
          parsed?.error ||
          `Request failed (${response.status})`,
      };
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

/* ======================================================
   QUOTATIONS
====================================================== */

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
  total: number;
  sections: QuotationSection[];
  items: QuotationItem[];
}

export const createQuotation = (payload: QuotationPayload) =>
  apiRequest("/quotations", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateQuotation = (
  quotationId: string,
  payload: Partial<QuotationPayload>
) =>
  apiRequest(`/quotations/${quotationId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const getQuotation = (quotationId: string) =>
  apiRequest<QuotationPayload>(`/quotations/${quotationId}`);

export const listQuotations = (companyId: string) =>
  apiRequest<QuotationPayload[]>(`/quotations?company_id=${companyId}`);

export const deleteQuotation = (quotationId: string) =>
  apiRequest(`/quotations/${quotationId}`, { method: "DELETE" });

/* ======================================================
   INVOICES
====================================================== */

export interface InvoicePayload {
  invoice_id: string;
  company_id: string;
  invoice_number: string;
  client_name: string;
  project_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  invoice_date: string;
  due_date?: string;
  notes?: string;
  items?: any[];
  sections?: any[];
  payments?: any[];
}

export const createInvoice = (payload: InvoicePayload) =>
  apiRequest("/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateInvoice = (
  invoiceId: string,
  payload: Partial<InvoicePayload>
) =>
  apiRequest(`/invoices/${invoiceId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const getInvoice = (invoiceId: string) =>
  apiRequest<InvoicePayload>(`/invoices/${invoiceId}`);

export const deleteInvoice = (invoiceId: string) =>
  apiRequest(`/invoices/${invoiceId}`, { method: "DELETE" });

/* ======================================================
   CLIENTS
====================================================== */

export interface ClientPayload {
  client_id: string;
  company_id: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  city?: string;
}

export const createClient = (payload: ClientPayload) =>
  apiRequest("/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateClient = (
  clientId: string,
  payload: Partial<ClientPayload>
) =>
  apiRequest(`/clients/${clientId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const getClient = (clientId: string) =>
  apiRequest<ClientPayload>(`/clients/${clientId}`);

/* ======================================================
   FILES
====================================================== */

export interface FilePayload {
  file_id: string;
  company_id: string;
  file_url: string;
  file_type: string;
  project_id?: string;
  quote_id?: string;
  invoice_id?: string;
  file_name?: string;
}

export const createFileRecord = (payload: FilePayload) =>
  apiRequest("/files", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/* ======================================================
   HELPERS
====================================================== */

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
  const allItems = data.sections.flatMap((s) => s.items);

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
