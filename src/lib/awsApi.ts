/**
 * AWS API Client for Intorza
 *
 * Centralized client for AWS API Gateway → Lambda → DynamoDB
 * Supabase is used ONLY for authentication.
 */

import { supabase } from "@/integrations/supabase/client";

/* =======================================================
   CONFIG
======================================================= */

const AWS_API_BASE_URL =
  "https://bqqxbtxch3.execute-api.ap-south-1.amazonaws.com";

/* =======================================================
   TYPES
======================================================= */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/* =======================================================
   AUTH
======================================================= */

const getAuthToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

/* =======================================================
   CORE REQUEST HANDLER
======================================================= */

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

    if (!response.ok) {
      return {
        success: false,
        error:
          parsed?.error ||
          parsed?.message ||
          `Request failed (${response.status})`,
      };
    }

    // 🔑 NORMALIZATION RULE
    // If AWS already returned { success, data }
    if (parsed && typeof parsed === "object" && "success" in parsed) {
      return parsed as ApiResponse<T>;
    }

    // Otherwise, wrap raw AWS object
    return {
      success: true,
      data: parsed as T,
    };
  } catch (err) {
    console.error("AWS API Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

/* =======================================================
   QUOTATIONS
======================================================= */

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
  apiRequest<QuotationPayload[]>(
    `/quotations?company_id=${companyId}`
  );

export const deleteQuotation = (quotationId: string) =>
  apiRequest(`/quotations/${quotationId}`, { method: "DELETE" });

/* =======================================================
   INVOICES
======================================================= */

export interface InvoicePayload {
  invoice_id: string;
  company_id: string;
  quotation_id?: string;
  invoice_number: string;
  client_name: string;
  project_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  invoice_date: string;
  due_date?: string;
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

/* =======================================================
   CLIENTS
======================================================= */

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

export const getClient = (clientId: string) =>
  apiRequest<ClientPayload>(`/clients/${clientId}`);

/* =======================================================
   HELPERS
======================================================= */

export const buildQuotationPayload = (
  quotationId: string,
  companyId: string,
  data: {
    quotationNumber: string;
    quotationTitle: string;
    clientName: string;
    clientAddress: string;
    dateOfProposal: string;
    validTill: string;
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
  const items = data.sections.flatMap(s => s.items);

  return {
    quotation_id: quotationId,
    company_id: companyId,
    quotation_number: data.quotationNumber,
    quotation_title: data.quotationTitle,
    client_name: data.clientName,
    client_address: data.clientAddress,
    city: data.placeOfProject,
    date_of_proposal: data.dateOfProposal,
    valid_till: data.validTill,
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
    items,
  };
};

