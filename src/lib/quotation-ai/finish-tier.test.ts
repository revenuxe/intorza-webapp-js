import { rateSupportsFinishTier, tierPricingSpecification } from './finish-tier';
import type { PriceEvidence } from './floor-plan';

const rate: PriceEvidence = { id: 'r', name: 'Wardrobe', description: 'Laminate with functional hardware', rate: 1200,
  unit: 'sqft', source: 'approved', currency: 'INR', location: 'Bengaluru', verifiedAt: '2026-10-27', sourceUrl: null, inclusions: '' };

it('never treats an ungraded catalogue rate as Basic, Premium or Luxury', () => {
  expect(rateSupportsFinishTier(rate, 'Standard')).toBe(true);
  for (const tier of ['Basic', 'Premium', 'Luxury'] as const) expect(rateSupportsFinishTier(rate, tier)).toBe(false);
});
it('keeps tiers separate even for exact product names and explicit catalogue prices', () => {
  expect(rateSupportsFinishTier({ ...rate, description: 'Premium veneer with refined hardware' }, 'Luxury')).toBe(false);
  expect(rateSupportsFinishTier({ ...rate, description: 'Luxury bespoke cabinetry' }, 'Luxury')).toBe(true);
  expect(rateSupportsFinishTier({ ...rate, finishTier: 'Luxury' }, 'Standard')).toBe(false);
  expect(rateSupportsFinishTier({ ...rate, source: 'manual' }, 'Luxury')).toBe(true);
});
it('gives each finish tier a different search specification and does not duplicate it on retries', () => {
  const specifications = (['Basic','Standard','Premium','Luxury'] as const).map(tier => tierPricingSpecification(rate.description, tier));
  expect(new Set(specifications).size).toBe(4);
  const luxury = tierPricingSpecification(rate.description, 'Luxury');
  expect(luxury).toContain('high-end finishes');
  expect(tierPricingSpecification(luxury, 'Luxury')).toBe(luxury);
});
