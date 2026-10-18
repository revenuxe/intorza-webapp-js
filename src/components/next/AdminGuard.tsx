"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLoader } from '@/components/GlobalLoader';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const [authorizedUser, setAuthorizedUser] = useState<string | null>(null);
  useEffect(() => {
    if (loading) return;
    let active = true;
    if (!userId) {
      router.replace('/admin/login');
      return;
    }
    void supabase.rpc('is_admin').then(({ data, error }) => {
      if (!active) return;
      if (!error && data === true) setAuthorizedUser(userId);
      else router.replace('/admin/login');
    }, () => { if (active) router.replace('/admin/login'); });
    return () => { active = false; };
  }, [userId, loading, router]);
  if (!user || authorizedUser !== user.id) return <GlobalLoader message="Checking admin access…" fullScreen={false} />;
  return <>{children}</>;
}
