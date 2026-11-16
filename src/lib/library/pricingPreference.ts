import { libraryTierForName, type LibraryPricingTier } from './model';
// Only the display mode is remembered here, never account products or prices.
const key = 'intorza:library-pricing-mode';
export function preferredLibraryTier(): LibraryPricingTier {
  try { return libraryTierForName(localStorage.getItem(key)); } catch { return 'standard'; }
}
export function rememberLibraryTier(name?: string | null) {
  try { localStorage.setItem(key,libraryTierForName(name)); } catch { /* Optional view preference. */ }
}
