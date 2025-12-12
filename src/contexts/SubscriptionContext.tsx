import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionState {
  isPro: boolean;
  plan: string | null;
  expiry: string | null;
  status: string;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  refreshSubscription: () => Promise<void>;
  checkProFeature: (actionName: string, callback: () => void) => void;
  setPaywallOpen: (open: boolean, actionName?: string) => void;
  paywallOpen: boolean;
  paywallAction: string;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isPro: false,
    plan: null,
    expiry: null,
    status: 'inactive',
    loading: true,
  });
  const [paywallOpen, setPaywallOpenState] = useState(false);
  const [paywallAction, setPaywallAction] = useState('');

  const refreshSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, loading: false, isPro: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('subscription-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching subscription status:', error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      setState({
        isPro: data.isPro || false,
        plan: data.plan,
        expiry: data.expiry,
        status: data.status || 'inactive',
        loading: false,
      });
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [session?.access_token]);

  // Fetch subscription status on mount and when user changes
  useEffect(() => {
    if (user && session) {
      refreshSubscription();
    } else {
      setState({
        isPro: false,
        plan: null,
        expiry: null,
        status: 'inactive',
        loading: false,
      });
    }
  }, [user, session, refreshSubscription]);

  // Poll for subscription updates after payment
  useEffect(() => {
    // Listen for custom event from payment success
    const handlePaymentSuccess = () => {
      // Poll for 30 seconds with 3-second intervals
      let attempts = 0;
      const maxAttempts = 10;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        await refreshSubscription();
        
        if (state.isPro || attempts >= maxAttempts) {
          clearInterval(pollInterval);
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    };

    window.addEventListener('subscription-payment-success', handlePaymentSuccess);
    return () => window.removeEventListener('subscription-payment-success', handlePaymentSuccess);
  }, [refreshSubscription, state.isPro]);

  const setPaywallOpen = useCallback((open: boolean, actionName?: string) => {
    setPaywallOpenState(open);
    if (actionName) {
      setPaywallAction(actionName);
    }
  }, []);

  const checkProFeature = useCallback((actionName: string, callback: () => void) => {
    if (state.isPro) {
      callback();
    } else {
      setPaywallOpen(true, actionName);
    }
  }, [state.isPro, setPaywallOpen]);

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        refreshSubscription,
        checkProFeature,
        setPaywallOpen,
        paywallOpen,
        paywallAction,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
