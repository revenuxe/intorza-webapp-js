import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Globe, Check } from "lucide-react";
import { COUNTRY_CONFIGS, CountryConfig } from "@/lib/countryConfig";

const COUNTRY_SELECTION_KEY = 'intorza_selected_country';
const COUNTRY_SELECTION_SHOWN_KEY = 'intorza_country_popup_shown';

interface CountrySelectionPopupProps {
  onCountrySelected?: (country: CountryConfig) => void;
}

export const CountrySelectionPopup = ({ onCountrySelected }: CountrySelectionPopupProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    // Check if popup has been shown before
    const hasShown = localStorage.getItem(COUNTRY_SELECTION_SHOWN_KEY);
    const savedCountry = localStorage.getItem(COUNTRY_SELECTION_KEY);
    
    if (!hasShown && !savedCountry) {
      // Small delay for better UX
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const filteredCountries = COUNTRY_CONFIGS.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group countries by region
  const getCountryGroups = () => {
    const groups: { [key: string]: CountryConfig[] } = {
      'South Asia': [],
      'Middle East': [],
      'North America': [],
      'Europe': [],
      'Southeast Asia': [],
      'East Asia': [],
      'Oceania': [],
      'Africa': [],
      'South America': [],
      'Central America & Caribbean': [],
    };

    const regionMap: { [key: string]: string } = {
      'IN': 'South Asia', 'PK': 'South Asia', 'BD': 'South Asia', 'LK': 'South Asia', 'NP': 'South Asia',
      'AE': 'Middle East', 'SA': 'Middle East', 'QA': 'Middle East', 'KW': 'Middle East', 'OM': 'Middle East', 'BH': 'Middle East', 'JO': 'Middle East', 'LB': 'Middle East', 'IQ': 'Middle East', 'EG': 'Middle East', 'TR': 'Middle East',
      'US': 'North America', 'CA': 'North America', 'MX': 'North America',
      'GB': 'Europe', 'DE': 'Europe', 'FR': 'Europe', 'IT': 'Europe', 'ES': 'Europe', 'NL': 'Europe', 'BE': 'Europe', 'AT': 'Europe', 'CH': 'Europe', 'SE': 'Europe', 'NO': 'Europe', 'DK': 'Europe', 'FI': 'Europe', 'PL': 'Europe', 'CZ': 'Europe', 'PT': 'Europe', 'IE': 'Europe', 'GR': 'Europe', 'HU': 'Europe', 'RO': 'Europe', 'UA': 'Europe', 'RU': 'Europe',
      'SG': 'Southeast Asia', 'MY': 'Southeast Asia', 'TH': 'Southeast Asia', 'ID': 'Southeast Asia', 'PH': 'Southeast Asia', 'VN': 'Southeast Asia', 'MM': 'Southeast Asia', 'KH': 'Southeast Asia',
      'CN': 'East Asia', 'JP': 'East Asia', 'KR': 'East Asia', 'TW': 'East Asia', 'HK': 'East Asia',
      'AU': 'Oceania', 'NZ': 'Oceania',
      'ZA': 'Africa', 'NG': 'Africa', 'KE': 'Africa', 'GH': 'Africa', 'TZ': 'Africa', 'UG': 'Africa', 'ET': 'Africa', 'MA': 'Africa', 'TN': 'Africa', 'DZ': 'Africa', 'RW': 'Africa', 'SN': 'Africa', 'CI': 'Africa', 'CM': 'Africa', 'AO': 'Africa', 'ZW': 'Africa', 'ZM': 'Africa', 'BW': 'Africa', 'MU': 'Africa', 'NA': 'Africa',
      'BR': 'South America', 'AR': 'South America', 'CL': 'South America', 'CO': 'South America', 'PE': 'South America', 'VE': 'South America', 'EC': 'South America', 'UY': 'South America', 'PY': 'South America', 'BO': 'South America',
      'PA': 'Central America & Caribbean', 'CR': 'Central America & Caribbean', 'JM': 'Central America & Caribbean', 'TT': 'Central America & Caribbean', 'DO': 'Central America & Caribbean', 'GT': 'Central America & Caribbean', 'HN': 'Central America & Caribbean', 'SV': 'Central America & Caribbean', 'NI': 'Central America & Caribbean', 'CU': 'Central America & Caribbean', 'PR': 'Central America & Caribbean', 'BB': 'Central America & Caribbean', 'BS': 'Central America & Caribbean',
    };

    filteredCountries.forEach(country => {
      const region = regionMap[country.code] || 'Other';
      if (groups[region]) {
        groups[region].push(country);
      }
    });

    return Object.entries(groups).filter(([_, countries]) => countries.length > 0);
  };

  const handleSelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
  };

  const handleConfirm = () => {
    if (selectedCountry) {
      localStorage.setItem(COUNTRY_SELECTION_KEY, selectedCountry);
      localStorage.setItem(COUNTRY_SELECTION_SHOWN_KEY, 'true');
      
      const country = COUNTRY_CONFIGS.find(c => c.code === selectedCountry);
      if (country && onCountrySelected) {
        onCountrySelected(country);
      }
      
      setOpen(false);
    }
  };

  const handleSkip = () => {
    // Default to India if skipped
    localStorage.setItem(COUNTRY_SELECTION_KEY, 'IN');
    localStorage.setItem(COUNTRY_SELECTION_SHOWN_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Select Your Country</DialogTitle>
              <DialogDescription className="text-sm">
                This helps us customize pricing and settings for you
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {getCountryGroups().map(([region, countries]) => (
              <div key={region}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{region}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {countries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => handleSelect(country.code)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                        selectedCountry === country.code
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="text-sm truncate flex-1">{country.name}</span>
                      {selectedCountry === country.code && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-6 pt-4 border-t flex gap-3 shrink-0">
          <Button variant="outline" onClick={handleSkip} className="flex-1">
            Skip
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedCountry} className="flex-1">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper to get saved country
export const getSavedCountry = (): CountryConfig | null => {
  const savedCode = localStorage.getItem(COUNTRY_SELECTION_KEY);
  if (savedCode) {
    return COUNTRY_CONFIGS.find(c => c.code === savedCode) || null;
  }
  return null;
};
