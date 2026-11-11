"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from '@/lib/navigation';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLoader } from '@/components/GlobalLoader';

export function TeamPortalGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [approvedUser, setApprovedUser] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (loading) return;
    if (!user) { navigate('/team/login', { replace: true }); return; }
    const check = async () => {
      const { data } = await supabase.from('team_members').select('id').eq('user_id', user.id).maybeSingle();
      if (!active) return;
      if (data) setApprovedUser(user.id);
      else navigate('/team/login', { replace: true });
    };
    void check().catch(() => { if (active) navigate('/team/login', { replace: true }); });
    return () => { active = false; };
  }, [user, loading, navigate]);
  if (loading || !user || approvedUser !== user.id) return <GlobalLoader message="Loading..." fullScreen={false} />;
  return <>{children}</>;
}
