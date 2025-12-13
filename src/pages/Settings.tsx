import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, Upload, Loader2, Library } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BillingSection } from "@/components/BillingSection";

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [migrating, setMigrating] = useState(false);
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
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const migrateToLibrary = async () => {
    try {
      setMigrating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('payment_stages, terms_conditions, invoice_terms_conditions, bank_name, bank_account_number, bank_ifsc_code, bank_account_holder, upi_id, payment_qr_url')
        .eq('id', user.id)
        .single();

      if (!profileData) return;

      // Migrate payment stages
      if (profileData.payment_stages && Array.isArray(profileData.payment_stages)) {
        const { data: existingPayment } = await supabase
          .from('payment_templates')
          .select('id')
          .eq('user_id', user.id)
          .eq('template_name', 'Default (Migrated)')
          .single();

        if (!existingPayment) {
          await supabase.from('payment_templates').insert({
            user_id: user.id,
            template_name: 'Default (Migrated)',
            stages: profileData.payment_stages,
            is_default: true
          });
        }
      }

      // Migrate quotation terms
      if (profileData.terms_conditions && Array.isArray(profileData.terms_conditions)) {
        const { data: existingTerms } = await supabase
          .from('terms_templates')
          .select('id')
          .eq('user_id', user.id)
          .eq('template_name', 'Default Quotation (Migrated)')
          .single();

        if (!existingTerms) {
          await supabase.from('terms_templates').insert({
            user_id: user.id,
            template_name: 'Default Quotation (Migrated)',
            template_type: 'quotation',
            content: profileData.terms_conditions,
            is_default: true
          });
        }
      }

      // Migrate invoice terms
      if (profileData.invoice_terms_conditions && Array.isArray(profileData.invoice_terms_conditions)) {
        const { data: existingInvTerms } = await supabase
          .from('terms_templates')
          .select('id')
          .eq('user_id', user.id)
          .eq('template_name', 'Default Invoice (Migrated)')
          .single();

        if (!existingInvTerms) {
          await supabase.from('terms_templates').insert({
            user_id: user.id,
            template_name: 'Default Invoice (Migrated)',
            template_type: 'invoice',
            content: profileData.invoice_terms_conditions,
            is_default: true
          });
        }
      }

      // Migrate bank details
      if (profileData.bank_name || profileData.bank_account_number || profileData.upi_id) {
        const { data: existingBank } = await supabase
          .from('bank_detail_templates')
          .select('id')
          .eq('user_id', user.id)
          .eq('template_name', 'Primary Account (Migrated)')
          .single();

        if (!existingBank) {
          await supabase.from('bank_detail_templates').insert({
            user_id: user.id,
            template_name: 'Primary Account (Migrated)',
            bank_name: profileData.bank_name,
            account_number: profileData.bank_account_number,
            ifsc_code: profileData.bank_ifsc_code,
            account_holder_name: profileData.bank_account_holder,
            upi_id: profileData.upi_id,
            qr_code_url: profileData.payment_qr_url,
            is_default: true
          });
        }
      }

      toast({
        title: "Migration complete",
        description: "Your data has been moved to My Library",
      });
    } catch (error) {
      console.error('Error migrating data:', error);
      toast({
        title: "Migration failed",
        description: "Please try again or manually add items in My Library",
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
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

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your company profile and branding</p>
        </div>

        {/* Billing Section */}
        <BillingSection />

        {/* Migration Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Library className="h-5 w-5" />
                  Terms, Payment Stages & Bank Details moved to My Library
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage all your reusable templates in one place. Click below to migrate existing data.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={migrateToLibrary} disabled={migrating}>
                  {migrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Migrate Data
                </Button>
                <Button asChild>
                  <Link to="/library">Open My Library</Link>
                </Button>
              </div>
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
                  placeholder="+91 1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={profile.gstin}
                  onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                  placeholder="GST Number"
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
