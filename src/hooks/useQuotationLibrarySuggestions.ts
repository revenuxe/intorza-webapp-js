'use client';
import { useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { useProductLibrary } from './useProductLibrary';
import { libraryProductSuggestions } from '@/lib/quotationProductSuggestions';
import { mergeLibrary } from '@/lib/library/model';
import { rememberQuotationProduct, type RememberedQuotationProduct } from '@/lib/library/quotationMemory';
export function useQuotationLibrarySuggestions() {
  const { user, loading } = useAuth();
  const library = useProductLibrary(user?.id || null);
  const [saveError, setSaveError] = useState('');
  const patterns = useMemo(() => libraryProductSuggestions(loading ? {} : library.entries, loading ? [] : library.legacy.products, loading ? [] : library.legacy.categories), [loading, library.entries, library.legacy]);
  const remember = (item: RememberedQuotationProduct, selectedId?: string) => {
    if (loading || !library.ready) return;
    try {
      const updates = rememberQuotationProduct(mergeLibrary(library.entries, library.legacy.products, library.legacy.categories), item, selectedId);
      if (updates.length) library.commit(updates);
      setSaveError('');
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Unable to save this product to My Library.'); }
  };
  return { patterns, remember, notice: saveError || library.error };
}
