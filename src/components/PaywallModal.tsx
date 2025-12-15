import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Crown, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PRO_FEATURES = [
  'Mark quotations as accepted',
  'Save & manage projects',
  'Convert to invoices',
  'Site measurement tools',
  'Add team members',
];

const TRIAL_DAYS = 30;

export const PaywallModal: React.FC = () => {
  const navigate = useNavigate();
  const { paywallOpen, setPaywallOpen, refreshSubscription } = useSubscription();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async () => {
    if (!session?.access_token) {
      toast.error('Please login to upgrade');
      return;
    }

    setLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      const { data, error } = await supabase.functions.invoke('razorpay-create-subscription', {
        body: { plan: 'monthly' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create order');
      }

      if (data.isPro) {
        toast.success('You already have Pro access!');
        setPaywallOpen(false);
        return;
      }

      // If trial was activated without payment, just refresh and close
      if (data.trialActivated && !data.orderId) {
        toast.success('Free trial activated! Enjoy Pro for 30 days.');
        window.dispatchEvent(new Event('subscription-payment-success'));
        await refreshSubscription();
        setPaywallOpen(false);
        navigate('/dashboard');
        return;
      }

      const isSubscriptionFlow = !!data.subscriptionId && !data.orderId;

      const options = {
        key: data.keyId,
        name: 'Intorza',
        description: data.trial ? '₹1 authorization (refundable) • Autopay ₹49/month after trial' : 'Pro Monthly - ₹49/month',
        ...(isSubscriptionFlow
          ? {
              subscription_id: data.subscriptionId,
            }
          : {
              amount: data.amount,
              currency: data.currency,
              order_id: data.orderId,
            }),
        prefill: data.prefill,
        notes: data.notes,
        theme: {
          color: '#f59e0b',
        },
        handler: async function (response: any) {
          try {
            // Close modal and navigate to processing page
            setPaywallOpen(false);
            navigate('/payment-processing?return=/dashboard');
            
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'razorpay-verify-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_subscription_id: response.razorpay_subscription_id,
                  razorpay_signature: response.razorpay_signature,
                  plan: 'monthly',
                },
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );

            if (verifyError) {
              console.error('Payment verification error:', verifyError);
              // Don't show error toast - the payment processing page will handle status
            }

            // Dispatch event and refresh
            window.dispatchEvent(new Event('subscription-payment-success'));
            await refreshSubscription();
          } catch (error: any) {
            console.error('Payment verification error:', error);
            // Don't show error toast - the payment processing page will handle status
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={paywallOpen} onOpenChange={(open) => setPaywallOpen(open)}>
      <DialogContent className="max-w-[260px] sm:max-w-[280px] p-0 gap-0 overflow-hidden rounded-xl">
        <DialogTitle className="sr-only">Upgrade to Intorza Pro</DialogTitle>
        <DialogDescription className="sr-only">
          Start your free trial of Intorza Pro to unlock all premium features.
        </DialogDescription>
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-3 sm:p-4 text-center text-white">
          <div className="w-9 h-9 sm:w-10 sm:h-10 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold mb-0.5">Try Pro FREE</h2>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-lg sm:text-xl font-bold">{TRIAL_DAYS} Days Free</span>
          </div>
          <div className="text-white/80 text-[10px] sm:text-xs mt-1">
            Then <span className="line-through">₹1,999</span> <span className="font-semibold">₹49/month</span>
          </div>
          <div className="inline-flex items-center gap-1 mt-1.5 text-[9px] sm:text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5" />
            ₹1 refundable to verify • Autopay ₹49/month
          </div>
        </div>

        {/* Features */}
        <div className="p-2.5 sm:p-3 space-y-1">
          {PRO_FEATURES.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-2 h-2" style={{ color: 'hsl(var(--chart-2))' }} />
              </div>
              <span className="text-[11px] sm:text-xs text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-2.5 sm:p-3 pt-0 space-y-1.5">
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full h-8 sm:h-9 text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg shadow-lg shadow-amber-500/25"
          >
            {loading ? 'Processing...' : 'Start Free Trial'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPaywallOpen(false)}
            className="w-full h-6 sm:h-7 text-muted-foreground text-[10px] sm:text-xs"
          >
            Maybe later
          </Button>
        </div>

        <p className="text-[8px] sm:text-[9px] text-center text-muted-foreground pb-2.5 sm:pb-3 px-3">
          Cancel anytime • No charge until trial ends
        </p>
      </DialogContent>
    </Dialog>
  );
};
