import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Building2, Phone, ArrowRight, Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profileApi } from "@/lib/api";
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
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { uploadToS3 } = await import('@/lib/s3Upload');
      const { url: publicUrl } = await uploadToS3(file, 'logo', fileName);

      setLogoUrl(publicUrl);
      toast.success("Logo uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploading(false);
      // Allow choosing the same photo again after a failed attempt.
      if (e.target) e.target.value = "";
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

      await profileApi.update(updateData);

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
      <DialogContent 
        className="sm:max-w-[380px] max-h-[85vh] rounded-2xl p-5" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-semibold">
            {step === 1 && "Welcome! Select your country"}
            {step === 2 && "What's your company name?"}
            {step === 3 && "Add your company logo"}
            {step === 4 && "Add your contact number"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {step === 1 && "This will set your currency, tax labels, and units"}
            {step === 2 && "Your company name appears on quotations"}
            {step === 3 && "Your logo appears on quotations"}
            {step === 4 && "So clients can reach you easily"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 my-3">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="space-y-3 py-1">
          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Search Country
                </Label>
                <Input
                  placeholder="Search by country name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="h-9 rounded-lg"
                />
              </div>

              <ScrollArea className="h-[220px] rounded-lg border p-1.5">
                {filteredCountries ? (
                  <div className="space-y-0.5">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => setSelectedCountry(country)}
                        className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left transition-colors text-sm ${
                          selectedCountry?.code === country.code
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <span className="text-base">{country.flag}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm">{country.name}</div>
                          <div className={`text-[10px] ${selectedCountry?.code === country.code ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {country.currency.symbol} • {country.tax.shortLabel}
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <div className="text-center py-3 text-muted-foreground text-sm">
                        No countries found
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {countryGroups.map((group) => (
                      <div key={group.region}>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                          {group.region}
                        </div>
                        <div className="space-y-0.5">
                          {group.countries.map((country) => (
                            <button
                              key={country.code}
                              onClick={() => setSelectedCountry(country)}
                              className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left transition-colors text-sm ${
                                selectedCountry?.code === country.code
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <span className="text-base">{country.flag}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm">{country.name}</div>
                                <div className={`text-[10px] ${selectedCountry?.code === country.code ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                  {country.currency.symbol} • {country.tax.shortLabel}
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
                <div className="p-2 bg-muted/50 rounded-lg text-sm">
                  <div className="font-medium text-sm">{selectedCountry.flag} {selectedCountry.name}</div>
                  <div className="text-muted-foreground text-[10px]">
                    {selectedCountry.currency.symbol} • {selectedCountry.tax.shortLabel} • {selectedCountry.measurement.areaUnitShort}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="company-name" className="flex items-center gap-2 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Company Name
                </Label>
                <Input
                  id="company-name"
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-10 rounded-lg"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/30 rounded-xl">
                  <AvatarImage src={logoUrl || undefined} />
                  <AvatarFallback className="bg-muted rounded-xl">
                    <Upload className="h-6 w-6 text-muted-foreground" />
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
                  size="sm"
                  className="rounded-lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Mobile Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={selectedCountry ? `${selectedCountry.phoneCode} 1234567890` : "+1 1234567890"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 rounded-lg"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={skipStep} disabled={saving || step === 1}>
            {step === 4 ? "Skip & Finish" : "Skip"}
          </Button>
          {step < 4 ? (
            <Button size="sm" className="rounded-lg gap-1.5" onClick={nextStep} disabled={step === 1 && !selectedCountry}>
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" className="rounded-lg gap-1.5" onClick={handleComplete} disabled={saving}>
              {saving ? "Saving..." : "Complete"} <Check className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
