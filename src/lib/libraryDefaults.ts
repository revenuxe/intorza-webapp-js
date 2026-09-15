import { supabase } from "@/integrations/supabase/client";

export interface TermsSection {
  id: string;
  title: string;
  points: string[];
}

const isUsableTerms = (value: any): value is TermsSection[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.some((s) => s && s.title && Array.isArray(s.points) && s.points.some((p: string) => (p || "").trim()));

/**
 * Terms & Conditions for a document type.
 * Prefers the template flagged as default, otherwise falls back to the most
 * recently updated template the user saved, so terms always reach the PDF
 * even when the user never ticked "default".
 */
export async function getLibraryTerms(
  userId: string,
  templateType: "quotation" | "invoice",
): Promise<TermsSection[] | null> {
  const { data } = await supabase
    .from("terms_templates")
    .select("content, is_default, updated_at")
    .eq("user_id", userId)
    .eq("template_type", templateType)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1);

  const content = data?.[0]?.content as unknown;
  return isUsableTerms(content) ? (content as TermsSection[]) : null;
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
