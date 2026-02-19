import { useState, useEffect } from "react";
import { Plus, Trash2, Star, Edit2, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BankTemplate {
  id: string;
  template_name: string;
  account_holder_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  qr_code_url: string | null;
  is_default: boolean;
  created_at: string;
}

export const BankDetailsTab = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<BankTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BankTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    template_name: "",
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    upi_id: "",
    qr_code_url: "",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bank_detail_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.template_name.trim()) {
      toast({ title: "Please enter a template name", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingTemplate) {
        const { error } = await supabase
          .from('bank_detail_templates')
          .update({
            template_name: formData.template_name,
            account_holder_name: formData.account_holder_name || null,
            bank_name: formData.bank_name || null,
            account_number: formData.account_number || null,
            ifsc_code: formData.ifsc_code || null,
            upi_id: formData.upi_id || null,
            qr_code_url: formData.qr_code_url || null,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: "Bank details updated" });
      } else {
        const { error } = await supabase
          .from('bank_detail_templates')
          .insert({
            user_id: user.id,
            template_name: formData.template_name,
            account_holder_name: formData.account_holder_name || null,
            bank_name: formData.bank_name || null,
            account_number: formData.account_number || null,
            ifsc_code: formData.ifsc_code || null,
            upi_id: formData.upi_id || null,
            qr_code_url: formData.qr_code_url || null,
            is_default: templates.length === 0,
          });

        if (error) throw error;
        toast({ title: "Bank details created" });
      }

      setDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: "Failed to save bank details", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bank_detail_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Bank details deleted" });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('bank_detail_templates')
        .update({ is_default: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('bank_detail_templates')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Default updated" });
      loadTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
      toast({ title: "Failed to set default", variant: "destructive" });
    }
  };

  const handleEdit = (template: BankTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      account_holder_name: template.account_holder_name || "",
      bank_name: template.bank_name || "",
      account_number: template.account_number || "",
      ifsc_code: template.ifsc_code || "",
      upi_id: template.upi_id || "",
      qr_code_url: template.qr_code_url || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: "",
      account_holder_name: "",
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      upi_id: "",
      qr_code_url: "",
    });
  };

  const handleQRUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/bank-qr-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);
      
      setFormData({ ...formData, qr_code_url: publicUrl });
      toast({ title: "QR code uploaded" });
    } catch (error) {
      console.error('Error uploading QR:', error);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bank & Payment Details</h3>
          <p className="text-sm text-muted-foreground">Manage bank accounts for quotations and invoices</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingTemplate(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground text-center mb-4">No bank details yet</p>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{template.template_name}</CardTitle>
                    {template.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!template.is_default && (
                      <Button variant="ghost" size="sm" onClick={() => handleSetDefault(template.id)}>
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  {template.bank_name && <p>{template.bank_name} - {template.account_number}</p>}
                  {template.upi_id && <p>UPI: {template.upi_id}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit' : 'Add'} Bank Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., Primary HDFC Account"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="e.g., HDFC Bank"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Holder</Label>
                <Input
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  placeholder="Account holder name"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Account number"
                />
              </div>
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                  placeholder="IFSC code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>UPI ID</Label>
              <Input
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                placeholder="yourname@upi"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment QR Code</Label>
              {formData.qr_code_url && (
                <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
                  <img src={formData.qr_code_url} alt="QR Code" className="max-h-32 object-contain" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleQRUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
