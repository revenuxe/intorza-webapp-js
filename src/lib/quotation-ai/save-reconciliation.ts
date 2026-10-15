import { draftSchema, type VoiceDraft } from './domain';
export type SavedItem = { id: string; product_name: string; product_details?: string | null; side?: string | null; width_ft?: number; height_ft?: number; sft_area?: number; rate_per_sft?: number; amount?: number; sort_order?: number };
export type SavedSection = { id: string; section_name: string; sort_order?: number; items: SavedItem[] };

/** Fail visibly on partial/mismatched persistence; map new database identities by verified order/content. */
export function reconcileSavedQuotation(submitted: SavedSection[], persisted: SavedSection[]) {
  const ordered = [...persisted].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (submitted.length !== ordered.length) throw new Error('Saved section count differs from the editor. Your editor is preserved; reload only after checking the save.');
  const sections: Record<string, string> = {}; const items: Record<string, string> = {};
  submitted.forEach((section, index) => {
    const saved = ordered[index];
    const savedItems = [...saved.items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (section.section_name !== saved.section_name || section.items.length !== savedItems.length) throw new Error(`The saved section “${section.section_name}” does not match the editor. No editor fields were replaced.`);
    sections[section.id] = saved.id;
    section.items.forEach((item, itemIndex) => {
      const savedItem = savedItems[itemIndex];
      for (const field of ['product_name','product_details','side'] as const) {
        if ((item[field] ?? '') !== (savedItem[field] ?? '')) throw new Error(`Saved item details differ in “${section.section_name}”. Your editor is preserved.`);
      }
      for (const field of ['width_ft','height_ft','sft_area','rate_per_sft','amount'] as const) {
        if (Math.abs(Number(item[field] ?? 0) - Number(savedItem[field] ?? 0)) > 0.0001) throw new Error(`Saved measurements or prices differ in “${section.section_name}”. Your editor is preserved.`);
      }
      items[item.id] = savedItem.id;
    });
  });
  return { sections, items };
}
export function remapDraftIds(draft: VoiceDraft, mapping: ReturnType<typeof reconcileSavedQuotation>) {
  return draftSchema.parse({ ...draft, sections: draft.sections.map(section => ({ ...section, id: mapping.sections[section.id] ?? section.id,
    items: section.items.map(item => ({ ...item, id: mapping.items[item.id] ?? item.id })),
  })) });
}
