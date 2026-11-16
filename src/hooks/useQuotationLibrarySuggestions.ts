'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { useProductLibrary } from './useProductLibrary';
import { libraryProductSuggestions } from '@/lib/quotationProductSuggestions';
import { mergeLibrary, type LibraryPricingTier } from '@/lib/library/model';
import { rememberQuotationProduct, type RememberedQuotationProduct } from '@/lib/library/quotationMemory';
import { rememberLibraryTier } from '@/lib/library/pricingPreference';
export function useQuotationLibrarySuggestions(tier: LibraryPricingTier = 'standard') {
  const { user, loading } = useAuth();
  useEffect(() => { if (!loading) rememberLibraryTier(tier); }, [loading,tier]);
  const library = useProductLibrary(user?.id || null);
  const [saveError, setSaveError] = useState('');
  const patterns = useMemo(() => libraryProductSuggestions(loading ? {} : library.entries, loading ? [] : library.legacy.products, loading ? [] : library.legacy.categories,tier), [loading, library.entries, library.legacy,tier]);
  const remember = (item: RememberedQuotationProduct, selectedId?: string) => {
    if (loading || !library.ready) return;
    try {
      const updates = rememberQuotationProduct(mergeLibrary(library.entries, library.legacy.products, library.legacy.categories), item, selectedId,tier);
      if (updates.length) library.commit(updates);
      setSaveError('');
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Unable to save this product to My Library.'); }
  };
  return { patterns, remember, notice: saveError || library.error };
}
