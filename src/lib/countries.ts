export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  measurementSystem: 'metric' | 'imperial';
  taxLabel: string;
  dateFormat: string;
  numberFormat: 'indian' | 'international';
  timezone: string;
  locale: string;
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currencyCode: 'INR',
    currencySymbol: '₹',
    measurementSystem: 'metric',
    taxLabel: 'GST',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'indian',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    measurementSystem: 'metric',
    taxLabel: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'international',
    timezone: 'Asia/Dubai',
    locale: 'en-AE',
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currencyCode: 'USD',
    currencySymbol: '$',
    measurementSystem: 'imperial',
    taxLabel: 'Sales Tax',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'international',
    timezone: 'America/New_York',
    locale: 'en-US',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currencyCode: 'GBP',
    currencySymbol: '£',
    measurementSystem: 'metric',
    taxLabel: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'international',
    timezone: 'Europe/London',
    locale: 'en-GB',
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    measurementSystem: 'metric',
    taxLabel: 'GST',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'international',
    timezone: 'Australia/Sydney',
    locale: 'en-AU',
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    measurementSystem: 'metric',
    taxLabel: 'GST/HST',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'international',
    timezone: 'America/Toronto',
    locale: 'en-CA',
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    measurementSystem: 'metric',
    taxLabel: 'GST',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'international',
    timezone: 'Asia/Singapore',
    locale: 'en-SG',
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    currencyCode: 'EUR',
    currencySymbol: '€',
    measurementSystem: 'metric',
    taxLabel: 'VAT',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: 'international',
    timezone: 'Europe/Berlin',
    locale: 'de-DE',
  },
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    currencyCode: 'EUR',
    currencySymbol: '€',
    measurementSystem: 'metric',
    taxLabel: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'international',
    timezone: 'Europe/Paris',
    locale: 'fr-FR',
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    currencyCode: 'SAR',
    currencySymbol: '﷼',
    measurementSystem: 'metric',
    taxLabel: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'international',
    timezone: 'Asia/Riyadh',
    locale: 'ar-SA',
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    flag: '🇳🇿',
    currencyCode: 'NZD',
    currencySymbol: 'NZ$',
    measurementSystem: 'metric',
    taxLabel: 'GST',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'international',
    timezone: 'Pacific/Auckland',
    locale: 'en-NZ',
  },
  {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    measurementSystem: 'metric',
    taxLabel: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'international',
    timezone: 'Africa/Johannesburg',
    locale: 'en-ZA',
  },
];

export const POPULAR_COUNTRY_CODES = ['IN', 'AE', 'US', 'GB', 'AU', 'CA'];

export const getCountryByCode = (code: string): CountryConfig | undefined => {
  return COUNTRIES.find(c => c.code === code);
};

export const getDefaultCountry = (): CountryConfig => {
  return COUNTRIES.find(c => c.code === 'US') || COUNTRIES[0];
};
