const WARRANTY_YEARS_PATTERN = /^(\d+(?:\.\d+)?)\s*(?:years?|yrs?)?$/i;

export function normalizeWarrantyInput(value: string | null | undefined): string {
  const trimmedValue = value?.trim() ?? '';
  const match = trimmedValue.match(WARRANTY_YEARS_PATTERN);
  return match ? match[1] : trimmedValue;
}

export function formatWarrantyForPdf(value: string | null | undefined): string {
  const trimmedValue = value?.trim() ?? '';
  if (!trimmedValue) return '';

  const match = trimmedValue.match(WARRANTY_YEARS_PATTERN);
  if (!match) return trimmedValue;

  const years = match[1];
  return `${years} ${Number(years) === 1 ? 'Year' : 'Years'}`;
}
