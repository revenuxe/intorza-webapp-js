'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { readSnapshot, storageKey, loadAccountLibrary } from '@/lib/library/storage';
import { libraryProductSuggestions } from '@/lib/quotationProductSuggestions';
import type { Entries, Product, Category } from '@/lib/library/model';

type LibraryState = { owner: string; entries: Entries; legacy: { products: Product[]; categories: Category[] }; notice: string };
export function useQuotationLibrarySuggestions() {
  const { user, loading } = useAuth();
  const owner = user?.id || 'guest';
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<LibraryState | null>(null);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key === storageKey(user?.id || null)) refresh(); };
    const onLibrary = (event: Event) => { if ((event as CustomEvent).detail?.owner === (user?.id || null)) refresh(); };
    window.addEventListener('focus', refresh); window.addEventListener('storage', onStorage); window.addEventListener('intorza:library-changed', onLibrary);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', onStorage); window.removeEventListener('intorza:library-changed', onLibrary); };
  }, [user?.id]);
  useEffect(() => {
    if (loading) return;
    let active = true;
    let cached: ReturnType<typeof readSnapshot> = { entries: {}, pending: {} };
    try { cached = readSnapshot(user?.id || null); }
    catch { /* The public catalog still works when browser storage is unavailable. */ }
    setState({ owner, entries: cached.entries, legacy: { products: [], categories: [] }, notice: '' });
    if (user) void loadAccountLibrary(user.id).then(result => {
      if (active) setState({ owner, entries: { ...result.entries, ...cached.pending }, legacy: result.legacy, notice: '' });
    }).catch(() => { if (active) setState(current => current?.owner === owner ? { ...current, notice: 'Account library could not refresh. Showing catalog and locally saved prices.' } : current); });
    return () => { active = false; };
  }, [owner, loading, revision]);
  const current = !loading && state?.owner === owner ? state : null;
  const patterns = useMemo(() => libraryProductSuggestions(current?.entries || {}, current?.legacy.products, current?.legacy.categories), [current]);
  return { patterns, notice: current?.notice || '' };
}
