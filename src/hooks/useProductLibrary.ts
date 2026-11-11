'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { readSnapshot, writeSnapshot, loadAccountLibrary, saveAccountEntries, type Snapshot } from '@/lib/library/storage';
import { type Entry, type Product, type Category, type Entries } from '@/lib/library/model';

export function useProductLibrary(owner: string | null) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ entries: {}, pending: {} });
  const current = useRef(snapshot);
  const [legacy, setLegacy] = useState<{ products: Product[]; categories: Category[] }>({ products: [], categories: [] });
  const [ready, setReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(!owner);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [retry, setRetry] = useState(0);
  const active = useRef(true);
  const syncingRef = useRef(false);
  const persist = useCallback((next: Snapshot) => {
    // Save locally first. A storage failure never pretends the edit succeeded.
    writeSnapshot(owner, next);
    current.current = next; setSnapshot(next);
  }, [owner]);
  useEffect(() => {
    active.current = true;
    try { const saved = readSnapshot(owner); current.current = saved; setSnapshot(saved); setReady(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Browser storage is unavailable. Enable storage and retry.'); }
    return () => { active.current = false; };
  }, [owner]);
  useEffect(() => {
    if (!ready || !owner) return;
    let cancelled = false;
    setCloudReady(false);
    void loadAccountLibrary(owner).then(result => {
      if (cancelled) return;
      const next = { entries: { ...result.entries, ...current.current.pending }, pending: current.current.pending };
      persist(next); setLegacy(result.legacy); setCloudReady(true); setError('');
    }).catch(() => { if (!cancelled) setError('Account library could not be loaded. Cached changes are safe on this device. Retry to sync.'); });
    return () => { cancelled = true; };
  }, [ready, owner, retry, persist]);
  useEffect(() => {
    if (!owner || !cloudReady || !Object.keys(snapshot.pending).length || syncingRef.current || error) return;
    const timer = setTimeout(async () => {
      const batch = Object.values(current.current.pending).slice(0, 100);
      if (!batch.length) return;
      syncingRef.current = true; setSyncing(true);
      try {
        await saveAccountEntries(owner, batch);
        if (!active.current) return;
        const pending = { ...current.current.pending };
        for (const entry of batch) if (pending[entry.id]?.revision === entry.revision) delete pending[entry.id];
        persist({ entries: current.current.entries, pending });
      } catch { if (active.current) setError('Cloud save failed. Your edits are saved on this device. Retry when connected.'); }
      finally { syncingRef.current = false; if (active.current) setSyncing(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [snapshot, owner, cloudReady, error, persist, syncing]);
  useEffect(() => {
    const online = () => { setError(''); setRetry(value => value + 1); };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);
  const commit = (updates: Omit<Entry, 'revision'>[]) => {
    if (!ready) throw new Error('Library storage is not ready. Please retry.');
    const entries: Entries = { ...current.current.entries }, pending = { ...current.current.pending };
    for (const update of updates) {
      const entry: Entry = { ...update, revision: crypto.randomUUID() };
      entries[entry.id] = entry; if (owner) pending[entry.id] = entry;
    }
    try { persist({ entries, pending }); }
    catch { throw new Error('Browser storage is full or unavailable. The change has not been saved. Free space and retry.'); }
  };
  return { entries: snapshot.entries, legacy, commit, ready, cloudReady, error, syncing,
    pendingCount: Object.keys(snapshot.pending).length,
    retry: () => { setError(''); if (!ready) { try { const saved = readSnapshot(owner); current.current = saved; setSnapshot(saved); setReady(true); } catch { setError('Unable to read browser storage. Your saved data was not overwritten.'); } } else setRetry(value => value + 1); },
  };
}
