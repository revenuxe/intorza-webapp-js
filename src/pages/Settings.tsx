import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, Upload, Loader2, Plus, Trash2, FileText, Shield, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BillingSection } from "@/components/BillingSection";

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
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
    bank_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_account_holder: "",
    upi_id: "",
    payment_qr_url: "",
  });

  const [paymentStages, setPaymentStages] = useState([
    { id: "1", stage: "1", milestone: "Design Phase", percentage: 10 },
    { id: "2", stage: "2", milestone: "Material Procurement", percentage: 30 },
    { id: "3", stage: "3", milestone: "Execution Start", percentage: 30 },
    { id: "4", stage: "4", milestone: "Mid-Execution", percentage: 20 },
    { id: "5", stage: "5", milestone: "Final Handover", percentage: 10 },
  ]);
  const [paymentStagesDialogOpen, setPaymentStagesDialogOpen] = useState(false);

  const [termsConditions, setTermsConditions] = useState([
    {
      id: "1",
      title: "PROJECT DURATION FOR 30 DAYS (AFTER DESIGN PHASE)",
      points: ["The execution phase will commence post-design approval and is estimated to be completed within 30 working days, subject to site readiness and material availability."]
    },
    {
      id: "2",
      title: "MATERIAL DISPATCH & EXECUTION PROCESS",
      points: ["Materials will be dispatched as per the approved design and timeline.", "Installation will be carried out by trained professionals ensuring quality standards."]
    },
    {
      id: "3",
      title: "SITE READINESS",
      points: ["The client must ensure that the site is ready with completed civil work, electrical points, plumbing, and false ceiling before execution begins.", "Any delays due to site unreadiness will extend the project timeline."]
    },
    {
      id: "4",
      title: "IMPLICATIONS OF PAYMENT DELAY",
      points: ["Delayed payments may result in project timeline extensions and additional charges.", "Timely payments ensure smooth project execution and delivery."]
    },
    {
      id: "5",
      title: "DESIGN PHASE TIMELINES & DELAY POLICY",
      points: ["Design approval is expected within 7-10 working days.", "Delays in design approval will proportionally delay the overall project timeline."]
    },
    {
      id: "6",
      title: "CHANGES DURING EXECUTION DUE TO TECHNICAL LIMITATION",
      points: ["Any on-site technical constraints may require minor design modifications.", "Such changes will be communicated and executed with client consent."]
    },
    {
      id: "7",
      title: "SERVICE WARRANTY & TRANSPARENCY",
      points: ["We provide a warranty on manufacturing defects and workmanship.", "All materials used will be as per approved specifications with complete transparency."]
    }
  ]);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);

  const [invoiceTerms, setInvoiceTerms] = useState([
    {
      id: "1",
      title: "PAYMENT TERMS",
      points: ["Payment is due within 30 days of invoice date.", "Late payments may incur additional charges."]
    },
    {
      id: "2",
      title: "SERVICE WARRANTY",
      points: ["All services are covered under our standard warranty terms.", "Warranty does not cover damage due to misuse or neglect."]
    },
    {
      id: "3",
      title: "CANCELLATION POLICY",
      points: ["Cancellations must be made in writing.", "Refunds will be processed within 14 business days."]
    }
  ]);
  const [invoiceTermsDialogOpen, setInvoiceTermsDialogOpen] = useState(false);

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
          bank_name: (data as any).bank_name || "",
          bank_account_number: (data as any).bank_account_number || "",
          bank_ifsc_code: (data as any).bank_ifsc_code || "",
          bank_account_holder: (data as any).bank_account_holder || "",
          upi_id: (data as any).upi_id || "",
          payment_qr_url: (data as any).payment_qr_url || "",
        });
        
        if (data.payment_stages) {
          setPaymentStages(data.payment_stages as any);
        }
        
        if (data.terms_conditions) {
          const terms = (data.terms_conditions as any[]).map((term: any) => {
            if (term.content && !term.points) {
              return {
                id: term.id,
                title: term.title,
                points: [term.content]
              };
            }
            return {
              ...term,
              points: Array.isArray(term.points) ? term.points : [term.points || ""]
            };
          });
          setTermsConditions(terms);
        }

        if ((data as any).invoice_terms_conditions) {
          const invTerms = ((data as any).invoice_terms_conditions as any[]).map((term: any) => ({
            ...term,
            points: Array.isArray(term.points) ? term.points : [term.points || ""]
          }));
          setInvoiceTerms(invTerms);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
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
          payment_stages: paymentStages,
          terms_conditions: termsConditions,
          invoice_terms_conditions: invoiceTerms,
          bank_name: profile.bank_name,
          bank_account_number: profile.bank_account_number,
          bank_ifsc_code: profile.bank_ifsc_code,
          bank_account_holder: profile.bank_account_holder,
          upi_id: profile.upi_id,
          payment_qr_url: profile.payment_qr_url,
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

        <Card>
          <CardHeader>
            <CardTitle>Payment Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the default payment stages that will appear in all quotations and invoices.
            </p>
            <Button onClick={() => setPaymentStagesDialogOpen(true)} className="w-full md:w-auto">
              <FileText className="h-4 w-4 mr-2" />
              Edit Payment Stages
            </Button>
            <div className="mt-4 flex justify-between items-center pt-3 border-t">
              <span className="text-sm font-medium">Total Percentage:</span>
              <span className={`text-sm font-bold ${paymentStages.reduce((sum, s) => sum + s.percentage, 0) === 100 ? 'text-green-600' : 'text-destructive'}`}>
                {paymentStages.reduce((sum, s) => sum + s.percentage, 0)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quotation Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the terms and conditions that will appear in all quotation PDFs.
            </p>
            <Button onClick={() => setTermsDialogOpen(true)} className="w-full md:w-auto">
              <FileText className="h-4 w-4 mr-2" />
              Edit Quotation Terms & Conditions
            </Button>
          </CardContent>
        </Card>

        {/* Invoice Section */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the terms and conditions that will appear in all invoice PDFs.
            </p>
            <Button onClick={() => setInvoiceTermsDialogOpen(true)} className="w-full md:w-auto">
              <FileText className="h-4 w-4 mr-2" />
              Edit Invoice Terms & Conditions
            </Button>
          </CardContent>
        </Card>

        {/* Bank Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bank & Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add your bank details and UPI information. These can be displayed on quotations and invoices.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={profile.bank_name}
                  onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                  placeholder="e.g., State Bank of India"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_holder">Account Holder Name</Label>
                <Input
                  id="bank_account_holder"
                  value={profile.bank_account_holder}
                  onChange={(e) => setProfile({ ...profile, bank_account_holder: e.target.value })}
                  placeholder="Account Holder Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  value={profile.bank_account_number}
                  onChange={(e) => setProfile({ ...profile, bank_account_number: e.target.value })}
                  placeholder="Account Number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_ifsc_code">IFSC Code</Label>
                <Input
                  id="bank_ifsc_code"
                  value={profile.bank_ifsc_code}
                  onChange={(e) => setProfile({ ...profile, bank_ifsc_code: e.target.value })}
                  placeholder="IFSC Code"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="upi_id">UPI ID</Label>
                <Input
                  id="upi_id"
                  value={profile.upi_id}
                  onChange={(e) => setProfile({ ...profile, upi_id: e.target.value })}
                  placeholder="yourname@upi"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment QR Code</Label>
              {profile.payment_qr_url && (
                <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
                  <img 
                    src={profile.payment_qr_url} 
                    alt="Payment QR Code" 
                    className="max-h-32 object-contain"
                  />
                </div>
              )}
              <div className="flex items-center gap-4">
                <Input
                  id="payment_qr"
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${user.id}/payment-qr.${fileExt}`;
                      
                      const { error: uploadError } = await supabase.storage
                        .from('company-logos')
                        .upload(fileName, file, { upsert: true });
                      
                      if (uploadError) throw uploadError;
                      
                      const { data: { publicUrl } } = supabase.storage
                        .from('company-logos')
                        .getPublicUrl(fileName);
                      
                      setProfile({ ...profile, payment_qr_url: publicUrl });
                      toast({
                        title: "QR Code uploaded",
                        description: "Your payment QR code has been uploaded successfully",
                      });
                    } catch (error) {
                      console.error('Error uploading QR:', error);
                      toast({
                        title: "Upload failed",
                        description: "Failed to upload QR code. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="flex-1"
                />
                <Button type="button">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload QR
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload your UPI or bank payment QR code. This will appear on quotations and invoices when enabled.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Stages Dialog */}
        <Dialog open={paymentStagesDialogOpen} onOpenChange={setPaymentStagesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Payment Stages</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {paymentStages.map((stage, index) => (
                <div key={stage.id} className="grid grid-cols-[80px_1fr_120px_40px] gap-3 items-start">
                  <div className="space-y-2">
                    <Label className="text-xs">Stage</Label>
                    <Input
                      value={stage.stage}
                      onChange={(e) => {
                        const updated = [...paymentStages];
                        updated[index].stage = e.target.value;
                        setPaymentStages(updated);
                      }}
                      placeholder="1"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Milestone</Label>
                    <Input
                      value={stage.milestone}
                      onChange={(e) => {
                        const updated = [...paymentStages];
                        updated[index].milestone = e.target.value;
                        setPaymentStages(updated);
                      }}
                      placeholder="Design Phase"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={stage.percentage}
                        onChange={(e) => {
                          const updated = [...paymentStages];
                          updated[index].percentage = parseFloat(e.target.value) || 0;
                          setPaymentStages(updated);
                        }}
                        placeholder="10"
                        min="0"
                        max="100"
                        step="1"
                        className="h-9"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs invisible">Del</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        if (paymentStages.length > 1) {
                          setPaymentStages(paymentStages.filter((_, i) => i !== index));
                        }
                      }}
                      disabled={paymentStages.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newId = String(Math.max(...paymentStages.map(s => parseInt(s.id) || 0)) + 1);
                  setPaymentStages([...paymentStages, {
                    id: newId,
                    stage: String(paymentStages.length + 1),
                    milestone: "",
                    percentage: 0
                  }]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stage
              </Button>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm font-medium">Total Percentage:</span>
                <span className={`text-sm font-bold ${paymentStages.reduce((sum, s) => sum + s.percentage, 0) === 100 ? 'text-green-600' : 'text-destructive'}`}>
                  {paymentStages.reduce((sum, s) => sum + s.percentage, 0)}%
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quotation Terms and Conditions Dialog */}
        <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Quotation Terms & Conditions</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {termsConditions.map((term, termIndex) => (
                <div key={term.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Section Title</Label>
                        <Input
                          value={term.title}
                          onChange={(e) => {
                            const updated = [...termsConditions];
                            updated[termIndex].title = e.target.value;
                            setTermsConditions(updated);
                          }}
                          placeholder="Enter section title"
                          className="font-medium"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Points</Label>
                        {term.points.map((point, pointIndex) => (
                          <div key={pointIndex} className="flex gap-2">
                            <Textarea
                              value={point}
                              onChange={(e) => {
                                const updated = [...termsConditions];
                                updated[termIndex].points[pointIndex] = e.target.value;
                                setTermsConditions(updated);
                              }}
                              placeholder="Enter point"
                              rows={2}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (term.points.length > 1) {
                                  const updated = [...termsConditions];
                                  updated[termIndex].points = updated[termIndex].points.filter((_, i) => i !== pointIndex);
                                  setTermsConditions(updated);
                                }
                              }}
                              disabled={term.points.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = [...termsConditions];
                            updated[termIndex].points.push("");
                            setTermsConditions(updated);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Point
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (termsConditions.length > 1) {
                          setTermsConditions(termsConditions.filter((_, i) => i !== termIndex));
                        }
                      }}
                      disabled={termsConditions.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newId = String(Math.max(...termsConditions.map(t => parseInt(t.id) || 0)) + 1);
                  setTermsConditions([...termsConditions, {
                    id: newId,
                    title: "",
                    points: [""]
                  }]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invoice Terms and Conditions Dialog */}
        <Dialog open={invoiceTermsDialogOpen} onOpenChange={setInvoiceTermsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Invoice Terms & Conditions</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {invoiceTerms.map((term, termIndex) => (
                <div key={term.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Section Title</Label>
                        <Input
                          value={term.title}
                          onChange={(e) => {
                            const updated = [...invoiceTerms];
                            updated[termIndex].title = e.target.value;
                            setInvoiceTerms(updated);
                          }}
                          placeholder="Enter section title"
                          className="font-medium"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Points</Label>
                        {term.points.map((point, pointIndex) => (
                          <div key={pointIndex} className="flex gap-2">
                            <Textarea
                              value={point}
                              onChange={(e) => {
                                const updated = [...invoiceTerms];
                                updated[termIndex].points[pointIndex] = e.target.value;
                                setInvoiceTerms(updated);
                              }}
                              placeholder="Enter point"
                              rows={2}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (term.points.length > 1) {
                                  const updated = [...invoiceTerms];
                                  updated[termIndex].points = updated[termIndex].points.filter((_, i) => i !== pointIndex);
                                  setInvoiceTerms(updated);
                                }
                              }}
                              disabled={term.points.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = [...invoiceTerms];
                            updated[termIndex].points.push("");
                            setInvoiceTerms(updated);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Point
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (invoiceTerms.length > 1) {
                          setInvoiceTerms(invoiceTerms.filter((_, i) => i !== termIndex));
                        }
                      }}
                      disabled={invoiceTerms.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newId = String(Math.max(...invoiceTerms.map(t => parseInt(t.id) || 0)) + 1);
                  setInvoiceTerms([...invoiceTerms, {
                    id: newId,
                    title: "",
                    points: [""]
                  }]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
        </div>

        {/* Legal Section */}
        <Separator className="my-8" />
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Legal</h3>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <Link to="/terms-and-conditions">
              <Button variant="outline" className="w-full sm:w-auto">
                <FileText className="h-4 w-4 mr-2" />
                Terms and Conditions
              </Button>
            </Link>
            <Link to="/privacy-policy">
              <Button variant="outline" className="w-full sm:w-auto">
                <Shield className="h-4 w-4 mr-2" />
                Privacy Policy
              </Button>
            </Link>
            <Link to="/cancellation-refund-policy">
              <Button variant="outline" className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Cancellation & Refunds
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Read our terms of service, privacy policy, and cancellation & refund policy to understand our services.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
