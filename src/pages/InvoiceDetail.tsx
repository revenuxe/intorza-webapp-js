import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInvoicePDF } from "@/lib/invoicePdfGenerator";

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
  switch (status?.toLowerCase()) {
    case "paid":
      return "bg-green-500/10 text-green-700";
    case "partially paid":
      return "bg-yellow-500/10 text-yellow-700";
    case "unpaid":
      return "bg-orange-500/10 text-orange-700";
    case "overdue":
      return "bg-red-500/10 text-red-700";
    default:
      return "bg-gray-500/10 text-gray-700";
  }
};

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    if (id) {
      loadInvoice();
      loadPayments();
    }
  }, [id]);

  useEffect(() => {
    if (invoice?.quotation_id) {
      loadRelatedInvoices();
    }
  }, [invoice?.quotation_id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setInvoice(data);
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

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleAddPayment = async () => {
    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: paymentNotes
        });

      if (paymentError) throw paymentError;

      const newPaidAmount = (invoice?.paid_amount || 0) + paymentAmount;
      const newRemainingAmount = (invoice?.total_amount || 0) - newPaidAmount;
      const newStatus = newRemainingAmount <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partially paid' : 'unpaid');

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: Math.max(0, newRemainingAmount),
          status: newStatus
        })
        .eq('id', id);

      if (invoiceError) throw invoiceError;

      toast({
        title: "Payment Added",
        description: "Payment has been recorded successfully",
      });

      setPaymentDialogOpen(false);
      setPaymentAmount(0);
      setPaymentNotes("");
      loadInvoice();
      loadPayments();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Error",
        description: "Failed to add payment",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    try {
      setPdfLoading(true);
      
      // Load profile data
      const { data: { user } } = await supabase.auth.getUser();
      let profile = {};
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          profile = profileData;
        }
      }

      await generateInvoicePDF({
        invoiceNumber: invoice.invoice_number,
        invoiceDate: formatDate(invoice.invoice_date),
        dueDate: invoice.due_date ? formatDate(invoice.due_date) : undefined,
        clientName: invoice.client_name,
        projectName: invoice.project_name,
        totalAmount: invoice.total_amount,
        paidAmount: invoice.paid_amount || 0,
        remainingAmount: invoice.remaining_amount || 0,
        status: invoice.status || 'unpaid',
        notes: invoice.notes,
        payments: payments.map(p => ({
          amount: p.amount,
          payment_date: formatDate(p.payment_date),
          payment_method: p.payment_method,
          notes: p.notes
        })),
        profile: profile as any
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

  const isFullyPaid = invoice && (invoice.remaining_amount || 0) <= 0;

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
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
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2 flex-wrap">
            {isFullyPaid ? (
              <Button variant="outline" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100" disabled>
                <CheckCircle className="h-4 w-4 mr-2" />
                Project Completed
              </Button>
            ) : (
              <Button onClick={() => setPaymentDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
                <span className="ml-2 text-xs opacity-75">
                  (₹{(invoice.remaining_amount || 0).toLocaleString('en-IN')} remaining)
                </span>
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadPDF} disabled={pdfLoading}>
              <Download className="h-4 w-4 mr-2" />
              {pdfLoading ? 'Generating...' : 'PDF'}
            </Button>
          </div>
        </div>

        {/* Main Details */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{invoice.project_name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{invoice.invoice_number}</p>
              </div>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'Unpaid'}
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
                  <p className="font-medium">{invoice.client_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
                </div>
                {invoice.due_date && (
                  <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="font-medium">{formatDate(invoice.due_date)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <h3 className="font-semibold mb-3">Payment Summary</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-medium tabular-nums">
                    ₹{invoice.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid Amount</span>
                  <span className="font-medium text-green-600 tabular-nums">
                    ₹{(invoice.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Remaining Amount</span>
                    <span className="font-bold text-lg text-primary tabular-nums">
                      ₹{(invoice.remaining_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Payment History</h3>
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium tabular-nums">
                          ₹{payment.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)} • {payment.payment_method}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Invoices from Same Quotation */}
            {relatedInvoices.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Related Invoices</h3>
                <div className="space-y-2">
                  {relatedInvoices.map((relInvoice) => (
                    <div 
                      key={relInvoice.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/invoices/${relInvoice.id}`)}
                    >
                      <div>
                        <p className="font-medium">{relInvoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{relInvoice.project_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium tabular-nums">₹{relInvoice.total_amount?.toLocaleString('en-IN')}</p>
                        <Badge className={getStatusColor(relInvoice.status)}>
                          {relInvoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invoice.notes && (
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment</DialogTitle>
              <DialogDescription>
                Record a new payment for this invoice. Balance: ₹{(invoice.remaining_amount || 0).toLocaleString('en-IN')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="₹0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  max={invoice.remaining_amount || 0}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: ₹{(invoice.remaining_amount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
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
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notes (Optional)</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPayment} disabled={paymentAmount <= 0}>
                Save Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default InvoiceDetail;
