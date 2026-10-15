import { reconcileSavedQuotation, remapDraftIds, type SavedSection } from './save-reconciliation';
import { draftFixture } from '@/test/floor-plan-fixtures';
const fixture = (): SavedSection[] => Array.from({ length: 7 }, (_, section) => ({ id: `section-${section}`, section_name: `Room ${section + 1}`, sort_order: section,
  items: Array.from({ length: 4 }, (_, item) => ({ id: `item-${section}-${item}`, product_name: `Product ${section}-${item}`, product_details: 'Full specifications', side: 'A', width_ft: 8, height_ft: 7, sft_area: 56, rate_per_sft: 1200, amount: 67200, sort_order: item })),
}));
it('verifies every section/item and reconciles newly assigned database IDs', () => {
  const submitted = fixture();
  const saved = submitted.map(section => ({ ...section, id: `saved-${section.id}`, items: section.items.map(item => ({ ...item, id: `saved-${item.id}` })) }));
  const mapping = reconcileSavedQuotation(submitted, saved);
  expect(Object.keys(mapping.sections)).toHaveLength(7); expect(Object.keys(mapping.items)).toHaveLength(28);
  expect(mapping.items['item-6-3']).toBe('saved-item-6-3');
  const draft = draftFixture(); draft.sections = submitted.map(section => ({ id: section.id, title: section.section_name, items: section.items.map(item => ({ id: item.id, productName: item.product_name, productDetails: item.product_details, side: 'A', measurementMode: 'dimensions', widthFt: 8, heightFt: 7, sftArea: null, ratePerSft: 1200 })) }));
  const remapped = remapDraftIds(draft, mapping);
  expect(remapped.sections).toHaveLength(7); expect(remapped.sections[6].items[3].id).toBe('saved-item-6-3');
  expect(draft.sections[6].items[3].id).toBe('item-6-3');
});
it('refuses partial or substituted saves instead of silently replacing editor content', () => {
  const submitted = fixture();
  expect(() => reconcileSavedQuotation(submitted, submitted.slice(0, 3))).toThrow('section count');
  const missing = fixture(); missing[6].items.pop();
  expect(() => reconcileSavedQuotation(submitted, missing)).toThrow('does not match');
  const changed = fixture(); changed[6].items[3].product_details = 'Wrong template';
  expect(() => reconcileSavedQuotation(submitted, changed)).toThrow('details differ');
});
