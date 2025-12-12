import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Crown, Sparkles, Zap } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PRO_FEATURES = [
  'Mark quotations as accepted',
  'Save quotations to cloud',
  'Convert to invoices',
  'Access My Projects',
  'Site Measurement module',
  'Add team members',
  'Photo & file attachments',
  'All professional tools',
];

export const PaywallModal: React.FC = () => {
  const { paywallOpen, setPaywallOpen, paywallAction, refreshSubscription } = useSubscription();
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
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create subscription order
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

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Intorza',
        description: 'Intorza Pro - Monthly Subscription',
        order_id: data.orderId,
        prefill: data.prefill,
        notes: data.notes,
        theme: {
          color: '#000000',
        },
        handler: async function (response: any) {
          try {
            // Verify payment
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

            toast.success('Welcome to Intorza Pro! 🎉');
            
            // Trigger refresh
            window.dispatchEvent(new Event('subscription-payment-success'));
            await refreshSubscription();
            
            setPaywallOpen(false);
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">Unlock Intorza Pro</DialogTitle>
          <DialogDescription className="text-base">
            <span className="line-through text-muted-foreground">₹1,999</span>{' '}
            <span className="text-2xl font-bold text-foreground">₹49</span>
            <span className="text-muted-foreground">/month</span>
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
              <Sparkles className="w-4 h-4" />
              Limited Offer
            </span>
          </DialogDescription>
        </DialogHeader>

        {paywallAction && (
          <div className="bg-muted/50 rounded-lg p-3 text-center text-sm">
            <Zap className="w-4 h-4 inline mr-1 text-amber-500" />
            <span className="text-muted-foreground">
              Upgrade to <strong>{paywallAction}</strong>
            </span>
          </div>
        )}

        <div className="space-y-3 py-4">
          {PRO_FEATURES.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-6"
          >
            {loading ? 'Processing...' : 'Upgrade for ₹49/month'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPaywallOpen(false)}
            className="w-full text-muted-foreground"
          >
            Maybe later
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Cancel anytime. Secure payment via Razorpay.
        </p>
      </DialogContent>
    </Dialog>
  );
};
