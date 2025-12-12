import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Crown, CreditCard, Calendar, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface PaymentLog {
  id: string;
  event_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
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
        return <Badge className="bg-green-500/10 text-green-700">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-700">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-orange-500/10 text-orange-700">Refunded</Badge>;
      default:
        return <Badge variant="outline">{eventStatus}</Badge>;
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
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPro ? (
            <>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Intorza Pro</p>
                    <p className="text-sm text-muted-foreground">
                      {plan === 'monthly' ? 'Monthly subscription' : plan}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Active</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Renews on:</span>
                </div>
                <span className="font-medium">
                  {expiry ? formatDate(expiry) : 'N/A'}
                </span>
                
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Payment status:</span>
                </div>
                <span className="font-medium capitalize">{status || 'Active'}</span>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Free Plan</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upgrade to Pro to unlock all features
              </p>
              <Button 
                onClick={() => setPaywallOpen(true, 'Upgrade')}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade for ₹49/month
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : paymentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No payment history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentLogs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {log.event_type?.replace(/_/g, ' ').replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {log.amount && (
                      <span className="text-sm font-medium tabular-nums">
                        ₹{(log.amount / 100).toFixed(2)}
                      </span>
                    )}
                    {getStatusBadge(log.status)}
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
