import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CountryConfig, getCountryByCode, getDefaultCountry, COUNTRIES } from '@/lib/countries';

interface LocalizationContextType {
  country: CountryConfig | null;
  isLoading: boolean;
  needsCountrySelection: boolean;
  setCountry: (country: CountryConfig) => Promise<void>;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
  formatDate: (date: Date | string) => string;
  getMeasurementUnit: () => string;
  getTaxLabel: () => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [country, setCountryState] = useState<CountryConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsCountrySelection, setNeedsCountrySelection] = useState(false);

  // Load country preference from profile
  useEffect(() => {
    const loadCountryPreference = async () => {
      if (authLoading) return;
      
      if (!user) {
        setCountryState(null);
        setNeedsCountrySelection(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('country_code, country_name, currency_code, currency_symbol, measurement_system, tax_label, date_format, number_format, timezone, locale')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profile?.country_code) {
          const countryConfig = getCountryByCode(profile.country_code);
          if (countryConfig) {
            setCountryState(countryConfig);
            setNeedsCountrySelection(false);
          } else {
            // Country code exists but not in our list - use stored values
            setCountryState({
              code: profile.country_code,
              name: profile.country_name || 'Unknown',
              flag: '',
              currencyCode: profile.currency_code || 'USD',
              currencySymbol: profile.currency_symbol || '$',
              measurementSystem: (profile.measurement_system as 'metric' | 'imperial') || 'metric',
              taxLabel: profile.tax_label || 'Tax',
              dateFormat: profile.date_format || 'DD/MM/YYYY',
              numberFormat: (profile.number_format as 'indian' | 'international') || 'international',
              timezone: profile.timezone || 'UTC',
              locale: profile.locale || 'en-US',
            });
            setNeedsCountrySelection(false);
          }
        } else {
          // No country selected yet
          setNeedsCountrySelection(true);
        }
      } catch (error) {
        console.error('Error loading country preference:', error);
        setNeedsCountrySelection(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadCountryPreference();
  }, [user, authLoading]);

  const setCountry = useCallback(async (newCountry: CountryConfig) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          country_code: newCountry.code,
          country_name: newCountry.name,
          currency_code: newCountry.currencyCode,
          currency_symbol: newCountry.currencySymbol,
          measurement_system: newCountry.measurementSystem,
          tax_label: newCountry.taxLabel,
          date_format: newCountry.dateFormat,
          number_format: newCountry.numberFormat,
          timezone: newCountry.timezone,
          locale: newCountry.locale,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update existing library items with country code if they don't have one
      await Promise.all([
        supabase.from('item_usage_patterns').update({ country_code: newCountry.code }).eq('user_id', user.id).is('country_code', null),
        supabase.from('section_templates').update({ country_code: newCountry.code }).eq('user_id', user.id).is('country_code', null),
        supabase.from('payment_templates').update({ country_code: newCountry.code }).eq('user_id', user.id).is('country_code', null),
        supabase.from('terms_templates').update({ country_code: newCountry.code }).eq('user_id', user.id).is('country_code', null),
        supabase.from('bank_detail_templates').update({ country_code: newCountry.code }).eq('user_id', user.id).is('country_code', null),
        supabase.from('warranty_templates').update({ country_code: newCountry.code }).eq('user_id', user.id).is('country_code', null),
      ]);

      setCountryState(newCountry);
      setNeedsCountrySelection(false);
    } catch (error) {
      console.error('Error saving country preference:', error);
      throw error;
    }
  }, [user]);

  const formatCurrency = useCallback((amount: number): string => {
    if (!country) return `$${amount.toFixed(2)}`;
    
    const symbol = country.currencySymbol;
    
    if (country.numberFormat === 'indian') {
      // Indian number format: 1,00,000
      const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
      return `${symbol}${formatted}`;
    } else {
      // International format: 100,000
      const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
      return `${symbol}${formatted}`;
    }
  }, [country]);

  const formatNumber = useCallback((num: number): string => {
    if (!country) return num.toLocaleString('en-US');
    
    if (country.numberFormat === 'indian') {
      return new Intl.NumberFormat('en-IN').format(num);
    }
    return new Intl.NumberFormat('en-US').format(num);
  }, [country]);

  const formatDate = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!country) return d.toLocaleDateString();
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    switch (country.dateFormat) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD.MM.YYYY':
        return `${day}.${month}.${year}`;
      case 'DD/MM/YYYY':
      default:
        return `${day}/${month}/${year}`;
    }
  }, [country]);

  const getMeasurementUnit = useCallback((): string => {
    return country?.measurementSystem === 'imperial' ? 'sq ft' : 'sq ft';
  }, [country]);

  const getTaxLabel = useCallback((): string => {
    return country?.taxLabel || 'Tax';
  }, [country]);

  return (
    <LocalizationContext.Provider
      value={{
        country,
        isLoading,
        needsCountrySelection,
        setCountry,
        formatCurrency,
        formatNumber,
        formatDate,
        getMeasurementUnit,
        getTaxLabel,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
