import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Building2, Phone, ArrowRight, Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COUNTRY_CONFIGS, getCountryGroups, type CountryConfig } from "@/lib/countryConfig";
import { createDefaultTemplatesForUser, createDefaultItemsForUser } from "@/lib/defaultTemplates";

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

export const OnboardingDialog = ({ open, onComplete, userId }: OnboardingDialogProps) => {
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success("Logo uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        company_name: companyName || null,
        phone: phone || null,
        logo_url: logoUrl,
      };

      // Add country-specific settings
      if (selectedCountry) {
        updateData.country_code = selectedCountry.code;
        updateData.country_name = selectedCountry.name;
        updateData.currency_code = selectedCountry.currency.code;
        updateData.currency_symbol = selectedCountry.currency.symbol;
        updateData.tax_label = selectedCountry.tax.shortLabel;
        updateData.measurement_system = selectedCountry.measurement.system;
        updateData.locale = selectedCountry.currency.locale;
        updateData.date_format = selectedCountry.dateFormat;
        updateData.number_format = JSON.stringify(selectedCountry.numberFormat);
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // Create default templates and items for the selected country
      if (selectedCountry) {
        const [templatesResult, itemsResult] = await Promise.all([
          createDefaultTemplatesForUser(supabase, userId, selectedCountry.code),
          createDefaultItemsForUser(supabase, userId, selectedCountry.code)
        ]);

        if (templatesResult.count > 0 || itemsResult.count > 0) {
          toast.success(`Created ${templatesResult.count} templates and ${itemsResult.count} items for ${selectedCountry.name}`);
        }
      }

      toast.success("Profile setup complete!");
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !selectedCountry) {
      toast.error("Please select your country to continue");
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const skipStep = () => {
    if (step === 1) {
      // Country is required, can't skip
      toast.error("Please select your country to continue");
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const filteredCountries = searchQuery
    ? COUNTRY_CONFIGS.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const countryGroups = getCountryGroups();

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md max-h-[90vh]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {step === 1 && "Welcome! Select your country"}
            {step === 2 && "What's your company name?"}
            {step === 3 && "Add your company logo"}
            {step === 4 && "Add your contact number"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 1 && "This will set your currency, tax labels, and measurement units"}
            {step === 2 && "Your company name will appear on quotations and invoices"}
            {step === 3 && "Your logo will appear on quotations and invoices"}
            {step === 4 && "So clients can reach you easily"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 my-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="space-y-4 py-2">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Search Country
                </Label>
                <Input
                  placeholder="Search by country name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <ScrollArea className="h-[280px] rounded-md border p-2">
                {filteredCountries ? (
                  <div className="space-y-1">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => setSelectedCountry(country)}
                        className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                          selectedCountry?.code === country.code
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <span className="text-xl">{country.flag}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{country.name}</div>
                          <div className={`text-xs ${selectedCountry?.code === country.code ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {country.currency.symbol} • {country.tax.shortLabel} • {country.measurement.areaUnitShort}
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No countries found
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {countryGroups.map((group) => (
                      <div key={group.region}>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                          {group.region}
                        </div>
                        <div className="space-y-1">
                          {group.countries.map((country) => (
                            <button
                              key={country.code}
                              onClick={() => setSelectedCountry(country)}
                              className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                                selectedCountry?.code === country.code
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <span className="text-xl">{country.flag}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{country.name}</div>
                                <div className={`text-xs ${selectedCountry?.code === country.code ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                  {country.currency.symbol} • {country.tax.shortLabel} • {country.measurement.areaUnitShort}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {selectedCountry && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="font-medium mb-1">Selected: {selectedCountry.flag} {selectedCountry.name}</div>
                  <div className="text-muted-foreground text-xs space-y-0.5">
                    <div>Currency: {selectedCountry.currency.code} ({selectedCountry.currency.symbol})</div>
                    <div>Tax: {selectedCountry.tax.label} ({selectedCountry.tax.shortLabel})</div>
                    <div>Measurement: {selectedCountry.measurement.areaUnit}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Company Name
                </Label>
                <Input
                  id="company-name"
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-2 border-dashed border-muted-foreground/30">
                  <AvatarImage src={logoUrl || undefined} />
                  <AvatarFallback className="bg-muted">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Mobile Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={selectedCountry ? `${selectedCountry.phoneCode} 1234567890` : "+1 1234567890"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3">
          <Button variant="ghost" onClick={skipStep} disabled={saving || step === 1}>
            {step === 4 ? "Skip & Finish" : "Skip"}
          </Button>
          {step < 4 ? (
            <Button onClick={nextStep} className="gap-2" disabled={step === 1 && !selectedCountry}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving} className="gap-2">
              {saving ? "Saving..." : "Complete"} <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
