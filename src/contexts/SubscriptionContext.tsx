import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

// Always start from a consistent SSR-safe state. Browser storage is not proof
// of entitlement, and must not carry Pro status across account changes.
const getInitialState = (): SubscriptionState => {
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
  const { user, session, loading: authLoading } = useAuth();
  const requestVersion = useRef(0);
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
    const version = ++requestVersion.current;
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

      // A response from a previous account or request cannot restore its status.
      if (version !== requestVersion.current) return;

      if (error || !data || typeof data.isPro !== 'boolean') {
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
      if (version !== requestVersion.current) return;
      console.error('Failed to refresh subscription:', error);
      setState(prev => ({ ...prev, loading: false, initialLoadComplete: true }));
    }
  }, [session?.access_token, persistStatus]);

  // Fetch subscription status on mount and when user changes
  useEffect(() => {
    if (authLoading) return;
    setState(getInitialState());
    setPaywallOpenState(false);
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
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    }
    return () => { requestVersion.current++; };
  }, [user?.id, session?.access_token, authLoading, refreshSubscription]);

  // Listen for payment success event
  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | undefined;
    const handlePaymentSuccess = () => {
      if (pollInterval) clearInterval(pollInterval);
      let attempts = 0;
      const maxAttempts = 10;
      
      pollInterval = setInterval(async () => {
        attempts++;
        await refreshSubscription();
        
        if (state.isPro || attempts >= maxAttempts) {
          clearInterval(pollInterval);
        }
      }, 3000);

    };

    window.addEventListener('subscription-payment-success', handlePaymentSuccess);
    return () => {
      window.removeEventListener('subscription-payment-success', handlePaymentSuccess);
      if (pollInterval) clearInterval(pollInterval);
    };
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
