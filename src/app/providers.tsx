"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { FeedbackProvider } from "@/components/FeedbackProvider";
import { PaywallModal } from "@/components/PaywallModal";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ServiceWorkerRegistration } from "@/components/next/ServiceWorkerRegistration";
import { accountKeys } from '@/lib/accountQueries';
import { QuotationJobProcessor } from '@/components/QuotationJobProcessor';

function AccountCacheBoundary({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    // Remove only other identities: clearing everything here also cancels the
    // new account's queries that child components have just started.
    queryClient.removeQueries({ predicate: query => query.queryKey[0] === 'account' && query.queryKey[1] !== user?.id });
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!user?.id || detail?.ownerId !== user.id) return;
      void queryClient.invalidateQueries({ queryKey: detail.resource === 'profile' ? accountKeys.profile(user.id) : accountKeys.quotations(user.id) });
    };
    window.addEventListener('intorza:account-data-changed',changed);
    return () => window.removeEventListener('intorza:account-data-changed',changed);
  }, [user?.id, queryClient]);
  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountCacheBoundary>
          <TooltipProvider>
            <SubscriptionProvider>
              <FeedbackProvider>
                <Toaster /><Sonner />
                <PaywallModal /><PWAInstallPrompt /><OfflineIndicator />
                <ServiceWorkerRegistration />
                <QuotationJobProcessor />
                {children}
              </FeedbackProvider>
            </SubscriptionProvider>
          </TooltipProvider>
        </AccountCacheBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
