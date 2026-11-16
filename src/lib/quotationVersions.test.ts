import { quotationVersionActivity, quotationVersionChanges, type QuotationSnapshot } from './quotationVersions';
const original: QuotationSnapshot = { quotation_title: 'Bedroom', grand_total: 100, sections: [{ id: 'room', section_name: 'Bedroom', items: [{ id: 'item', product_name: 'Wardrobe', rate_per_sft: 100, specifications: [{ label: 'Material', value: 'Plywood' }] }] }] };
const clone = (): QuotationSnapshot => JSON.parse(JSON.stringify(original));
it('shows saved field, rate and specification changes with before/after values', () => {
  const next = clone();
  next.quotation_title = 'Bedroom update'; next.grand_total = 200;
  next.sections[0].items[0].rate_per_sft = 200;
  next.sections[0].items[0].specifications = [{ label: 'Material', value: 'Oak' }];
  const changes = quotationVersionChanges(original, next);
  expect(changes).toEqual(expect.arrayContaining([
    { label: 'Title', before: 'Bedroom', after: 'Bedroom update' },
    { label: 'Grand total', before: '100', after: '200' },
    { label: 'Room 1 · Bedroom · Item 1 · Rate', before: '100', after: '200' },
    { label: 'Room 1 · Bedroom · Item 1 · Specifications', before: 'Material: Plywood', after: 'Material: Oak' },
  ]));
});
it('ignores regenerated identities when reverting a deleted room or item', () => {
  const next = clone();
  next.sections[0].id = 'new-room'; next.sections[0].items[0].id = 'new-item';
  expect(quotationVersionChanges(original, next)).toEqual([]);
});
it('reports added and removed rooms and items', () => {
  const next = clone();
  next.sections[0].items.push({ product_name: 'Bed' });
  next.sections.push({ section_name: 'Kitchen', items: [] });
  expect(quotationVersionChanges(original, next)).toEqual(expect.arrayContaining([
    { label: 'Room 1 · Bedroom · Item 2', before: '—', after: 'Bed' },
    { label: 'Room 2 · Kitchen', before: '—', after: '0 items' },
  ]));
  expect(quotationVersionChanges(next, original)).toEqual(expect.arrayContaining([
    { label: 'Room 1 · Bedroom · Item 2', before: 'Bed', after: 'Removed' },
  ]));
});

it('summarizes actual additions/removals without reporting shifted items as field edits', () => {
  const before: QuotationSnapshot = { sections: [{ id: 'room', section_name: 'Bedroom', items: [
    { id: 'bed', product_name: 'Bed' }, { id: 'desk', product_name: 'Desk' }, { id: 'wardrobe', product_name: 'Wardrobe' },
  ] }] };
  const after: QuotationSnapshot = { sections: [{ id: 'room', section_name: 'Bedroom', items: [
    { id: 'shelf', product_name: 'Shelf' }, { id: 'bed', product_name: 'Bed' }, { id: 'wardrobe', product_name: 'Wardrobe' },
  ] }] };
  expect(quotationVersionActivity(before,after)).toEqual([
    { kind: 'removed', label: 'Removed Desk from Bedroom' },
    { kind: 'added', label: 'Added Shelf to Bedroom' },
  ]);
});
it('excludes calculated totals, side defaults and all before/after field differences', () => {
  const next = clone();
  next.subtotal = 200; next.grand_total = 200;
  next.sections[0].items[0].side = 'A';
  next.sections[0].items[0].rate_per_sft = 200;
  next.sections[0].items[0].specifications = [{ label: 'Material', value: 'Oak' }];
  expect(quotationVersionActivity(original,next)).toEqual([]);
});
it('recognizes content with regenerated IDs and distinguishes duplicate item names', () => {
  const next = clone(); next.sections[0].id='new-room'; next.sections[0].items[0].id='new-item';
  expect(quotationVersionActivity(original,next)).toEqual([]);
  next.sections[0].items.push({ product_name: 'Wardrobe' });
  expect(quotationVersionActivity(original,next)).toEqual([{ kind: 'added', label: 'Added Wardrobe to Bedroom' }]);
});
it('summarizes rooms added or removed with clear names', () => {
  const next = clone(); next.sections.push({ section_name: 'Kitchen', items: [{ product_name: 'Cabinet' }] });
  expect(quotationVersionActivity(original,next)).toEqual([
    { kind: 'added', label: 'Added room: Kitchen' },
    { kind: 'added', label: 'Added Cabinet to Kitchen' },
  ]);
  expect(quotationVersionActivity(next,original)).toEqual([{ kind: 'removed', label: 'Removed room: Kitchen' }]);
});
