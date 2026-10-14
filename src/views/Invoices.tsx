"use client";

import { useState, useEffect } from "react";
import { Receipt, Trash2 } from "lucide-react";
import { useNavigate } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/hooks/useLocalization";
import { invoicesApi } from "@/lib/api";
import { getDisplayStatus } from "@/lib/invoiceStatus";
import { ListSkeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  due_date: string | null;
  created_at: string;
}

const getStatusColor = (status: string) => {
  const normalizedStatus = status?.toLowerCase().replace(/_/g, ' ');
  switch (normalizedStatus) {
    case "paid":
      return "bg-green-500/10 text-green-700 hover:bg-green-500/20";
    case "partially paid":
      return "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20";
    case "unpaid":
      return "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20";
    case "overdue":
      return "bg-red-500/10 text-red-700 hover:bg-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 hover:bg-gray-500/20";
  }
};

const formatStatusDisplay = (status: string) => {
  if (!status) return 'Unpaid';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const Invoices = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatCurrency, formatDate } = useLocalization();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await invoicesApi.list();
      setInvoices((data as Invoice[]) || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        title: "Error loading invoices",
        description: "Failed to load invoices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      setDeletingId(invoiceId);

      // Backend cascade-deletes payments with the invoice.
      await invoicesApi.remove(invoiceId);

      toast({
        title: "Invoice Deleted",
        description: "The invoice has been permanently deleted",
      });
      
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // formatDate is now provided by useLocalization hook

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">Track payments and manage invoices</p>
          </div>
        </div>

        {loading ? (
          <ListSkeleton count={4} />
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Invoices are created when quotations are accepted</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-mono text-muted-foreground">{invoice.invoice_number}</p>
                        <h3 className="font-semibold text-foreground mt-1">{invoice.project_name}</h3>
                        <p className="text-sm text-muted-foreground">{invoice.client_name}</p>
                      </div>
                      <Badge className={getStatusColor(getDisplayStatus(invoice.status, invoice.due_date))}>
                        {formatStatusDisplay(getDisplayStatus(invoice.status, invoice.due_date))}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {formatCurrency(invoice.total_amount || 0, true)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-sm font-bold text-green-600 tabular-nums">
                          {formatCurrency(invoice.paid_amount || 0, true)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className="text-sm font-bold text-primary tabular-nums">
                          {formatCurrency(invoice.remaining_amount || 0, true)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="text-sm font-medium">
                          {formatDate(invoice.invoice_date || invoice.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        View Details
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-destructive hover:text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
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
                            <AlertDialogAction 
                              onClick={() => handleDeleteInvoice(invoice.id)} 
                              disabled={deletingId === invoice.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingId === invoice.id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;