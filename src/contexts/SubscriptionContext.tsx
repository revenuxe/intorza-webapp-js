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
const getInitialState = (): SubscriptionState & { ownerId: string | null } => {
  return {
    ownerId: null,
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
  const identity = useRef(user?.id ?? null);
  identity.current = user?.id ?? null;
  const [state, setState] = useState(getInitialState);
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
    if (!user || !session?.access_token) {
      const newState = { 
        ownerId: null,
        isPro: false, 
        plan: null, 
        expiry: null, 
        proSince: null,
        status: 'inactive',
        loading: false, 
        initialLoadComplete: true 
      };
      setState(newState);
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
      return;
    }

    setState(prev => prev.ownerId === user.id && prev.initialLoadComplete && prev.status !== 'unavailable'
      ? prev : { ...getInitialState(), ownerId: user.id });

    try {
      // The existing status function reads these same owner-scoped fields.
      // One authenticated RLS query avoids an edge-function cold start plus
      // a second auth/profile round trip. Paid APIs still enforce access server-side.
      const { data, error } = await supabase.from('profiles')
        .select('is_pro,pro_since,pro_plan,pro_expiry,payment_status').eq('id', user.id).single();

      // A response from a previous account or request cannot restore its status.
      if (version !== requestVersion.current || identity.current !== user.id) return;

      if (error || !data || typeof data.is_pro !== 'boolean') {
        console.error('Error fetching subscription status:', error);
        setState(prev => ({ ...prev, ownerId: user.id, isPro: false, status: 'unavailable', loading: false, initialLoadComplete: true }));
        return;
      }

      const newState = {
        ownerId: user.id,
        isPro: data.is_pro && (!data.pro_expiry || Date.parse(data.pro_expiry) > Date.now()),
        plan: data.pro_plan,
        expiry: data.pro_expiry,
        proSince: data.pro_since,
        status: data.payment_status || 'inactive',
        loading: false,
        initialLoadComplete: true,
      };
      
      setState(newState);
      persistStatus(newState);
    } catch (error) {
      if (version !== requestVersion.current || identity.current !== user.id) return;
      console.error('Failed to refresh subscription:', error);
      setState(prev => ({ ...prev, ownerId: user.id, isPro: false, status: 'unavailable', loading: false, initialLoadComplete: true }));
    }
  }, [user?.id, session?.access_token, persistStatus]);

  // Fetch subscription status on mount and when user changes
  useEffect(() => {
    if (authLoading) return;
    setState(prev => prev.ownerId === (user?.id ?? null) ? prev : getInitialState());
    setPaywallOpenState(false);
    if (user && session) {
      refreshSubscription();
    } else {
      setState({
        ownerId: null,
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
    if (authLoading || state.ownerId !== (user?.id ?? null) || state.loading || !state.initialLoadComplete || state.status === 'unavailable') return;
    if (state.isPro) {
      callback();
    } else {
      setPaywallOpen(true, actionName);
    }
  }, [authLoading, user?.id, state, setPaywallOpen]);

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        isPro: !authLoading && state.ownerId === (user?.id ?? null) && state.initialLoadComplete && state.isPro,
        loading: authLoading || state.ownerId !== (user?.id ?? null) || state.loading,
        initialLoadComplete: !authLoading && state.ownerId === (user?.id ?? null) && state.initialLoadComplete,
        refreshSubscription,
        checkProFeature,
        setPaywallOpen,
        paywallOpen: !authLoading && state.ownerId === (user?.id ?? null) && paywallOpen,
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
