/**
 * AWS Data Migration Utility
 * 
 * This module handles migrating existing Supabase data to AWS DynamoDB.
 * It reads data from Supabase and syncs it to AWS.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  createQuotation,
  buildQuotationPayload,
  createInvoice,
  createClient,
  createMeasurement,
  createLibraryItem,
  createLibrarySection,
  logAdminAction,
  type QuotationSection,
} from "./awsApi";

export interface MigrationProgress {
  total: number;
  completed: number;
  failed: number;
  currentItem: string;
  status: "idle" | "running" | "completed" | "failed";
  errors: string[];
}

export interface MigrationResult {
  quotations: { migrated: number; failed: number };
  invoices: { migrated: number; failed: number };
  clients: { migrated: number; failed: number };
  measurements: { migrated: number; failed: number };
  libraryItems: { migrated: number; failed: number };
  librarySections: { migrated: number; failed: number };
}

/**
 * Migrate all quotations from Supabase to AWS
 */
export const migrateQuotations = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ migrated: number; failed: number }> => {
  let migrated = 0;
  let failed = 0;
  const errors: string[] = [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch all quotations
  const { data: quotations, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("user_id", user.id);

  if (error) throw error;
  if (!quotations?.length) return { migrated: 0, failed: 0 };

  const total = quotations.length;

  for (const quotation of quotations) {
    try {
      onProgress?.({
        total,
        completed: migrated + failed,
        failed,
        currentItem: quotation.quotation_number,
        status: "running",
        errors,
      });

      // Fetch sections and items for this quotation
      const { data: sections } = await supabase
        .from("quotation_sections")
        .select("*, quotation_items(*)")
        .eq("quotation_id", quotation.id)
        .order("sort_order");

      const formattedSections: QuotationSection[] = (sections || []).map((s) => ({
        id: s.id,
        title: s.section_name,
        items: (s.quotation_items || []).map((item: any) => ({
          side: item.side || "",
          productName: item.product_name || "",
          productDetails: item.product_details || "",
          widthFt: item.width_ft || 0,
          heightFt: item.height_ft || 0,
          sftArea: item.sft_area || 0,
          ratePerSft: item.rate_per_sft || 0,
          amount: item.amount || 0,
        })),
      }));

      const payload = buildQuotationPayload(quotation.id, user.id, {
        quotationNumber: quotation.quotation_number,
        quotationTitle: quotation.quotation_title || quotation.project_name,
        clientName: quotation.client_name,
        clientAddress: quotation.client_address || "",
        clientId: quotation.client_id || undefined,
        dateOfProposal: quotation.date_of_proposal || "",
        validTill: quotation.valid_till || "",
        projectDeadline: quotation.project_deadline || undefined,
        placeOfProject: quotation.place_of_project || "",
        warranty: quotation.warranty || "",
        projectType: quotation.project_type || "",
        status: quotation.status || "draft",
        gstEnabled: quotation.gst_enabled || false,
        gstPercentage: quotation.gst_percentage || 0,
        gstAmount: quotation.gst_amount || 0,
        discountAmount: quotation.discount_amount || 0,
        subtotal: quotation.subtotal || 0,
        grandTotal: quotation.grand_total || 0,
        sections: formattedSections,
      });

      await createQuotation(payload);
      migrated++;
    } catch (err) {
      failed++;
      errors.push(`Quotation ${quotation.quotation_number}: ${err}`);
      console.error(`Failed to migrate quotation ${quotation.id}:`, err);
    }
  }

  onProgress?.({
    total,
    completed: migrated + failed,
    failed,
    currentItem: "",
    status: "completed",
    errors,
  });

  return { migrated, failed };
};

/**
 * Migrate all invoices from Supabase to AWS
 */
export const migrateInvoices = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ migrated: number; failed: number }> => {
  let migrated = 0;
  let failed = 0;
  const errors: string[] = [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id);

  if (error) throw error;
  if (!invoices?.length) return { migrated: 0, failed: 0 };

  const total = invoices.length;

  for (const invoice of invoices) {
    try {
      onProgress?.({
        total,
        completed: migrated + failed,
        failed,
        currentItem: invoice.invoice_number,
        status: "running",
        errors,
      });

      await createInvoice({
        invoice_id: invoice.id,
        company_id: user.id,
        quotation_id: invoice.quotation_id || undefined,
        client_id: invoice.client_id || undefined,
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        project_name: invoice.project_name,
        total_amount: invoice.total_amount,
        paid_amount: invoice.paid_amount || 0,
        remaining_amount: invoice.remaining_amount || 0,
        status: invoice.status || "unpaid",
        invoice_date: invoice.invoice_date || "",
        due_date: invoice.due_date || undefined,
        notes: invoice.notes || undefined,
      });

      migrated++;
    } catch (err) {
      failed++;
      errors.push(`Invoice ${invoice.invoice_number}: ${err}`);
      console.error(`Failed to migrate invoice ${invoice.id}:`, err);
    }
  }

  onProgress?.({
    total,
    completed: migrated + failed,
    failed,
    currentItem: "",
    status: "completed",
    errors,
  });

  return { migrated, failed };
};

/**
 * Migrate all clients from Supabase to AWS
 */
export const migrateClients = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ migrated: number; failed: number }> => {
  let migrated = 0;
  let failed = 0;
  const errors: string[] = [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id);

  if (error) throw error;
  if (!clients?.length) return { migrated: 0, failed: 0 };

  const total = clients.length;

  for (const client of clients) {
    try {
      onProgress?.({
        total,
        completed: migrated + failed,
        failed,
        currentItem: client.name,
        status: "running",
        errors,
      });

      await createClient({
        client_id: client.id,
        company_id: user.id,
        name: client.name,
        address: client.address || undefined,
        email: client.email || undefined,
        phone: client.phone || undefined,
      });

      migrated++;
    } catch (err) {
      failed++;
      errors.push(`Client ${client.name}: ${err}`);
      console.error(`Failed to migrate client ${client.id}:`, err);
    }
  }

  onProgress?.({
    total,
    completed: migrated + failed,
    failed,
    currentItem: "",
    status: "completed",
    errors,
  });

  return { migrated, failed };
};

/**
 * Migrate site measurements from Supabase to AWS
 */
export const migrateMeasurements = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ migrated: number; failed: number }> => {
  let migrated = 0;
  let failed = 0;
  const errors: string[] = [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: projects, error } = await supabase
    .from("site_measurement_projects")
    .select("*, site_measurement_rooms(*)")
    .eq("user_id", user.id);

  if (error) throw error;
  if (!projects?.length) return { migrated: 0, failed: 0 };

  const total = projects.length;

  for (const project of projects) {
    try {
      onProgress?.({
        total,
        completed: migrated + failed,
        failed,
        currentItem: project.client_name,
        status: "running",
        errors,
      });

      await createMeasurement({
        measurement_id: project.id,
        company_id: user.id,
        project_id: project.quotation_id || undefined,
        client_name: project.client_name,
        site_location: project.site_location || "",
        assigned_to: project.assigned_to || undefined,
        status: project.status,
        total_area: project.total_area || 0,
        room_count: project.room_count || 0,
        photo_count: project.photo_count || 0,
        rooms: project.site_measurement_rooms || [],
      });

      migrated++;
    } catch (err) {
      failed++;
      errors.push(`Measurement ${project.client_name}: ${err}`);
      console.error(`Failed to migrate measurement ${project.id}:`, err);
    }
  }

  onProgress?.({
    total,
    completed: migrated + failed,
    failed,
    currentItem: "",
    status: "completed",
    errors,
  });

  return { migrated, failed };
};

/**
 * Migrate library items from Supabase to AWS
 */
export const migrateLibraryItems = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ migrated: number; failed: number }> => {
  let migrated = 0;
  let failed = 0;
  const errors: string[] = [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: items, error } = await supabase
    .from("item_usage_patterns")
    .select("*")
    .eq("user_id", user.id);

  if (error) throw error;
  if (!items?.length) return { migrated: 0, failed: 0 };

  const total = items.length;

  for (const item of items) {
    try {
      onProgress?.({
        total,
        completed: migrated + failed,
        failed,
        currentItem: item.product_name,
        status: "running",
        errors,
      });

      await createLibraryItem({
        item_id: item.id,
        company_id: user.id,
        product_name: item.product_name,
        product_details: item.product_details || undefined,
        city: item.country_code || "",
        category: item.category || "general",
        rate: item.preferred_rate || item.default_rate || 0,
        usage_count: item.usage_count || 0,
      });

      migrated++;
    } catch (err) {
      failed++;
      errors.push(`Item ${item.product_name}: ${err}`);
      console.error(`Failed to migrate item ${item.id}:`, err);
    }
  }

  onProgress?.({
    total,
    completed: migrated + failed,
    failed,
    currentItem: "",
    status: "completed",
    errors,
  });

  return { migrated, failed };
};

/**
 * Migrate section templates from Supabase to AWS
 */
export const migrateLibrarySections = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ migrated: number; failed: number }> => {
  let migrated = 0;
  let failed = 0;
  const errors: string[] = [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: sections, error } = await supabase
    .from("section_templates")
    .select("*")
    .eq("user_id", user.id);

  if (error) throw error;
  if (!sections?.length) return { migrated: 0, failed: 0 };

  const total = sections.length;

  for (const section of sections) {
    try {
      onProgress?.({
        total,
        completed: migrated + failed,
        failed,
        currentItem: section.template_name,
        status: "running",
        errors,
      });

      await createLibrarySection({
        section_id: section.id,
        company_id: user.id,
        template_name: section.template_name,
        category: section.category || "general",
        items: (section.items as any) || [],
        usage_count: section.usage_count || 0,
      });

      migrated++;
    } catch (err) {
      failed++;
      errors.push(`Section ${section.template_name}: ${err}`);
      console.error(`Failed to migrate section ${section.id}:`, err);
    }
  }

  onProgress?.({
    total,
    completed: migrated + failed,
    failed,
    currentItem: "",
    status: "completed",
    errors,
  });

  return { migrated, failed };
};

/**
 * Run full migration for all data types
 */
export const runFullMigration = async (
  onProgress?: (type: string, progress: MigrationProgress) => void
): Promise<MigrationResult> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const result: MigrationResult = {
    quotations: { migrated: 0, failed: 0 },
    invoices: { migrated: 0, failed: 0 },
    clients: { migrated: 0, failed: 0 },
    measurements: { migrated: 0, failed: 0 },
    libraryItems: { migrated: 0, failed: 0 },
    librarySections: { migrated: 0, failed: 0 },
  };

  // Migrate in order (clients first, then quotations, then invoices, etc.)
  result.clients = await migrateClients((p) => onProgress?.("clients", p));
  result.quotations = await migrateQuotations((p) => onProgress?.("quotations", p));
  result.invoices = await migrateInvoices((p) => onProgress?.("invoices", p));
  result.measurements = await migrateMeasurements((p) => onProgress?.("measurements", p));
  result.libraryItems = await migrateLibraryItems((p) => onProgress?.("libraryItems", p));
  result.librarySections = await migrateLibrarySections((p) => onProgress?.("librarySections", p));

  // Log the migration
  await logAdminAction(
    user.id,
    user.id,
    "full_data_migration",
    "settings",
    "migration",
    result
  );

  return result;
};
