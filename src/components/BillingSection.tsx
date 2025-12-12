import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Crown, CreditCard, Calendar, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

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
  const { isPro, plan, expiry, status, setPaywallOpen, loading: subLoading } = useSubscription();
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);

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
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      default:
        return <Badge variant="outline" className="text-[10px]">{eventStatus}</Badge>;
    }
  };

  const downloadReceipt = (log: PaymentLog) => {
    const receiptContent = `
INTORZA PRO - PAYMENT RECEIPT
=============================

Transaction ID: ${log.provider_event_id || log.id}
Date: ${formatDate(log.created_at)}
Amount: ₹${(log.amount / 100).toFixed(2)}
Status: ${log.status?.toUpperCase() || 'SUCCESS'}
Payment Type: ${log.event_type?.replace(/_/g, ' ').replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

=============================
Thank you for your subscription!
support@intorza.com
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intorza-receipt-${log.id.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Receipt downloaded');
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
                      {plan === 'monthly' ? 'Monthly' : plan}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-[10px]">Active</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Renews:</span>
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
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Free Plan</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Upgrade to unlock all features
              </p>
              <Button 
                onClick={() => setPaywallOpen(true, 'Upgrade')}
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs h-8"
              >
                <Crown className="h-3 w-3 mr-1" />
                Upgrade ₹49/mo
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
                        ₹{(log.amount / 100).toFixed(2)}
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
