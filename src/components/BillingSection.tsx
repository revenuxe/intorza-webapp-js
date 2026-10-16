import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLocalization } from "@/hooks/useLocalization";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Crown, CreditCard, Calendar, CheckCircle, AlertCircle, Loader2, Download, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PaymentLog {
  id: string;
  event_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  provider_event_id: string | null;
}

export const BillingSection = () => {
  const { isPro, plan, expiry, status, setPaywallOpen, loading: subLoading, refreshSubscription } = useSubscription();
  const { session } = useAuth();
  const { settings, countryConfig, formatDate: formatLocalizedDate } = useLocalization();
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  
  // Determine price text and flag based on country
  const isIndia = settings.countryCode === 'IN';
  const priceText = isIndia ? '₹499' : '$1';
  const countryFlag = countryConfig?.flag || '🌍';

  useEffect(() => {
    loadPaymentLogs();
  }, []);

  const loadPaymentLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPaymentLogs(data || []);
    } catch (error) {
      console.error('Error loading payment logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(settings.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Format currency based on the log's currency
  const formatPaymentAmount = (amount: number, currency: string) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${(amount / 100).toFixed(2)}`;
  };

  const getStatusBadge = (eventStatus: string) => {
    switch (eventStatus?.toLowerCase()) {
      case 'captured':
      case 'active':
        return <Badge className="bg-green-500/10 text-green-700 text-[10px]">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-700 text-[10px]">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-orange-500/10 text-orange-700 text-[10px]">Refunded</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500/10 text-blue-700 text-[10px]">Trial</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500/10 text-gray-700 text-[10px]">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{eventStatus}</Badge>;
    }
  };

  const downloadReceipt = async (log: PaymentLog) => {
    try {
      // Import jsPDF dynamically
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;
      
      // Header background
      doc.setFillColor(27, 46, 79); // #1b2e4f
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Company name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('INTORZA', pageWidth / 2, y + 10, { align: 'center' });
      
      // Receipt title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('PAYMENT RECEIPT', pageWidth / 2, y + 22, { align: 'center' });
      
      y = 65;
      
      // Receipt details
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      
      const details = [
        ['Transaction ID:', log.provider_event_id || log.id],
        ['Date:', formatDate(log.created_at)],
        ['Amount:', `₹${(log.amount / 100).toFixed(2)}`],
        ['Status:', log.status?.toUpperCase() || 'SUCCESS'],
        ['Payment Type:', log.event_type?.replace(/_/g, ' ').replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())],
        ['Plan:', 'Intorza Pro'],
      ];
      
      details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 80, y);
        y += 10;
      });
      
      // Divider
      y += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);
      y += 15;
      
      // Thank you message
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for your subscription!', pageWidth / 2, y, { align: 'center' });
      y += 8;
      doc.text('For support, contact: intorza.com@gmail.com', pageWidth / 2, y, { align: 'center' });
      
      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('www.intorza.com', pageWidth / 2, footerY, { align: 'center' });
      
      // Save PDF
      doc.save(`intorza-receipt-${log.id.substring(0, 8)}.pdf`);
      toast.success('Receipt downloaded');
    } catch (error) {
      console.error('Error generating PDF receipt:', error);
      toast.error('Failed to generate receipt');
    }
  };

  const handleCancelSubscription = async () => {
    if (!session?.access_token) {
      toast.error('Please login to cancel subscription');
      return;
    }

    setCancelling(true);

    try {
      const { data, error } = await supabase.functions.invoke('razorpay-cancel-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to cancel subscription');
      }

      toast.success(data.message || 'Subscription cancelled successfully');
      await refreshSubscription();
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (subLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subscription Status Card */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-amber-500" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {isPro ? (
            <>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">Intorza Pro</p>
                    <p className="text-xs text-muted-foreground">
                      {status === 'trial' ? 'Free Trial' : plan === 'monthly' ? '₹49/month' : plan}
                    </p>
                  </div>
                </div>
                {status === 'trial' ? (
                  <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-[10px]">Trial</Badge>
                ) : status === 'cancelled' ? (
                  <Badge className="bg-gray-500/10 text-gray-700 border-gray-500/20 text-[10px]">Cancelled</Badge>
                ) : (
                  <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-[10px]">Active</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {status === 'cancelled' ? 'Access until:' : status === 'trial' ? 'Trial ends:' : 'Renews:'}
                  </span>
                </div>
                <span className="font-medium text-right">
                  {expiry ? new Date(expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                </div>
                <span className="font-medium capitalize text-right">{status || 'Active'}</span>
              </div>

              {/* Cancel Subscription Button */}
              {status !== 'cancelled' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-8"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[300px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-base">Cancel Subscription?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs">
                        {status === 'trial' 
                          ? 'Your trial will end immediately and you will lose Pro features.'
                          : `You will retain Pro access until ${expiry ? new Date(expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the end of your billing period'}. No further charges will be made.`
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="text-xs h-8">Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
                      >
                        {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {status === 'cancelled' && (
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Want to continue with Pro?
                  </p>
                  <Button 
                    onClick={() => setPaywallOpen(true, 'Resubscribe')}
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs h-8"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Resubscribe
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Free Plan</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Try Pro FREE for 1 month! <span className="inline-flex items-center gap-1">({countryFlag} {priceText})</span>
              </p>
              <Button 
                onClick={() => setPaywallOpen(true, 'Upgrade')}
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs h-8"
              >
                <Crown className="h-3 w-3 mr-1" />
                Start Free Trial
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : paymentLogs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paymentLogs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {log.event_type?.replace(/_/g, ' ').replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.amount && (
                      <span className="text-xs font-medium tabular-nums">
                        {formatPaymentAmount(log.amount, log.currency || 'INR')}
                      </span>
                    )}
                    {getStatusBadge(log.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => downloadReceipt(log)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
