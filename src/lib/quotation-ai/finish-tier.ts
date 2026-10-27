import type { PriceEvidence } from './floor-plan';

export type FinishTier = 'Basic' | 'Standard' | 'Premium' | 'Luxury';
export const finishTierGuidance: Record<FinishTier, string> = {
  Basic: 'Durable economical materials, simple finishes and functional hardware.',
  Standard: 'Balanced everyday materials, finishes and hardware.',
  Premium: 'Upgraded materials, refined finishes and higher-specification hardware.',
  Luxury: 'Top-grade materials, bespoke detailing, high-end finishes and hardware.',
};

/** An ungraded reference must never silently price a higher/different tier. */
export function rateSupportsFinishTier(rate: PriceEvidence, tier: FinishTier) {
  if (rate.source === 'manual') return true;
  if (rate.finishTier) return rate.finishTier === tier;
  const labels = [...new Set(`${rate.name} ${rate.description}`.match(/\b(basic|standard|premium|luxury)\b/gi)?.map(value => value.toLowerCase()) ?? [])];
  return labels.length === 1 ? labels[0] === tier.toLowerCase() : labels.length === 0 && tier === 'Standard';
}

export function tierPricingSpecification(description: string, tier: FinishTier) {
  // Preserve exact legacy Standard specification matching. Other tiers need a
  // distinct search/cache identity even when the model outputs generic text.
  if (description.startsWith(`Requested finish tier: ${tier}.`)) return description;
  return tier === 'Standard' ? description : `Requested finish tier: ${tier}. ${finishTierGuidance[tier]} ${description}`.slice(0, 1000);
}
