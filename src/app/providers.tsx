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

function AccountCacheBoundary({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => { queryClient.clear(); }, [user?.id, queryClient]);
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
                {children}
              </FeedbackProvider>
            </SubscriptionProvider>
          </TooltipProvider>
        </AccountCacheBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
