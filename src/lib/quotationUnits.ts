// Legacy field names hold quantities and rates in the selected billing unit.
export const quotationUnits = [
  ["Sq.ft","Square Feet"],
  ["Sq.m","Square Meter"],
  ["R.ft","Running Feet"],
  ["R.m","Running Meter"],
  ["Ft","Feet"],
  ["In","Inches"],
  ["mm","Millimeter"],
  ["Nos","Numbers"],
  ["Unit","Unit"],
  ["Set","Set"],
  ["Pair","Pair"],
  ["L.S.","Lump Sum"],
  ["Job","Job"],
  ["Point","Point"],
  ["Day","Day"],
  ["Hour","Hour"],
  ["Kg","Kilogram"],
  ["Ltr","Litre"],
  ["Cu.ft","Cubic Feet"],
  ["Cu.m","Cubic Meter"],
  ["Sheet","Sheet"],
  ["Box","Box"],
  ["Roll","Roll"],
  ["Panel","Panel"],
  ["Door","Door"],
  ["Room","Room"],
  ["Lot","Lot"],
] as const;
export const getQuotationUnit = (unit?: string | null) => quotationUnits.find(([value]) => value === unit)?.[0] ?? 'Sq.ft';
export const isAreaUnit = (unit?: string) => ['Sq.ft', 'Sq.m'].includes(getQuotationUnit(unit));
export const projectAreaSqft = (item: { measurementUnit?: string; sftArea: number }) =>
  isAreaUnit(item.measurementUnit) ? item.sftArea * (getQuotationUnit(item.measurementUnit) === 'Sq.m' ? 10.7639104167 : 1) : 0;
export function changeQuotationUnit<T extends { widthFt: number; heightFt: number; sftArea: number; ratePerSft: number; amount: number }>(item: T, unit: string) {
  return { ...item, measurementUnit: getQuotationUnit(unit), widthFt: 0, heightFt: 0, sftArea: 0, ratePerSft: 0, amount: 0 };
}
