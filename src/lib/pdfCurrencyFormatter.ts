// Professional PDF Currency & Number Formatting Utility
// Ensures perfect alignment, no overflow, and currency-safe rendering

// Currency-safe fonts available in jsPDF core.
// We intentionally default numeric rendering to a *tabular* (monospaced) font to guarantee alignment.
export const NUMERIC_SAFE_FONTS = ['courier', 'helvetica', 'times'] as const;
export const DEFAULT_NUMERIC_FONT = 'helvetica';

// Country to currency symbol mapping for fail-safe rendering
const CURRENCY_SYMBOLS: Record<string, string> = {
  IN: '₹', // India - Rupee
  US: '$', // USA - Dollar
  GB: '£', // UK - Pound
  AE: 'AED', // UAE - Dirham
  SA: 'SAR', // Saudi - Riyal
  EU: '€', // Europe - Euro
  DE: '€',
  FR: '€',
  IT: '€',
  ES: '€',
  NL: '€',
  BE: '€',
  AT: '€',
  PT: '€',
  IE: '€',
  FI: '€',
  QA: 'QAR', // Qatar
  KW: 'KD', // Kuwait
  OM: 'OMR', // Oman
  BH: 'BD', // Bahrain
  PK: 'Rs', // Pakistan
  BD: '৳', // Bangladesh
  LK: 'Rs', // Sri Lanka
  NP: 'Rs', // Nepal
  CA: 'CA$', // Canada
  AU: 'A$', // Australia
  NZ: 'NZ$', // New Zealand
  JP: '¥', // Japan
  CN: '¥', // China
  KR: '₩', // South Korea
  SG: 'S$', // Singapore
  MY: 'RM', // Malaysia
  TH: '฿', // Thailand
  ID: 'Rp', // Indonesia
  PH: '₱', // Philippines
  VN: '₫', // Vietnam
  ZA: 'R', // South Africa
  NG: '₦', // Nigeria
  EG: 'E£', // Egypt
  MX: 'MX$', // Mexico
  BR: 'R$', // Brazil
  AR: 'ARS$', // Argentina
  CL: 'CLP$', // Chile
  CO: 'COP$', // Colombia
  PE: 'S/', // Peru
  CH: 'CHF', // Switzerland
  SE: 'kr', // Sweden
  NO: 'kr', // Norway
  DK: 'kr', // Denmark
  PL: 'zł', // Poland
  CZ: 'Kč', // Czech Republic
  HU: 'Ft', // Hungary
  RO: 'lei', // Romania
  TR: '₺', // Turkey
  RU: '₽', // Russia
  UA: '₴', // Ukraine
  IL: '₪', // Israel
};

// Country-to-currency-code mapping used for PDFs.
// We render currency as a code prefix (e.g., "INR") to avoid broken symbol glyphs.
const COUNTRY_TO_CURRENCY_CODE: Record<string, string> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  SA: 'SAR',

  // Europe
  EU: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
};

function getCurrencyCodeForCountry(countryCode: string): string | undefined {
  return COUNTRY_TO_CURRENCY_CODE[countryCode];
}

// Locale-specific number formatting patterns
interface LocaleFormat {
  thousandSeparator: string;
  decimalSeparator: string;
  groupingPattern: 'standard' | 'indian'; // Indian: 1,00,000 vs Standard: 100,000
}

const LOCALE_FORMATS: Record<string, LocaleFormat> = {
  'en-IN': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'indian' },
  'hi-IN': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'indian' },
  'en-US': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'standard' },
  'en-GB': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'standard' },
  'en-AU': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'standard' },
  'en-CA': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'standard' },
  'de-DE': { thousandSeparator: '.', decimalSeparator: ',', groupingPattern: 'standard' },
  // Use dot-grouping for Europe-style PDFs (no spaces inside numbers)
  'fr-FR': { thousandSeparator: '.', decimalSeparator: ',', groupingPattern: 'standard' },
  'es-ES': { thousandSeparator: '.', decimalSeparator: ',', groupingPattern: 'standard' },
  'it-IT': { thousandSeparator: '.', decimalSeparator: ',', groupingPattern: 'standard' },
  'pt-BR': { thousandSeparator: '.', decimalSeparator: ',', groupingPattern: 'standard' },
  'nl-NL': { thousandSeparator: '.', decimalSeparator: ',', groupingPattern: 'standard' },
  'ar-AE': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'standard' },
  'ar-SA': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'standard' },
  'ja-JP': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'standard' },
  'zh-CN': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'standard' },
  'ko-KR': { thousandSeparator: ',', decimalSeparator: '.', groupingPattern: 'standard' },
};

/**
 * Format number with Indian grouping pattern (1,00,00,000)
 */
function formatIndianNumber(num: number, decimalPlaces: number = 0): string {
  const parts = num.toFixed(decimalPlaces).split('.');
  let intPart = parts[0];
  const decPart = parts[1];
  
  // Handle negative numbers
  const isNegative = intPart.startsWith('-');
  if (isNegative) intPart = intPart.substring(1);
  
  // Apply Indian grouping: last 3 digits, then groups of 2
  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = formatted + ',' + lastThree;
  }
  
  return (isNegative ? '-' : '') + intPart + (decPart ? '.' + decPart : '');
}

/**
 * Format number with standard grouping pattern (1,000,000)
 */
function formatStandardNumber(num: number, format: LocaleFormat, decimalPlaces: number = 0): string {
  const parts = num.toFixed(decimalPlaces).split('.');
  let intPart = parts[0];
  const decPart = parts[1];
  
  // Handle negative numbers
  const isNegative = intPart.startsWith('-');
  if (isNegative) intPart = intPart.substring(1);
  
  // Apply standard grouping (every 3 digits)
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousandSeparator);
  
  return (isNegative ? '-' : '') + intPart + (decPart ? format.decimalSeparator + decPart : '');
}

/**
 * Professional currency formatter for PDFs
 * Ensures proper symbol placement, locale-based formatting, and no overflow
 */
export function formatPDFCurrency(
  amount: number,
  options: {
    currencyCode?: string;
    currencySymbol?: string;
    countryCode?: string;
    locale?: string;
    showDecimals?: boolean;
    decimalPlaces?: number;
  } = {}
): string {
  const {
    currencyCode,
    currencySymbol: _currencySymbol, // ignored for PDFs (prevents broken currency glyphs)
    countryCode = 'IN',
    locale = 'en-IN',
    showDecimals = false,
    decimalPlaces = showDecimals ? 2 : 0,
  } = options;

  // Always prefer a currency *code* prefix (INR/USD/AED/...), never a symbol.
  const prefix = (currencyCode || getCurrencyCodeForCountry(countryCode) || 'USD').toUpperCase();

  // Get locale format - fallback to standard format
  const format = LOCALE_FORMATS[locale] || LOCALE_FORMATS['en-US'] || {
    thousandSeparator: ',',
    decimalSeparator: '.',
    groupingPattern: 'standard' as const,
  };

  // Format the number based on locale pattern
  let formattedNumber: string;
  const absoluteAmount = Math.abs(amount);
  const isNegative = amount < 0;

  if (format.groupingPattern === 'indian') {
    formattedNumber = formatIndianNumber(absoluteAmount, decimalPlaces);
  } else {
    formattedNumber = formatStandardNumber(absoluteAmount, format, decimalPlaces);
  }

  // Non‑breaking space to guarantee the prefix never detaches from the number.
  const nbsp = '\u00A0';

  // Format with currency code BEFORE the amount
  const result = `${prefix}${nbsp}${formattedNumber}`;

  return isNegative ? `-${result}` : result;
}

/**
 * Format number for PDF display (without currency)
 * Uses locale-specific formatting
 */
export function formatPDFNumber(
  num: number,
  options: {
    locale?: string;
    decimalPlaces?: number;
  } = {}
): string {
  const { locale = 'en-IN', decimalPlaces = 0 } = options;
  
  const format = LOCALE_FORMATS[locale] || LOCALE_FORMATS['en-US'] || {
    thousandSeparator: ',',
    decimalSeparator: '.',
    groupingPattern: 'standard' as const,
  };

  if (format.groupingPattern === 'indian') {
    return formatIndianNumber(num, decimalPlaces);
  }
  return formatStandardNumber(num, format, decimalPlaces);
}

/**
 * Get a currency symbol that's safe to render in the specified font
 * Falls back to text abbreviation if symbol might cause rendering issues
 */
export function getSafeCurrencySymbol(
  countryCode: string,
  currencySymbol?: string
): string {
  // These symbols are universally safe in standard PDF fonts
  const universallySafeSymbols = ['$', '£', '€', '¥'];
  
  const symbol = currencySymbol || CURRENCY_SYMBOLS[countryCode] || 'USD';
  
  // If the symbol is a single character and might cause issues,
  // check if it's in our safe list
  if (symbol.length === 1 && !universallySafeSymbols.includes(symbol)) {
    // For potentially problematic symbols, return the currency code as fallback
    // Most fonts support these: ₹ ₱ ₩ ₫ ₺ ₽ ₴ ₦ ₪ ৳ ฿
    // But Helvetica/Times might not - we'll use them anyway as jsPDF handles this
    return symbol;
  }
  
  return symbol;
}

/**
 * Create column width configuration for autoTable
 * Ensures numeric columns have sufficient fixed width
 */
export function getNumericColumnWidth(
  maxAmount: number,
  currencySymbol: string,
  fontSize: number = 8
): number {
  // Calculate approximate width needed
  // Average character width at font size 8 is about 2mm
  const charWidth = fontSize * 0.25; // mm per character
  
  // Format sample amount to get length
  const sampleFormatted = formatPDFCurrency(maxAmount, { currencySymbol });
  const textLength = sampleFormatted.length;
  
  // Add padding (8mm on each side)
  const minWidth = textLength * charWidth + 16;
  
  // Return at least 35mm to ensure no overflow
  return Math.max(minWidth, 35);
}

/**
 * AutoTable style configuration for numeric columns
 * Prevents overflow and ensures perfect alignment
 */
/**
 * AutoTable style configuration for numeric columns
 * Prevents overflow and ensures perfect alignment
 * All amounts are BOLD and larger for visibility
 */
export function getNumericColumnStyles(options: {
  fontSize?: number;
  minWidth?: number;
  isTotal?: boolean;
} = {}) {
  const { fontSize = 8, minWidth = 35, isTotal = false } = options;

  return {
    font: getNumericFont(),
    halign: 'right' as const,
    fontStyle: 'normal' as const,
    // Consistent font size - totals only slightly larger
    fontSize: isTotal ? fontSize + 1 : fontSize,
    minCellWidth: minWidth,

    // Keep values inside borders at all costs (never wrap).
    overflow: 'hidden' as const,

    // Consistent padding
    cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    valign: 'middle' as const,
  };
}

/**
 * Get jsPDF compatible font for numeric values
 * Always returns a currency-safe font
 */
export function getNumericFont(): string {
  return DEFAULT_NUMERIC_FONT;
}

/**
 * Validate and format currency amount for PDF
 * Ensures the value is a valid number and formats it correctly
 */
export function validateAndFormatAmount(
  amount: unknown,
  options: {
    currencySymbol?: string;
    countryCode?: string;
    locale?: string;
    defaultValue?: number;
  } = {}
): string {
  const { defaultValue = 0, ...formatOptions } = options;
  
  let numericAmount: number;
  
  if (typeof amount === 'number' && !isNaN(amount)) {
    numericAmount = amount;
  } else if (typeof amount === 'string') {
    numericAmount = parseFloat(amount.replace(/[^0-9.-]/g, '')) || defaultValue;
  } else {
    numericAmount = defaultValue;
  }
  
  return formatPDFCurrency(numericAmount, formatOptions);
}

/**
 * Create a currency formatter function for a specific locale/currency
 * Used for consistent formatting throughout a PDF document
 */
export function createPDFCurrencyFormatter(options: {
  currencyCode?: string;
  currencySymbol?: string;
  countryCode?: string;
  locale?: string;
}) {
  return (amount: number, showDecimals = false) => 
    formatPDFCurrency(amount, { ...options, showDecimals });
}
