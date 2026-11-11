"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from '@/lib/navigation';
import { isTeamAccount } from '@/lib/team-account';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLoader } from '@/components/GlobalLoader';

export function WorkspaceAccountGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <GlobalLoader message="Loading..." fullScreen={false} />;
  if (!user) return <>{children}</>;
  return <AccountCheck key={user.id} user={user}>{children}</AccountCheck>;
}

function AccountCheck({ user, children }: { user: { id: string; user_metadata?: Record<string, unknown> }; children: ReactNode }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    const check = async () => {
      const { data, error } = await supabase.from('team_members').select('id').eq('user_id', user.id).maybeSingle();
      if (!active) return;
      if (data || isTeamAccount(user)) {
        sessionStorage.removeItem('returnPath');
        sessionStorage.removeItem('pendingAction');
        navigate(data ? '/team/dashboard' : '/team/login', { replace: true });
      } else if (!error) {
        setAllowed(true);
      } else {
        setFailed(true);
      }
    };
    void check().catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [user, navigate, attempt]);
  if (failed) return <div className="p-6 text-center"><p>Unable to check your account. Please try again.</p><button type="button" className="mt-3 underline" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>;
  return allowed ? <>{children}</> : <GlobalLoader message="Loading..." fullScreen={false} />;
}
