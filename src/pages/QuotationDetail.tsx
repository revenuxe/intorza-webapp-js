import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Edit, Check, X, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/hooks/useLocalization";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadQuotationPDF } from "@/lib/pdfGenerator";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getEditorSettings } from "@/lib/pdfThemes";
import { getQuotationSettings } from "@/components/CustomizeFieldsDrawer";

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_title: string;
  project_name: string;
  client_name: string;
  client_address: string;
  client_id: string | null;
  grand_total: number;
  subtotal: number;
  gst_amount: number;
  discount_amount: number;
  gst_enabled: boolean;
  gst_percentage: number;
  status: string;
  date_of_proposal: string;
  valid_till: string;
  place_of_project: string;
  warranty: string;
  project_type: string;
  project_deadline: string | null;
  created_at: string;
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-700";
    case "accepted":
      return "bg-green-500/10 text-green-700";
    case "rejected":
      return "bg-red-500/10 text-red-700";
    case "converted":
      return "bg-primary/10 text-primary";
    case "draft":
      return "bg-gray-500/10 text-gray-700";
    default:
      return "";
  }
};

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkProFeature } = useSubscription();
  const { formatCurrency, formatDateShort, settings } = useLocalization();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  useEffect(() => {
    if (id) {
      loadQuotation();
    }
  }, [id]);

  const loadQuotation = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setQuotation(data);
      setInvoiceAmount(data?.grand_total || 0);
    } catch (error) {
      console.error('Error loading quotation:', error);
      toast({
        title: "Error",
        description: "Failed to load quotation details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Use localized date formatting
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return formatDateShort(dateString);
  };

  const handleDownloadPdf = async () => {
    if (!quotation) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .single();

      const { data: sections } = await supabase
        .from('quotation_sections')
        .select('*, quotation_items(*)')
        .eq('quotation_id', quotation.id)
        .order('sort_order');

      // Fetch latest templates from My Library
      const { data: { user } } = await supabase.auth.getUser();
      let paymentStages = profile?.payment_stages;
      let termsConditions = profile?.terms_conditions;
      let bankDetails = undefined;

      if (user) {
        // Get default payment template
        const { data: paymentTemplate } = await supabase
          .from('payment_templates')
          .select('stages')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single();
        
        if (paymentTemplate?.stages) {
          paymentStages = paymentTemplate.stages;
        }

        // Get default terms template
        const { data: termsTemplate } = await supabase
          .from('terms_templates')
          .select('content')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .eq('template_type', 'quotation')
          .single();
        
        if (termsTemplate?.content) {
          termsConditions = termsTemplate.content;
        }

        // Get default bank details template
        const { data: bankTemplate } = await supabase
          .from('bank_detail_templates')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single();
        
        if (bankTemplate) {
          bankDetails = {
            bankName: bankTemplate.bank_name,
            accountNumber: bankTemplate.account_number,
            ifscCode: bankTemplate.ifsc_code,
            accountHolder: bankTemplate.account_holder_name,
            upiId: bankTemplate.upi_id,
            qrCodeUrl: bankTemplate.qr_code_url
          };
        }
      }

      // Get saved editor settings and customization settings
      const editorSettings = getEditorSettings();
      const customizeSettings = getQuotationSettings();

      await downloadQuotationPDF({
        quotationId: quotation.id,
        quotationTitle: quotation.quotation_title || quotation.project_name,
        dateOfProposal: quotation.date_of_proposal,
        quotationValidTill: quotation.valid_till,
        projectDeadline: quotation.project_deadline || '',
        clientName: quotation.client_name,
        clientAddress: quotation.client_address,
        placeOfProject: quotation.place_of_project,
        warranty: quotation.warranty,
        projectType: quotation.project_type,
        sections: sections?.map(s => ({
          title: s.section_name,
          items: s.quotation_items.map((item: any) => ({
            productName: item.product_name,
            productDetails: item.product_details,
            side: item.side,
            widthFt: item.width_ft,
            heightFt: item.height_ft,
            sftArea: item.sft_area,
            ratePerSft: item.rate_per_sft,
            amount: item.amount
          }))
        })) || [],
        subtotal: quotation.subtotal,
        discount: quotation.discount_amount,
        gstEnabled: quotation.gst_enabled,
        gstRate: quotation.gst_percentage || 18,
        companyLogo: profile?.logo_url,
        companyName: profile?.company_name,
        companyAddress: profile?.address,
        companyPhone: profile?.phone,
        companyEmail: profile?.email,
        gstin: profile?.gstin,
        professionalAdvantages: profile?.professional_advantages,
        signatureUrl: profile?.signature_url,
        paymentStages: paymentStages as any,
        termsConditions: termsConditions as any,
        bankDetails: bankDetails || {
          bankName: profile?.bank_name,
          accountNumber: profile?.bank_account_number,
          ifscCode: profile?.bank_ifsc_code,
          accountHolder: profile?.bank_account_holder,
          upiId: profile?.upi_id,
          qrCodeUrl: profile?.payment_qr_url
        },
        settings: customizeSettings,
        editorSettings: editorSettings,
      });

      toast({
        title: "PDF Downloaded",
        description: "Quotation PDF has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const handleMarkStatus = async (status: string) => {
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setQuotation(prev => prev ? { ...prev, status } : null);
      toast({
        title: "Status Updated",
        description: `Quotation marked as ${status}`,
      });

      if (status === 'accepted') {
        setConvertDialogOpen(true);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const invoiceNumber = `INV-${Date.now()}`;
      const remaining = invoiceAmount - paidAmount;

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          quotation_id: quotation?.id,
          client_id: quotation?.client_id || null,
          invoice_number: invoiceNumber,
          client_name: quotation?.client_name || '',
          project_name: quotation?.project_name || '',
          total_amount: invoiceAmount,
          paid_amount: paidAmount,
          remaining_amount: remaining,
          status: remaining === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid'),
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate || null,
          notes: invoiceNotes
        })
        .select()
        .single();

      if (error) throw error;

      // Update quotation status to converted
      await supabase
        .from('quotations')
        .update({ status: 'converted' })
        .eq('id', quotation?.id);

      toast({
        title: "Invoice Created",
        description: "Quotation has been converted to invoice successfully",
      });

      setConvertDialogOpen(false);
      navigate(`/invoices/${invoice.id}`);
    } catch (error) {
      console.error('Error converting to invoice:', error);
      toast({
        title: "Error",
        description: "Failed to convert to invoice",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Quotation not found</h3>
            <Button onClick={() => navigate('/quotations')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quotations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/quotations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/?id=${quotation.id}`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button onClick={handleDownloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        {quotation.status !== 'converted' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                {quotation.status !== 'accepted' && quotation.status !== 'rejected' && (
                  <>
                    <Button 
                      onClick={() => checkProFeature('Mark as Accepted', () => handleMarkStatus('accepted'))}
                      className="flex-1"
                      variant="default"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Accepted
                    </Button>
                    <Button 
                      onClick={() => handleMarkStatus('rejected')}
                      className="flex-1"
                      variant="destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Mark as Rejected
                    </Button>
                  </>
                )}
                {quotation.status === 'accepted' && (
                  <Button 
                    onClick={() => checkProFeature('Convert to Invoice', () => setConvertDialogOpen(true))}
                    className="flex-1"
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Convert to Invoice
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Details */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{quotation.quotation_title || quotation.project_name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{quotation.quotation_number}</p>
              </div>
              <Badge className={getStatusColor(quotation.status)}>
                {quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1) || 'Draft'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Details */}
            <div>
              <h3 className="font-semibold mb-3">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Client Name</p>
                  <p className="font-medium">{quotation.client_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{quotation.client_address || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div>
              <h3 className="font-semibold mb-3">Project Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Project Type</p>
                  <p className="font-medium">{quotation.project_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Place of Project</p>
                  <p className="font-medium">{quotation.place_of_project || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date of Proposal</p>
                  <p className="font-medium">{formatDate(quotation.date_of_proposal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valid Till</p>
                  <p className="font-medium">{formatDate(quotation.valid_till)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Project Deadline</p>
                  <p className="font-medium">{quotation.project_deadline ? formatDate(quotation.project_deadline) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Warranty</p>
                  <p className="font-medium">{quotation.warranty} Years</p>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <h3 className="font-semibold mb-3">Financial Summary</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(quotation.subtotal || 0, true)}
                  </span>
                </div>
                {quotation.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-green-600 tabular-nums">
                      -{formatCurrency(quotation.discount_amount || 0, true)}
                    </span>
                  </div>
                )}
                {quotation.gst_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{settings.taxShortLabel}</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(quotation.gst_amount || 0, true)}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Grand Total</span>
                    <span className="font-bold text-lg text-primary tabular-nums">
                      {formatCurrency(quotation.grand_total || 0, true)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Convert to Invoice Dialog */}
        <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert to Invoice</DialogTitle>
              <DialogDescription>
                Create an invoice from this quotation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-amount">Invoice Amount</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid-amount">Amount Paid</Label>
                <Input
                  id="paid-amount"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Remaining Amount</Label>
                <Input
                  value={(invoiceAmount - paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">Next Payment Due Date (Optional)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConvertToInvoice}>
                Create Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default QuotationDetail;
