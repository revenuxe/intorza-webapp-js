import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, Globe } from 'lucide-react';
import { COUNTRIES, POPULAR_COUNTRY_CODES, CountryConfig } from '@/lib/countries';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/hooks/use-toast';

interface CountrySelectionDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  isOnboarding?: boolean;
}

export const CountrySelectionDialog: React.FC<CountrySelectionDialogProps> = ({
  open,
  onOpenChange,
  isOnboarding = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setCountry } = useLocalization();
  const { toast } = useToast();

  const popularCountries = useMemo(() => {
    return COUNTRIES.filter(c => POPULAR_COUNTRY_CODES.includes(c.code));
  }, []);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      c => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleContinue = async () => {
    if (!selectedCountry) return;

    setIsSubmitting(true);
    try {
      await setCountry(selectedCountry);
      toast({
        title: 'Country selected',
        description: `Your preferences have been set for ${selectedCountry.name}`,
      });
      onOpenChange?.(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save country preference. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isOnboarding ? undefined : onOpenChange}>
      <DialogContent 
        className="sm:max-w-md max-h-[90vh] flex flex-col"
        onPointerDownOutside={isOnboarding ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isOnboarding ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Select Your Country</DialogTitle>
          <DialogDescription>
            This will set your currency, tax format, and measurement preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {!searchQuery && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Popular</p>
            <div className="grid grid-cols-2 gap-2">
              {popularCountries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                    selectedCountry?.code === country.code
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{country.name}</p>
                    <p className="text-xs text-muted-foreground">{country.currencySymbol} {country.currencyCode}</p>
                  </div>
                  {selectedCountry?.code === country.code && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 max-h-[200px]">
          <div className="space-y-1">
            {!searchQuery && <p className="text-xs text-muted-foreground font-medium mb-2">All Countries</p>}
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                onClick={() => setSelectedCountry(country)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                  selectedCountry?.code === country.code
                    ? 'bg-primary/10'
                    : 'hover:bg-muted'
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{country.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {country.currencySymbol} {country.currencyCode} • {country.taxLabel}
                  </p>
                </div>
                {selectedCountry?.code === country.code && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>

        <Button
          onClick={handleContinue}
          disabled={!selectedCountry || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
