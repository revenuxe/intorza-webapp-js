import { describe, expect, it } from "@jest/globals";
import { resolveTermsTemplate } from "./termsResolver";

const fb = [{ id: "f", title: "FALLBACK", points: ["x"] }];
const t = (id: string, extra: object) => ({ id, template_name: id, content: [{ id: "1", title: id, points: ["p"] }], ...extra });

describe("resolveTermsTemplate", () => {
  it("prefers enabled default", () => {
    const r = resolveTermsTemplate([t("a", { updated_at: "2026-02-01" }), t("b", { is_default: true, updated_at: "2026-01-01" })], fb, "Default");
    expect(r.templateId).toBe("b");
  });
  it("uses most recent enabled when no default", () => {
    const r = resolveTermsTemplate([t("a", { updated_at: "2026-01-01" }), t("b", { updated_at: "2026-03-01" })], fb, "Default");
    expect(r.templateId).toBe("b");
  });
  it("skips disabled templates", () => {
    const r = resolveTermsTemplate([t("a", { is_default: true, is_enabled: false }), t("b", {})], fb, "Default");
    expect(r.templateId).toBe("b");
  });
  it("omits terms when all templates are disabled, without replacing them with generic terms", () => {
    expect(resolveTermsTemplate([t("a", { is_enabled: false })], fb, "Default").terms).toEqual([]);
  });
  it("falls back when no usable templates exist", () => {
    expect(resolveTermsTemplate([{ id: "c", content: [{ title: "", points: [] }] }], fb, "Default").terms).toBe(fb);
  });
});
