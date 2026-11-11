import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { legacyLibrary, validateProduct, type Entries, type Entry } from './model';

export type Snapshot = { entries: Entries; pending: Entries };
export const storageKey = (owner: string | null) => 'intorza:product-library:v1:' + (owner || 'guest');
export function readSnapshot(owner: string | null): Snapshot {
  const raw = localStorage.getItem(storageKey(owner));
  if (!raw) return { entries: {}, pending: {} };
  const snapshot = JSON.parse(raw) as Snapshot;
  if (!snapshot.entries || !snapshot.pending) throw new Error('The saved library cannot be read. Your browser data has been left intact.');
  for (const [id, entry] of Object.entries(snapshot.entries)) {
    if (id !== entry.id || !['product', 'category'].includes(entry.kind)) throw new Error('The saved library contains an invalid record.');
    if (entry.data && entry.kind === 'product') validateProduct(entry.data as Parameters<typeof validateProduct>[0]);
  }
  return snapshot;
}
export function writeSnapshot(owner: string | null, snapshot: Snapshot) {
  localStorage.setItem(storageKey(owner), JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent('intorza:library-changed', { detail: { owner } }));
}
export async function loadAccountLibrary(owner: string) {
  const entries: Entries = {};
  const legacyRows: Parameters<typeof legacyLibrary>[0] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await supabase.from('library_personal_entries').select('*').eq('user_id', owner).order('entry_id').range(offset, offset + 499);
    if (result.error) throw result.error;
    for (const row of result.data || []) entries[row.entry_id] = { id: row.entry_id, kind: row.kind as Entry['kind'], data: row.data as unknown as Entry['data'], revision: row.revision };
    if ((result.data || []).length < 500) break;
  }
  for (let offset = 0; ; offset += 500) {
    const result = await supabase.from('item_usage_patterns').select('*').eq('user_id', owner).order('id').range(offset, offset + 499);
    if (result.error) throw result.error;
    legacyRows.push(...(result.data || []));
    if ((result.data || []).length < 500) break;
  }
  return { entries, legacy: legacyLibrary(legacyRows) };
}
export async function saveAccountEntries(owner: string, entries: Entry[]) {
  const result = await supabase.from('library_personal_entries').upsert(entries.map(entry => ({
    user_id: owner, entry_id: entry.id, kind: entry.kind, data: entry.data as unknown as Json,
    revision: entry.revision, updated_at: new Date().toISOString(),
  })), { onConflict: 'user_id,entry_id' });
  if (result.error) throw result.error;
}
