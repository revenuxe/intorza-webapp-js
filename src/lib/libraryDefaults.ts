import { supabase } from "@/integrations/supabase/client";
import { resolveTermsTemplate, type ResolvedTerms } from "@/lib/termsResolver";

export interface TermsSection {
  id: string;
  title: string;
  points: string[];
}

export const DEFAULT_QUOTATION_TERMS: TermsSection[] = [
  { id: "1", title: "PROJECT DURATION FOR 30 DAYS (AFTER DESIGN PHASE)", points: ["The execution phase will commence post-design approval and is estimated to be completed within 30 working days, subject to site readiness and material availability."] },
  { id: "2", title: "MATERIAL DISPATCH & EXECUTION PROCESS", points: ["Materials will be dispatched as per the approved design and timeline.", "Installation will be carried out by trained professionals ensuring quality standards."] },
  { id: "3", title: "SITE READINESS", points: ["The client must ensure that the site is ready with completed civil work, electrical points, plumbing, and false ceiling before execution begins.", "Any delays due to site unreadiness will extend the project timeline."] },
  { id: "4", title: "IMPLICATIONS OF PAYMENT DELAY", points: ["Delayed payments may result in project timeline extensions and additional charges.", "Timely payments ensure smooth project execution and delivery."] },
  { id: "5", title: "DESIGN PHASE TIMELINES & DELAY POLICY", points: ["Design approval is expected within 7-10 working days.", "Delays in design approval will proportionally delay the overall project timeline."] },
  { id: "6", title: "CHANGES DURING EXECUTION DUE TO TECHNICAL LIMITATION", points: ["Any on-site technical constraints may require minor design modifications.", "Such changes will be communicated and executed with client consent."] },
  { id: "7", title: "SERVICE WARRANTY & TRANSPARENCY", points: ["We provide a warranty on manufacturing defects and workmanship.", "All materials used will be as per approved specifications with complete transparency."] },
];

export const DEFAULT_INVOICE_TERMS: TermsSection[] = [
  { id: "1", title: "PAYMENT TERMS", points: ["Payment is due as per the agreed schedule.", "Please include the invoice number with every payment."] },
  { id: "2", title: "LATE PAYMENT", points: ["Delayed payments may affect the project schedule and delivery dates."] },
  { id: "3", title: "PAYMENT CONFIRMATION", points: ["A payment is considered complete after the funds are received and confirmed."] },
];

/**
 * Terms & Conditions for a document type.
 * Prefers the template flagged as default, otherwise falls back to the most
 * recently updated template the user saved, so terms always reach the PDF
 * even when the user never ticked "default".
 */
export async function getLibraryTerms(
  userId: string,
  templateType: "quotation" | "invoice",
): Promise<TermsSection[]> {
  return (await getResolvedLibraryTerms(userId, templateType)).terms;
}

export async function getResolvedLibraryTerms(
  userId: string,
  templateType: "quotation" | "invoice",
): Promise<ResolvedTerms> {
  const fallback = templateType === "invoice" ? DEFAULT_INVOICE_TERMS : DEFAULT_QUOTATION_TERMS;
  const { data, error } = await supabase
    .from("terms_templates")
    .select("id, template_name, content, is_default, is_enabled, updated_at")
    .eq("user_id", userId)
    .eq("template_type", templateType)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load your ${templateType} terms. Please retry before downloading. ${error.message}`);
  }
  return resolveTermsTemplate(data || [], fallback, `Default ${templateType} terms`);
}

/** Payment stages: default template, else most recently updated. */
export async function getLibraryPaymentStages(userId: string): Promise<any[] | null> {
  const { data } = await supabase
    .from("payment_templates")
    .select("stages, is_default, updated_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1);

  const stages = data?.[0]?.stages as unknown;
  return Array.isArray(stages) && stages.length > 0 ? (stages as any[]) : null;
}

/** Bank details: default template, else most recently updated. */
export async function getLibraryBankTemplate(userId: string) {
  const { data } = await supabase
    .from("bank_detail_templates")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1);

  return data?.[0] ?? null;
}
