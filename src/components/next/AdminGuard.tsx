"use client";

import { useEffect, useState } from 'react';
import { useNavigate } from '@/lib/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLoader } from '@/components/GlobalLoader';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [authorizedUser, setAuthorizedUser] = useState<string | null>(null);
  useEffect(() => {
    if (loading) return;
    let active = true;
    if (!userId) {
      navigate('/admin/login', { replace: true });
      return;
    }
    void supabase.rpc('is_admin').then(({ data, error }) => {
      if (!active) return;
      if (!error && data === true) setAuthorizedUser(userId);
      else navigate('/admin/login', { replace: true });
    }, () => { if (active) navigate('/admin/login', { replace: true }); });
    return () => { active = false; };
  }, [userId, loading, navigate]);
  if (!user || authorizedUser !== user.id) return <GlobalLoader message="Checking admin access…" fullScreen={false} />;
  return <>{children}</>;
}
