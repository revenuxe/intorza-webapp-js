import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionState {
  isPro: boolean;
  plan: string | null;
  expiry: string | null;
  proSince: string | null;
  status: string;
  loading: boolean;
  initialLoadComplete: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  refreshSubscription: () => Promise<void>;
  checkProFeature: (actionName: string, callback: () => void) => void;
  setPaywallOpen: (open: boolean, actionName?: string) => void;
  paywallOpen: boolean;
  paywallAction: string;
}

const STORAGE_KEY = 'intorza_pro_status';

// Load initial state from localStorage to prevent flicker
const getInitialState = (): SubscriptionState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Trust the cache while we validate in the background — prevents Pro badge flicker.
      const expiryValid = !parsed.expiry || new Date(parsed.expiry) > new Date();
      if (expiryValid) {
        return {
          isPro: !!parsed.isPro,
          plan: parsed.plan || null,
          expiry: parsed.expiry || null,
          proSince: parsed.proSince || null,
          status: parsed.status || 'inactive',
          loading: false,
          initialLoadComplete: !!parsed.isPro, // treat cached-pro as complete for UI stability
        };
      }
    }
  } catch (e) {
    console.error('Error reading stored subscription:', e);
  }
  return {
    isPro: false,
    plan: null,
    expiry: null,
    proSince: null,
    status: 'inactive',
    loading: true,
    initialLoadComplete: false,
  };
};


const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>(getInitialState);
  const [paywallOpen, setPaywallOpenState] = useState(false);
  const [paywallAction, setPaywallAction] = useState('');

  // Persist Pro status to localStorage
  const persistStatus = useCallback((newState: Partial<SubscriptionState>) => {
    try {
      const toStore = {
        isPro: newState.isPro,
        plan: newState.plan,
        expiry: newState.expiry,
        proSince: newState.proSince,
        status: newState.status,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.error('Error persisting subscription:', e);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!session?.access_token) {
      const newState = { 
        isPro: false, 
        plan: null, 
        expiry: null, 
        proSince: null,
        status: 'inactive',
        loading: false, 
        initialLoadComplete: true 
      };
      setState(newState);
      localStorage.removeItem(STORAGE_KEY);
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
        setState(prev => ({ ...prev, loading: false, initialLoadComplete: true }));
        return;
      }

      const newState = {
        isPro: data.isPro || false,
        plan: data.plan,
        expiry: data.expiry,
        proSince: data.proSince,
        status: data.status || 'inactive',
        loading: false,
        initialLoadComplete: true,
      };
      
      setState(newState);
      persistStatus(newState);
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
      setState(prev => ({ ...prev, loading: false, initialLoadComplete: true }));
    }
  }, [session?.access_token, persistStatus]);

  // Fetch subscription status on mount and when user changes
  useEffect(() => {
    if (user && session) {
      refreshSubscription();
    } else {
      setState({
        isPro: false,
        plan: null,
        expiry: null,
        proSince: null,
        status: 'inactive',
        loading: false,
        initialLoadComplete: true,
      });
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user, session, refreshSubscription]);

  // Listen for payment success event
  useEffect(() => {
    const handlePaymentSuccess = () => {
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
