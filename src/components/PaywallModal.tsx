import React, { useState } from 'react';
import { useNavigate } from '@/lib/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/hooks/useAuth';
import { useLocalization } from '@/hooks/useLocalization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Crown, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const PaywallModal: React.FC = () => {
  const navigate = useNavigate();
  const { paywallOpen, setPaywallOpen, refreshSubscription } = useSubscription();
  const { session } = useAuth();
  const { settings, countryConfig } = useLocalization();
  const [loading, setLoading] = useState(false);
  
  // Determine price text and flag based on country
  const priceText = settings.countryCode === 'IN' ? '₹1' : '$1';
  const countryFlag = countryConfig?.flag || '🌍';

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

      // Always use order-based flow (all payment methods)
      const options = {
        key: data.keyId,
        name: 'Intorza',
        description: 'Pro Activation • 30 Days Free',
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        prefill: data.prefill,
        notes: data.notes,
        theme: {
          color: '#f59e0b',
        },
        handler: async function (response: Record<string, string>) {
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
          } catch (error: unknown) {
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
      
    } catch (error: unknown) {
      console.error('Upgrade error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={paywallOpen} onOpenChange={(open) => setPaywallOpen(open)}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[19.5rem] gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-2xl sm:max-w-[20.5rem] [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:z-10 [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/15 [&>button:last-child]:p-1.5 [&>button:last-child]:text-white [&>button:last-child]:opacity-100 [&>button:last-child]:ring-1 [&>button:last-child]:ring-white/20 [&>button:last-child]:hover:bg-white/25">
        <DialogTitle className="sr-only">Upgrade to Intorza Pro</DialogTitle>
        <DialogDescription className="sr-only">
          Start your free trial of Intorza Pro to unlock all premium features.
        </DialogDescription>
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#d96848] via-primary to-[#263b63] px-4 pb-5 pt-5 text-center text-primary-foreground">
          <Sparkles className="absolute left-6 top-6 h-3.5 w-3.5 text-amber-200/80" /><Sparkles className="absolute bottom-5 right-8 h-3 w-3 text-white/60" />
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
            <Crown className="h-6 w-6 text-amber-100" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Intorza Pro</p><h2 className="mt-1 text-xl font-semibold tracking-tight">One month free</h2>
          <div className="my-1 flex items-center justify-center gap-1.5 text-2xl font-bold tracking-tight">
            <span className="text-base">{countryFlag}</span> {priceText}
          </div>
          <p className="text-xs text-primary-foreground/75">Unlock the complete workspace.</p>
        </div>

        {/* Features */}
        <div className="space-y-1.5 px-4 pb-2 pt-4">
          {PRO_FEATURES.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-[13px] text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-1 p-4 pt-2">
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="h-10 w-full rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:from-primary/90 hover:to-secondary/90"
          >
            {loading ? 'Processing...' : 'Start Free Trial'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPaywallOpen(false)}
            className="h-8 w-full text-xs text-muted-foreground"
          >
            Maybe later
          </Button>
        </div>

        <p className="px-4 pb-4 text-center text-[9px] text-muted-foreground">
          Cancel anytime • No charge until trial ends
        </p>
      </DialogContent>
    </Dialog>
  );
};
