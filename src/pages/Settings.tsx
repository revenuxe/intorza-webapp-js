import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, Upload, Loader2, Library, Globe, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BillingSection } from "@/components/BillingSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  COUNTRY_CONFIGS, 
  getCountryGroups, 
  getCountryByCode,
  type CountryConfig 
} from "@/lib/countryConfig";

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [profile, setProfile] = useState({
    company_name: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    gstin: "",
    logo_url: "",
    signature_url: "",
    professional_advantages: `You've imagined your ideal home and are determined to make it a reality. You can get numerous different quotations from different Interior Designers. But since you've chosen us, let's have a look at how we can make your idea a reality.`,
    country_code: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          company_name: data.company_name || "",
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          gstin: data.gstin || "",
          logo_url: data.logo_url || "",
          signature_url: data.signature_url || "",
          professional_advantages: data.professional_advantages || profile.professional_advantages,
          country_code: data.country_code || "IN",
        });
        
        // Set selected country from profile
        if (data.country_code) {
          const country = getCountryByCode(data.country_code);
          if (country) {
            setSelectedCountry(country);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleCountryChange = async (country: CountryConfig) => {
    setSelectedCountry(country);
    setShowCountrySelector(false);
    setCountrySearch("");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          country_code: country.code,
          country_name: country.name,
          currency_code: country.currency.code,
          currency_symbol: country.currency.symbol,
          tax_label: country.tax.shortLabel,
          measurement_system: country.measurement.system,
          locale: country.currency.locale,
          date_format: country.dateFormat,
          number_format: JSON.stringify(country.numberFormat),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, country_code: country.code });
      toast({
        title: "Country updated",
        description: `Settings updated for ${country.name}`,
      });
    } catch (error) {
      console.error('Error updating country:', error);
      toast({
        title: "Update failed",
        description: "Failed to update country settings",
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      if (profile.logo_url) {
        const oldPath = profile.logo_url.split('/').slice(-2).join('/');
        await supabase.storage.from('company-logos').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, logo_url: publicUrl });
      toast({
        title: "Logo uploaded",
        description: "Your company logo has been updated successfully",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingSignature(true);
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/signature.${fileExt}`;

      if (profile.signature_url) {
        const oldPath = profile.signature_url.split('/').slice(-2).join('/');
        await supabase.storage.from('company-logos').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ signature_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, signature_url: publicUrl });
      toast({
        title: "Signature uploaded",
        description: "Your signature has been updated successfully",
      });
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          company_name: profile.company_name,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          gstin: profile.gstin,
          professional_advantages: profile.professional_advantages,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Save failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = countrySearch
    ? COUNTRY_CONFIGS.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : null;

  const countryGroups = getCountryGroups();

  // Get dynamic label for tax registration
  const taxRegistrationLabel = selectedCountry?.tax.registrationLabel || 'GSTIN';

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your company profile and branding</p>
        </div>

        <BillingSection />

        {/* Country/Region Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Country & Region
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select your country</Label>
              <p className="text-xs text-muted-foreground mb-2">
                This sets your currency, tax labels, and measurement units
              </p>
              
              {/* Current Selection */}
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-3"
                onClick={() => setShowCountrySelector(!showCountrySelector)}
              >
                {selectedCountry ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <div className="text-left">
                      <div className="font-medium">{selectedCountry.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedCountry.currency.symbol} • {selectedCountry.tax.shortLabel} • {selectedCountry.measurement.areaUnitShort}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select a country</span>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${showCountrySelector ? 'rotate-180' : ''}`} />
              </Button>

              {/* Country Selector Dropdown */}
              {showCountrySelector && (
                <div className="border rounded-lg mt-2 p-2 bg-background">
                  <Input
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="mb-2"
                    autoFocus
                  />
                  <ScrollArea className="h-[300px]">
                    {filteredCountries ? (
                      <div className="space-y-1">
                        {filteredCountries.map((country) => (
                          <button
                            key={country.code}
                            onClick={() => handleCountryChange(country)}
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
                                {country.currency.symbol} • {country.tax.shortLabel}
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
                      <div className="space-y-3">
                        {countryGroups.map((group) => (
                          <Collapsible key={group.region} defaultOpen={group.countries.some(c => c.code === selectedCountry?.code)}>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-md">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {group.region}
                              </span>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="space-y-1 pl-2">
                                {group.countries.map((country) => (
                                  <button
                                    key={country.code}
                                    onClick={() => handleCountryChange(country)}
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
                                        {country.currency.symbol} • {country.tax.shortLabel}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            {selectedCountry && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-bold">{selectedCountry.currency.symbol}</div>
                  <div className="text-xs text-muted-foreground">Currency</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-bold">{selectedCountry.tax.shortLabel}</div>
                  <div className="text-xs text-muted-foreground">Tax Type</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-bold">{selectedCountry.tax.defaultRate}%</div>
                  <div className="text-xs text-muted-foreground">Default Rate</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-bold">{selectedCountry.measurement.areaUnitShort}</div>
                  <div className="text-xs text-muted-foreground">Area Unit</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Library Link */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Library className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">Terms, Payment & Bank Details</h3>
                  <p className="text-sm text-muted-foreground">Manage in My Library</p>
                </div>
              </div>
              <Button asChild>
                <Link to="/library">Open Library</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Company Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.logo_url && (
              <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
                <img 
                  src={profile.logo_url} 
                  alt="Company Logo" 
                  className="max-h-32 object-contain"
                />
              </div>
            )}
            <div className="flex items-center gap-4">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Button disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload your company logo. This will appear on all quotations and invoices.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Signature Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.signature_url && (
              <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
                <img 
                  src={profile.signature_url} 
                  alt="Signature" 
                  className="max-h-24 object-contain"
                />
              </div>
            )}
            <div className="flex items-center gap-4">
              <Input
                id="signature"
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                disabled={uploadingSignature}
                className="flex-1"
              />
              <Button disabled={uploadingSignature}>
                {uploadingSignature ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingSignature ? "Uploading..." : "Upload"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload your signature image. This will appear at the bottom of all quotations and invoices.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={profile.company_name}
                  onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Your Full Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder={selectedCountry ? `${selectedCountry.phoneCode} 1234567890` : "+1 1234567890"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstin">{taxRegistrationLabel}</Label>
                <Input
                  id="gstin"
                  value={profile.gstin}
                  onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                  placeholder={`${taxRegistrationLabel} Number`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Your Company Address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Advantages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="professional_advantages">Custom Message</Label>
              <Textarea
                id="professional_advantages"
                value={profile.professional_advantages}
                onChange={(e) => setProfile({ ...profile, professional_advantages: e.target.value })}
                placeholder="Enter the professional advantages text that will appear on quotations"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                This text will appear in the "Professional Advantages" section of your quotations.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
