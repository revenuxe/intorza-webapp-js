export type MeasurementInputUnit = 'sqft' | 'feet' | 'sqm' | 'metres';
export const SQFT_PER_SQM = 10.7639104167;
export function workAreaSqft(unit: MeasurementInputUnit, first: number, second?: number): number {
  if (!Number.isFinite(first) || first <= 0) throw new Error('Enter a positive measurement.');
  let area = first;
  if (unit === 'feet' || unit === 'metres') {
    if (second == null || !Number.isFinite(second) || second <= 0) throw new Error('Enter both work dimensions to calculate area.');
    area *= second;
  }
  if (unit === 'sqm' || unit === 'metres') area *= SQFT_PER_SQM;
  area = Math.round(area * 10000) / 10000;
  if (area <= 0 || area > 100000) throw new Error('Work coverage must be between 0.0001 and 100,000 sqft.');
  return area;
}
