import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
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

export const PaywallModal: React.FC = () => {
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

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Intorza',
        description: 'Pro Monthly - ₹49/month',
        order_id: data.orderId,
        prefill: data.prefill,
        notes: data.notes,
        theme: {
          color: '#f59e0b',
        },
        handler: async function (response: any) {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'razorpay-verify-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan: 'monthly',
                },
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );

            if (verifyError) {
              throw new Error(verifyError.message);
            }

            toast.success('Welcome to Pro! 🎉');
            window.dispatchEvent(new Event('subscription-payment-success'));
            await refreshSubscription();
            setPaywallOpen(false);
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Contact support.');
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
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-6 text-center text-white">
          <div className="w-12 h-12 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Crown className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold mb-1">Upgrade to Pro</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="text-white/70 line-through text-sm">₹1,999</span>
            <span className="text-2xl font-bold">₹49</span>
            <span className="text-white/80 text-sm">/month</span>
          </div>
          <div className="inline-flex items-center gap-1 mt-2 text-xs bg-white/20 px-2 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            Limited Offer
          </div>
        </div>

        {/* Features */}
        <div className="p-5 space-y-2.5">
          {PRO_FEATURES.map((feature, index) => (
            <div key={index} className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-2.5 h-2.5 text-green-600" />
              </div>
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 space-y-2">
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25"
          >
            {loading ? 'Processing...' : 'Upgrade Now'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPaywallOpen(false)}
            className="w-full h-9 text-muted-foreground text-sm"
          >
            Maybe later
          </Button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground pb-4 px-5">
          Secure payment via Razorpay • Cancel anytime
        </p>
      </DialogContent>
    </Dialog>
  );
};
