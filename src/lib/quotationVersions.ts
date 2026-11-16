export type VersionItem = Record<string, unknown> & {
  id?: string; product_name: string; product_details?: string | null;
  specifications?: unknown; amount?: number | null; sft_area?: number | null;
  rate_per_sft?: number | null; measurement_unit?: string;
};
export type VersionSection = { id?: string; section_name: string; items: VersionItem[] };
export type QuotationSnapshot = Record<string, unknown> & { sections: VersionSection[] };
export type QuotationVersion = { id: string; quotation_id: string; version_number: number; saved_at: string };
export type QuotationVersionDetail = QuotationVersion & { snapshot: QuotationSnapshot };
export type VersionChange = { label: string; before: string; after: string };

const labels: Record<string, string> = {
  quotation_title: 'Title', project_name: 'Project name', quotation_number: 'Quotation number',
  client_id: 'Client', client_name: 'Client name', client_address: 'Client address',
  date_of_proposal: 'Proposal date', valid_till: 'Valid till', project_deadline: 'Project deadline',
  place_of_project: 'Project location', warranty: 'Warranty', project_type: 'Project type',
  subtotal: 'Subtotal', grand_total: 'Grand total', gst_enabled: 'Tax enabled',
  gst_percentage: 'Tax rate', gst_amount: 'Tax amount', discount_amount: 'Discount',
  status: 'Status', notes: 'Notes', product_name: 'Product', product_details: 'Details',
  specifications: 'Specifications', side: 'Side', depth: 'Depth', measurement_unit: 'Unit',
  width_ft: 'Width', height_ft: 'Height', sft_area: 'Quantity / area',
  rate_per_sft: 'Rate', amount: 'Amount', gallery_image_ids: 'Images',
};
const ignored = new Set(['id', 'sort_order', 'created_at', 'updated_at', 'user_id', 'reference_no']);
function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(entry => typeof entry === 'object' && entry && 'label' in entry
    ? `${entry.label}: ${entry.value}` : String(entry)).join(', ') || '—';
  return String(value);
}
export function quotationVersionChanges(before: QuotationSnapshot | null, after: QuotationSnapshot): VersionChange[] {
  if (!before) return [];
  const changes: VersionChange[] = [];
  const compare = (old: Record<string, unknown>, next: Record<string, unknown>, prefix = '') => {
    for (const key of new Set([...Object.keys(old), ...Object.keys(next)])) {
      if (ignored.has(key) || key === 'sections' || key === 'items') continue;
      if (JSON.stringify(old[key] ?? null) !== JSON.stringify(next[key] ?? null)) {
        changes.push({ label: `${prefix}${labels[key] || key}`, before: display(old[key]), after: display(next[key]) });
      }
    }
  };
  compare(before, after);
  // Compare ordered content rather than database IDs, which can change on revert.
  for (let s = 0; s < Math.max(before.sections.length, after.sections.length); s++) {
    const old = before.sections[s], next = after.sections[s];
    const prefix = `Room ${s + 1} · ${next?.section_name || old?.section_name}`;
    if (!old || !next) {
      changes.push({ label: prefix, before: old ? `${old.items.length} items` : '—', after: next ? `${next.items.length} items` : 'Removed' });
      continue;
    }
    if (old.section_name !== next.section_name) changes.push({ label: `Room ${s + 1} name`, before: old.section_name, after: next.section_name });
    for (let i = 0; i < Math.max(old.items.length, next.items.length); i++) {
      const previousItem = old.items[i], item = next.items[i];
      const itemLabel = `${prefix} · Item ${i + 1}`;
      if (!previousItem || !item) changes.push({ label: itemLabel, before: previousItem?.product_name || '—', after: item?.product_name || 'Removed' });
      else compare(previousItem, item, `${itemLabel} · `);
    }
  }
  return changes;
}
