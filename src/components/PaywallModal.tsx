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
import { useLocalization } from '@/hooks/useLocalization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Crown } from 'lucide-react';

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

export const PaywallModal: React.FC = () => {
  const navigate = useNavigate();
  const { paywallOpen, setPaywallOpen, refreshSubscription } = useSubscription();
  const { session } = useAuth();
  const { settings } = useLocalization();
  const [loading, setLoading] = useState(false);
  
  // Determine price text based on country
  const priceText = settings.countryCode === 'IN' ? '₹1' : '$1';

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
        <div className="bg-gradient-to-br from-primary to-secondary p-4 sm:p-5 text-center text-primary-foreground">
          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 bg-primary-foreground/15 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold mb-1">1 Month FREE</h2>
          <div className="text-3xl sm:text-4xl font-bold my-2">
            Just {priceText}
          </div>
          <p className="text-primary-foreground/80 text-xs sm:text-sm">
            Unlock all Pro features
          </p>
        </div>

        {/* Features */}
        <div className="p-2.5 sm:p-3 space-y-1">
          {PRO_FEATURES.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
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
            className="w-full h-8 sm:h-9 text-xs sm:text-sm bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-semibold rounded-lg shadow-lg shadow-primary/25"
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
