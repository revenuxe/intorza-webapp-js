import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Plus, CheckCircle, Eye, Calendar, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/hooks/useLocalization";
import { supabase } from "@/integrations/supabase/client";
import { invoicesApi, profileApi } from "@/lib/api";
import { getDisplayStatus } from "@/lib/invoiceStatus";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInvoicePDF } from "@/lib/invoicePdfGenerator";
import { InvoicePreviewEditor } from "@/components/InvoicePreviewEditor";
import { PDFEditorSettings, InvoiceSettings, getEditorSettings, getInvoiceSettings } from "@/lib/pdfThemes";

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  project_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  created_at: string;
  quotation_id: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
}

const getStatusColor = (status: string) => {
  const normalizedStatus = status?.toLowerCase().replace(/_/g, ' ');
  switch (normalizedStatus) {
    case "paid":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "partially paid":
      return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
    case "unpaid":
      return "bg-orange-500/10 text-orange-700 border-orange-200";
    case "overdue":
      return "bg-red-500/10 text-red-700 border-red-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
};

const formatStatusDisplay = (status: string) => {
  if (!status) return 'Unpaid';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatCurrency, formatDateShort } = useLocalization();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Use localized date formatting
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return formatDateShort(dateString);
  };
  
  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [nextPaymentDue, setNextPaymentDue] = useState("");
  const [nextPaymentAmount, setNextPaymentAmount] = useState(0);

  useEffect(() => {
    if (id) {
      loadInvoice();
      loadProfile();
    }
  }, [id]);

  useEffect(() => {
    if (invoice?.quotation_id) {
      loadRelatedInvoices();
    }
  }, [invoice?.quotation_id]);

  const loadProfile = async () => {
    const { data } = await profileApi.get();
    if (data) setProfile(data);
  };

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const { data } = await invoicesApi.get(id!);
      const { payments: pays, ...inv } = data as Invoice & { payments: Payment[] };
      setInvoice(inv);
      setPayments((pays || []).slice().sort((a: Payment, b: Payment) =>
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      ));
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedInvoices = async () => {
    try {
      if (!invoice?.quotation_id) return;
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('quotation_id', invoice.quotation_id)
        .neq('id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRelatedInvoices(data || []);
    } catch (error) {
      console.error('Error loading related invoices:', error);
    }
  };

  // formatDate is defined above using useLocalization hook

  const openPaymentDialog = () => {
    setPaymentAmount(invoice?.remaining_amount || 0);
    setNextPaymentAmount(0);
    setNextPaymentDue("");
    setPaymentNotes("");
    setPaymentDialogOpen(true);
  };

  const handleDeleteInvoice = async () => {
    try {
      setDeleting(true);

      // payments.invoice_id has ON DELETE CASCADE, so this also removes its payments.
      await invoicesApi.remove(id!);

      toast({
        title: "Invoice Deleted",
        description: "The invoice has been permanently deleted",
      });
      
      navigate('/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddPayment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please login to add a payment",
          variant: "destructive",
        });
        return;
      }

      if (paymentAmount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid payment amount",
          variant: "destructive",
        });
        return;
      }

      // Create payment notes with next payment info if provided
      let finalNotes = paymentNotes || '';
      if (nextPaymentDue && nextPaymentAmount > 0) {
        const currCode = profile?.currency_code || 'INR';
        finalNotes = finalNotes ? `${finalNotes} | Next due: ${nextPaymentDue} - ${currCode} ${nextPaymentAmount.toLocaleString()}` : `Next due: ${nextPaymentDue} - ${currCode} ${nextPaymentAmount.toLocaleString()}`;
      }

      // paid_amount / remaining_amount / status are recomputed by a Postgres
      // trigger (recalc_invoice_totals, fired on payments changes) — single
      // source of truth instead of duplicating that logic here.
      await invoicesApi.addPayment(id!, {
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: finalNotes || null,
      });

      if (nextPaymentDue) {
        await invoicesApi.update(id!, { due_date: nextPaymentDue });
      }

      toast({
        title: "Payment Added",
        description: `₹${paymentAmount.toLocaleString()} recorded successfully`,
      });

      setPaymentDialogOpen(false);
      setPaymentAmount(0);
      setPaymentNotes("");
      setNextPaymentDue("");
      setNextPaymentAmount(0);
      loadInvoice();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Error",
        description: "Failed to add payment",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (editorSettings?: PDFEditorSettings, invoiceSettings?: InvoiceSettings) => {
    if (!invoice) return;
    
    try {
      setPdfLoading(true);
      
      let nextDue = invoice.due_date ? formatDate(invoice.due_date) : undefined;
      let nextAmount = invoice.remaining_amount;

      await generateInvoicePDF({
        invoiceNumber: invoice.invoice_number,
        invoiceDate: formatDate(invoice.invoice_date),
        dueDate: invoice.due_date ? formatDate(invoice.due_date) : undefined,
        nextPaymentDue: nextDue,
        nextPaymentAmount: nextAmount > 0 ? nextAmount : undefined,
        clientName: invoice.client_name,
        projectName: invoice.project_name,
        totalAmount: invoice.total_amount,
        paidAmount: invoice.paid_amount || 0,
        remainingAmount: Math.max(0, invoice.total_amount - (invoice.paid_amount || 0)),
        status: invoice.status || 'unpaid',
        notes: invoice.notes,
        payments: payments.map(p => ({
          amount: p.amount,
          payment_date: formatDate(p.payment_date),
          payment_method: p.payment_method,
          notes: p.notes
        })),
        profile: profile || {},
        localization: profile ? {
          currencyCode: profile.currency_code || 'INR',
          currencySymbol: profile.currency_symbol || '₹',
          locale: profile.locale || 'en-IN',
          taxLabel: profile.tax_label || 'GST',
          taxRegistrationLabel: profile.tax_label === 'GST' ? 'GSTIN' : `${profile.tax_label || 'Tax'} No`,
        } : undefined,
        editorSettings: editorSettings || getEditorSettings(),
        invoiceSettings: invoiceSettings || getInvoiceSettings()
      });

      toast({
        title: "PDF Generated",
        description: "Invoice PDF has been downloaded",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPaymentReceipt = async (payment: Payment) => {
    if (!invoice) return;
    
    try {
      await generateInvoicePDF({
        invoiceNumber: `${invoice.invoice_number}-R${payments.indexOf(payment) + 1}`,
        invoiceDate: formatDate(payment.payment_date),
        clientName: invoice.client_name,
        projectName: invoice.project_name,
        totalAmount: payment.amount,
        paidAmount: payment.amount,
        remainingAmount: 0,
        status: 'paid',
        notes: `Payment receipt for ${invoice.invoice_number}\n${payment.notes || ''}`,
        payments: [{
          amount: payment.amount,
          payment_date: formatDate(payment.payment_date),
          payment_method: payment.payment_method,
          notes: payment.notes
        }],
        profile: profile || {},
        localization: profile ? {
          currencyCode: profile.currency_code || 'INR',
          currencySymbol: profile.currency_symbol || '₹',
          locale: profile.locale || 'en-IN',
          taxLabel: profile.tax_label || 'GST',
          taxRegistrationLabel: profile.tax_label === 'GST' ? 'GSTIN' : `${profile.tax_label || 'Tax'} No`,
        } : undefined,
        editorSettings: getEditorSettings(),
        invoiceSettings: getInvoiceSettings()
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Error",
        description: "Failed to generate receipt",
        variant: "destructive",
      });
    }
  };

  const isFullyPaid = invoice && (invoice.remaining_amount || 0) <= 0;

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Invoice not found</h3>
            <Button onClick={() => navigate('/invoices')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Button variant="ghost" onClick={() => navigate('/invoices')} className="w-fit -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {/* Action Buttons - Mobile First */}
        <div className="flex flex-wrap gap-2">
          {isFullyPaid ? (
            <Button variant="outline" className="flex-1 sm:flex-none bg-green-50 border-green-200 text-green-700" disabled>
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed
            </Button>
          ) : (
            <Button onClick={openPaymentDialog} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowPreview(true)} className="flex-1 sm:flex-none">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={() => handleDownloadPDF()} disabled={pdfLoading} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            {pdfLoading ? '...' : 'PDF'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this invoice and all its payment records. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteInvoice} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xl sm:text-2xl">{invoice.project_name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{invoice.invoice_number}</p>
            </div>
            <Badge className={`w-fit ${getStatusColor(getDisplayStatus(invoice.status, invoice.due_date))}`}>
              {formatStatusDisplay(getDisplayStatus(invoice.status, invoice.due_date))}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Client Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Client</p>
              <p className="font-medium">{invoice.client_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Invoice Date</p>
              <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-muted-foreground text-xs">Due Date</p>
                <p className="font-medium">{formatDate(invoice.due_date)}</p>
              </div>
            )}
          </div>

          {/* Payment Summary - Highlighted Card */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(invoice.total_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid Amount</span>
                <span className="font-semibold text-green-600 tabular-nums">
                  {formatCurrency(invoice.paid_amount || 0)}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Remaining</span>
                  <span className="font-bold text-xl text-primary tabular-nums">
                    {formatCurrency(invoice.remaining_amount || 0)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((invoice.paid_amount || 0) / invoice.total_amount) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(((invoice.paid_amount || 0) / invoice.total_amount) * 100)}% paid
            </p>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Payment History
              </h3>
              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium tabular-nums">
                          {formatCurrency(payment.amount || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)} • {payment.payment_method?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPaymentReceipt(payment)}
                        className="h-8 px-2"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Invoices */}
          {relatedInvoices.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3">Related Invoices</h3>
              <div className="space-y-2">
                {relatedInvoices.map((relInvoice) => (
                  <div 
                    key={relInvoice.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/invoices/${relInvoice.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{relInvoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(relInvoice.invoice_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">₹{relInvoice.total_amount?.toLocaleString('en-IN')}</p>
                      <Badge className={`text-xs ${getStatusColor(getDisplayStatus(relInvoice.status, relInvoice.due_date))}`}>
                        {formatStatusDisplay(getDisplayStatus(relInvoice.status, relInvoice.due_date))}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {invoice.invoice_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Amount (₹)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
              />
              {/* Quick amount buttons */}
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPaymentAmount(invoice?.remaining_amount || 0)}
                >
                  Full (₹{(invoice?.remaining_amount || 0).toLocaleString('en-IN')})
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPaymentAmount((invoice?.remaining_amount || 0) / 2)}
                >
                  Half (₹{((invoice?.remaining_amount || 0) / 2).toLocaleString('en-IN')})
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Next Payment Due Date (Optional)</Label>
              <Input
                type="date"
                value={nextPaymentDue}
                onChange={(e) => setNextPaymentDue(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Next Payment Amount (Optional)</Label>
              <Input
                type="number"
                value={nextPaymentAmount || ''}
                onChange={(e) => setNextPaymentAmount(parseFloat(e.target.value) || 0)}
                placeholder="Expected next payment"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Any additional notes"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPayment}>
              Add Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Editor */}
      <InvoicePreviewEditor
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onDownload={handleDownloadPDF}
        invoiceData={{
          invoiceNumber: invoice.invoice_number,
          clientName: invoice.client_name,
          projectName: invoice.project_name,
          totalAmount: invoice.total_amount,
          paidAmount: invoice.paid_amount || 0,
          remainingAmount: Math.max(0, invoice.total_amount - (invoice.paid_amount || 0)),
          status: invoice.status || 'unpaid',
          companyName: profile?.company_name,
          companyLogo: profile?.logo_url
        }}
      />
    </div>
  );
};

export default InvoiceDetail;