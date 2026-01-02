import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getCountryByCode, getDefaultCountry, CountryConfig } from '@/lib/countryConfig';

export interface LocalizationSettings {
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  locale: string;
  decimalPlaces: number;
  taxLabel: string;
  taxShortLabel: string;
  taxRegistrationLabel: string;
  defaultTaxRate: number;
  commonTaxRates: number[];
  measurementSystem: 'metric' | 'imperial';
  areaUnit: string;
  areaUnitShort: string;
  lengthUnit: string;
  lengthUnitShort: string;
  dateFormat: string;
  thousandSeparator: string;
  decimalSeparator: string;
}

const DEFAULT_SETTINGS: LocalizationSettings = {
  countryCode: 'IN',
  currencyCode: 'INR',
  currencySymbol: '₹',
  currencyPosition: 'before',
  locale: 'en-IN',
  decimalPlaces: 2,
  taxLabel: 'Goods and Services Tax',
  taxShortLabel: 'GST',
  taxRegistrationLabel: 'GSTIN',
  defaultTaxRate: 18,
  commonTaxRates: [5, 12, 18, 28],
  measurementSystem: 'imperial',
  areaUnit: 'Square Feet',
  areaUnitShort: 'SFT',
  lengthUnit: 'Feet',
  lengthUnitShort: 'Ft',
  dateFormat: 'DD/MM/YYYY',
  thousandSeparator: ',',
  decimalSeparator: '.',
};

export const useLocalization = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<LocalizationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [countryConfig, setCountryConfig] = useState<CountryConfig | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('country_code, currency_symbol, locale, measurement_system, tax_label')
          .eq('id', user.id)
          .single();

        if (profile?.country_code) {
          const country = getCountryByCode(profile.country_code) || getDefaultCountry();
          setCountryConfig(country);
          
          setSettings({
            countryCode: country.code,
            currencyCode: country.currency.code,
            currencySymbol: profile.currency_symbol || country.currency.symbol,
            currencyPosition: country.currency.position,
            locale: profile.locale || country.currency.locale,
            decimalPlaces: country.currency.decimalPlaces,
            taxLabel: profile.tax_label || country.tax.label,
            taxShortLabel: country.tax.shortLabel,
            taxRegistrationLabel: country.tax.registrationLabel,
            defaultTaxRate: country.tax.defaultRate,
            commonTaxRates: country.tax.commonRates,
            measurementSystem: (profile.measurement_system as 'metric' | 'imperial') || country.measurement.system,
            areaUnit: country.measurement.areaUnit,
            areaUnitShort: country.measurement.areaUnitShort,
            lengthUnit: country.measurement.lengthUnit,
            lengthUnitShort: country.measurement.lengthUnitShort,
            dateFormat: country.dateFormat,
            thousandSeparator: country.numberFormat.thousandSeparator,
            decimalSeparator: country.numberFormat.decimalSeparator,
          });
        }
      } catch (error) {
        console.error('Error loading localization settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Format currency with proper symbol and locale
  const formatCurrency = useCallback((amount: number, showDecimals = false): string => {
    const { currencySymbol, currencyPosition, locale, decimalPlaces } = settings;
    
    const formattedNumber = amount.toLocaleString(locale, {
      minimumFractionDigits: showDecimals ? decimalPlaces : 0,
      maximumFractionDigits: showDecimals ? decimalPlaces : 0,
    });
    
    if (currencyPosition === 'before') {
      return `${currencySymbol}${formattedNumber}`;
    }
    return `${formattedNumber} ${currencySymbol}`;
  }, [settings]);

  // Format currency with short notation for large amounts
  const formatCurrencyShort = useCallback((amount: number): string => {
    const { currencySymbol, locale, countryCode } = settings;
    
    // Use region-specific abbreviations
    if (['IN', 'PK', 'BD', 'LK', 'NP'].includes(countryCode)) {
      // South Asian notation: Crore (Cr) and Lakh (L)
      if (amount >= 10000000) {
        return `${currencySymbol}${(amount / 10000000).toFixed(2)} Cr`;
      }
      if (amount >= 100000) {
        return `${currencySymbol}${(amount / 100000).toFixed(2)} L`;
      }
    } else {
      // International notation: M (millions), K (thousands)
      if (amount >= 1000000) {
        return `${currencySymbol}${(amount / 1000000).toFixed(2)}M`;
      }
      if (amount >= 1000) {
        return `${currencySymbol}${(amount / 1000).toFixed(1)}K`;
      }
    }
    
    return `${currencySymbol}${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
  }, [settings]);

  // Format number with locale-specific separators
  const formatNumber = useCallback((num: number, decimals = 0): string => {
    return num.toLocaleString(settings.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, [settings.locale]);

  // Format area with unit
  const formatArea = useCallback((area: number, short = true): string => {
    const unit = short ? settings.areaUnitShort : settings.areaUnit;
    return `${formatNumber(area, 2)} ${unit}`;
  }, [settings.areaUnit, settings.areaUnitShort, formatNumber]);

  // Format rate per area unit
  const formatRatePerArea = useCallback((rate: number): string => {
    return `${formatCurrency(rate)}/${settings.areaUnitShort.toLowerCase()}`;
  }, [settings.areaUnitShort, formatCurrency]);

  // Get area unit label for form fields
  const getAreaUnitLabel = useCallback((withRate = false): string => {
    const unit = settings.measurementSystem === 'metric' ? 'Sqm' : 'Sft';
    if (withRate) {
      return `Rate/${unit} (${settings.currencySymbol})`;
    }
    return unit;
  }, [settings.measurementSystem, settings.currencySymbol]);

  // Format date according to country settings
  const formatDate = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    switch (settings.dateFormat) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD.MM.YYYY':
        return `${day}.${month}.${year}`;
      default: // DD/MM/YYYY
        return `${day}/${month}/${year}`;
    }
  }, [settings.dateFormat]);

  // Format date with short month name
  const formatDateShort = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    if (settings.dateFormat === 'MM/DD/YYYY') {
      return `${month} ${day}, ${year}`;
    }
    return `${day} ${month} ${year}`;
  }, [settings.dateFormat]);

  // Get localization object for PDF generation
  const getPDFLocalization = useCallback(() => {
    return {
      currencyCode: settings.currencyCode,
      currencySymbol: settings.currencySymbol,
      locale: settings.locale,
      taxLabel: settings.taxShortLabel,
      taxRegistrationLabel: settings.taxRegistrationLabel,
      areaUnit: settings.areaUnit,
      areaUnitShort: settings.areaUnitShort,
    };
  }, [settings]);

  // Memoized return value
  return useMemo(() => ({
    settings,
    loading,
    countryConfig,
    formatCurrency,
    formatCurrencyShort,
    formatNumber,
    formatArea,
    formatRatePerArea,
    getAreaUnitLabel,
    formatDate,
    formatDateShort,
    getPDFLocalization,
  }), [
    settings,
    loading,
    countryConfig,
    formatCurrency,
    formatCurrencyShort,
    formatNumber,
    formatArea,
    formatRatePerArea,
    getAreaUnitLabel,
    formatDate,
    formatDateShort,
    getPDFLocalization,
  ]);
};

// Standalone helper for components without hook access
export const createLocalizationHelpers = (settings: LocalizationSettings) => {
  const formatCurrency = (amount: number, showDecimals = false): string => {
    const { currencySymbol, currencyPosition, locale, decimalPlaces } = settings;
    
    const formattedNumber = amount.toLocaleString(locale, {
      minimumFractionDigits: showDecimals ? decimalPlaces : 0,
      maximumFractionDigits: showDecimals ? decimalPlaces : 0,
    });
    
    if (currencyPosition === 'before') {
      return `${currencySymbol}${formattedNumber}`;
    }
    return `${formattedNumber} ${currencySymbol}`;
  };

  const formatNumber = (num: number, decimals = 0): string => {
    return num.toLocaleString(settings.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatRatePerArea = (rate: number): string => {
    return `${formatCurrency(rate)}/${settings.areaUnitShort.toLowerCase()}`;
  };

  return { formatCurrency, formatNumber, formatRatePerArea };
};
