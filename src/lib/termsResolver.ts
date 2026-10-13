export interface TermsSection {
  id: string;
  title: string;
  points: string[];
}

export interface TermsTemplateRecord {
  id?: string;
  template_name?: string | null;
  content?: unknown;
  is_default?: boolean | null;
  is_enabled?: boolean | null;
  updated_at?: string | null;
}

export interface ResolvedTerms {
  terms: TermsSection[];
  templateId: string | null;
  templateName: string;
  source: "library" | "default";
}

export const isUsableTerms = (value: unknown): value is TermsSection[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.some((section) => {
    if (!section || typeof section !== "object") return false;
    const candidate = section as Partial<TermsSection>;
    return Boolean(
      candidate.title?.trim() &&
      Array.isArray(candidate.points) &&
      candidate.points.some((point) => typeof point === "string" && point.trim()),
    );
  });

export function resolveTermsTemplate(
  templates: TermsTemplateRecord[],
  fallback: TermsSection[],
  fallbackName: string,
): ResolvedTerms {
  const enabled = templates
    .filter((template) => template.is_enabled !== false && isUsableTerms(template.content))
    .sort((a, b) => {
      if (Boolean(a.is_default) !== Boolean(b.is_default)) return a.is_default ? -1 : 1;
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    });
  const selected = enabled[0];
  if (!selected || !isUsableTerms(selected.content)) {
    return { terms: fallback, templateId: null, templateName: fallbackName, source: "default" };
  }
  return {
    terms: selected.content,
    templateId: selected.id || null,
    templateName: selected.template_name?.trim() || "My Library terms",
    source: "library",
  };
}
