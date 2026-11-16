'use client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/** Restartable delivery of optional work. The durable job lives in PostgreSQL,
 * so navigating away or losing the network cannot discard a saved template job. */
export function QuotationJobProcessor() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    let active=true, running=false, rerun=false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      if (!active) return;
      if (running) { rerun=true; return; }
      running=true;
      try {
        let rounds=0;
        do {
          rerun=false;
          const { data,error } = await supabase.rpc('process_quotation_jobs',{p_limit:5});
          if (error) throw error;
          const result=data as { ready?: number; failed?: number } | null;
          if (active && result?.failed) { clearTimeout(retry); retry=setTimeout(() => void run(),60_000); }
          if (result?.ready) rerun=true;
        } while (active && rerun && ++rounds<10);
        if (active && rerun) { clearTimeout(retry); retry=setTimeout(() => void run(),10_000); }
      } catch {
        if (active) { clearTimeout(retry); retry=setTimeout(() => void run(),60_000); }
      } finally { running=false; }
    };
    const changed = (event: Event) => {
      const detail=(event as CustomEvent).detail;
      if (detail?.ownerId===user.id && detail?.resource==='quotations' && detail?.jobsQueued) void run();
    };
    const online=()=>void run();
    window.addEventListener('intorza:account-data-changed',changed);
    window.addEventListener('online',online);
    void run();
    return () => { active=false; clearTimeout(retry); window.removeEventListener('intorza:account-data-changed',changed); window.removeEventListener('online',online); };
  }, [user?.id]);
  return null;
}
