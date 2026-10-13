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
  source: "library" | "default" | "disabled";
}

export function normalizeTermsSections(value: unknown): TermsSection[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((section, index) => {
    if (!section || typeof section !== "object") return [];
    const candidate = section as Partial<TermsSection>;
    const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
    const points = Array.isArray(candidate.points)
      ? candidate.points.filter((point): point is string => typeof point === "string")
        .map((point) => point.trim()).filter(Boolean)
      : [];
    if (!title || !points.length) return [];

    return [{
      id: typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id
        : `terms-${index + 1}`,
      title,
      points,
    }];
  });
}

export const isUsableTerms = (value: unknown): value is TermsSection[] =>
  normalizeTermsSections(value).length > 0;

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
  if (templates.length && templates.every(template => template.is_enabled === false)) {
    return { terms: [], templateId: null, templateName: 'Library terms disabled', source: 'disabled' };
  }
  if (!selected) {
    return { terms: normalizeTermsSections(fallback), templateId: null, templateName: fallbackName, source: "default" };
  }
  return {
    terms: normalizeTermsSections(selected.content),
    templateId: selected.id || null,
    templateName: selected.template_name?.trim() || "My Library terms",
    source: "library",
  };
}
